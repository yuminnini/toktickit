import React, { useState, useRef } from "react";
import {
  AttachmentItem,
  uploadAttachment,
  removeAttachment,
  getAttachmentDownloadUrl,
} from "../api";
import { formatBytes, isValidFile } from "./AttachmentPicker";

export interface AttachmentSectionProps {
  ticketId: number;
  requesterId: number;
  attachments: AttachmentItem[];
  onAttachmentChanged: () => void;
  readOnly?: boolean;
}

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  ticketId,
  requesterId,
  attachments,
  onAttachmentChanged,
  readOnly = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Soft-remove modal state
  const [removingAttachment, setRemovingAttachment] = useState<AttachmentItem | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAttachments = attachments.filter((a) => !a.removedAt);
  const canUploadMore = activeAttachments.length < 5;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const validation = isValidFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file selected.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!canUploadMore) {
      setUploadError("This ticket already has the maximum of 5 active attachments.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setUploading(true);
      await uploadAttachment(ticketId, requesterId, file);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onAttachmentChanged();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenRemoveModal = (att: AttachmentItem) => {
    setRemovingAttachment(att);
    setRemovalReason("");
    setRemovalError(null);
  };

  const handleCloseRemoveModal = () => {
    if (isSubmittingRemoval) return;
    setRemovingAttachment(null);
    setRemovalReason("");
    setRemovalError(null);
  };

  const handleSubmitRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingAttachment) return;

    const trimmed = removalReason.trim();
    if (trimmed.length < 1) {
      setRemovalError("Please provide a reason for removing this attachment.");
      return;
    }
    if (trimmed.length > 500) {
      setRemovalError("Reason cannot exceed 500 characters.");
      return;
    }

    try {
      setIsSubmittingRemoval(true);
      setRemovalError(null);
      await removeAttachment(removingAttachment.id, requesterId, trimmed);
      setRemovingAttachment(null);
      onAttachmentChanged();
    } catch (err: any) {
      setRemovalError(err.message || "Failed to remove attachment");
    } finally {
      setIsSubmittingRemoval(false);
    }
  };

  return (
    <div className="attachment-section zen-card mb-4 p-4">
      <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
        <h3 className="h6 mb-0 fw-bold" style={{ color: "var(--color-primary)" }}>
          Attachments ({activeAttachments.length}/5 active)
        </h3>
      </div>

      <div>
        {uploadError && (
          <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
            ⚠️ {uploadError}
          </div>
        )}

        {attachments.length === 0 ? (
          <p className="text-muted small mb-3">No attachments uploaded for this ticket.</p>
        ) : (
          <ul className="list-group list-group-flush mb-3" aria-label="Ticket attachments">
            {attachments.map((att) => {
              const isRemoved = !!att.removedAt;
              return (
                <li
                  key={att.id}
                  className={`list-group-item px-0 py-3 border-bottom ${
                    isRemoved ? "text-muted opacity-75" : ""
                  }`}
                  data-testid={`attachment-item-${att.id}`}
                >
                  <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                    <div className="d-flex align-items-start gap-2 text-truncate">
                      <span
                        className={`badge mt-1 ${isRemoved ? "bg-secondary" : "bg-success"}`}
                        style={{ backgroundColor: isRemoved ? undefined : "var(--color-primary)" }}
                      >
                        {att.originalName.split(".").pop()?.toUpperCase() || "FILE"}
                      </span>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span
                            className={`fw-medium text-truncate-filename ${
                              isRemoved ? "text-decoration-line-through" : ""
                            }`}
                            title={att.originalName}
                          >
                            {att.originalName}
                          </span>
                          <span className="text-muted small">
                            ({formatBytes(att.sizeBytes)})
                          </span>
                          {isRemoved && (
                            <span className="badge bg-danger text-white">Removed</span>
                          )}
                        </div>

                        <div className="text-muted small mt-1" style={{ fontSize: "12px" }}>
                          Uploaded: {new Date(att.uploadedAt).toLocaleString()}
                        </div>

                        {isRemoved && (
                          <div
                            className="alert small py-1 px-2 mt-2 mb-0"
                            style={{
                              backgroundColor: "var(--badge-prio-med-bg)",
                              borderColor: "var(--badge-prio-med-border)",
                              color: "var(--badge-prio-med-text)",
                            }}
                          >
                            <strong>Removal Reason:</strong> {att.removalReason}
                            {att.removedAt && (
                              <span className="text-muted ms-2">
                                ({new Date(att.removedAt).toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {!readOnly && !isRemoved && (
                      <div className="d-flex gap-2 flex-shrink-0 align-items-center">
                        <a
                          href={getAttachmentDownloadUrl(att.id, requesterId)}
                          className="btn-zen-secondary btn-sm"
                          download={att.originalName}
                          aria-label={`Download ${att.originalName}`}
                          title={`Download ${att.originalName}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          className="btn-zen-destructive btn-sm"
                          onClick={() => handleOpenRemoveModal(att)}
                          aria-label={`Remove ${att.originalName}`}
                          title={`Remove ${att.originalName}`}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Upload form for ticket detail */}
        {!readOnly && (
          <div className="mt-3 pt-3 border-top">
            <h4 className="h6 fw-semibold mb-2" style={{ fontSize: "14px" }}>
              Add New Attachment
            </h4>
            {canUploadMore ? (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control form-control-zen"
                  style={{ maxWidth: "340px" }}
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  aria-label="Select file to upload"
                />
                {uploading && (
                  <div className="d-flex align-items-center gap-1 text-success small" role="status">
                    <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                    <span>Uploading…</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="alert small py-2 px-3 mb-0"
                style={{
                  backgroundColor: "var(--color-pale-green)",
                  borderColor: "var(--badge-prio-low-border)",
                  color: "var(--color-primary)",
                }}
              >
                This ticket has reached the maximum quota of 5 active attachments. Remove an
                existing attachment to upload another.
              </div>
            )}
            <div className="text-muted small mt-1" style={{ fontSize: "12px" }}>
              Max 5 MB per file. Allowed formats: JPG, JPEG, PNG, WEBP, PDF.
            </div>
          </div>
        )}
      </div>

      {/* Soft-remove modal */}
      {removingAttachment && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content zen-card p-0">
              <div className="modal-header border-bottom px-4 py-3">
                <h5 className="modal-title fs-6 fw-bold">Remove Attachment</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={handleCloseRemoveModal}
                  disabled={isSubmittingRemoval}
                />
              </div>
              <form onSubmit={handleSubmitRemoval}>
                <div className="modal-body px-4 py-3">
                  <p className="small mb-3">
                    Are you sure you want to remove{" "}
                    <strong>{removingAttachment.originalName}</strong>? This attachment will be
                    hidden and blocked from future downloads, but will remain on record.
                  </p>

                  {removalError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                      ⚠️ {removalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="removal-reason-input" className="form-label small fw-semibold">
                      Reason for removal <span className="required-marker">*</span>
                    </label>
                    <textarea
                      id="removal-reason-input"
                      className="form-control form-control-zen"
                      rows={3}
                      value={removalReason}
                      onChange={(e) => setRemovalReason(e.target.value)}
                      placeholder="e.g. Contains outdated data or uploaded by mistake..."
                      maxLength={500}
                      required
                      disabled={isSubmittingRemoval}
                    />
                    <div className="d-flex justify-content-between small text-muted mt-1" style={{ fontSize: "12px" }}>
                      <span>A removal reason is required.</span>
                      <span>{removalReason.trim().length}/500</span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top px-4 py-3 gap-2">
                  <button
                    type="button"
                    className="btn-zen-secondary btn-sm"
                    onClick={handleCloseRemoveModal}
                    disabled={isSubmittingRemoval}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-zen-destructive btn-sm"
                    disabled={isSubmittingRemoval || removalReason.trim().length === 0}
                  >
                    {isSubmittingRemoval ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          role="status"
                          aria-hidden="true"
                        />
                        Removing...
                      </>
                    ) : (
                      "Confirm Removal"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
