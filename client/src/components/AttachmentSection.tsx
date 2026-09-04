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
  const removedAttachments = attachments.filter((a) => !!a.removedAt);
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
    <div className="attachment-section card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center bg-light">
        <h5 className="card-title mb-0 fs-6 fw-bold">
          Attachments ({activeAttachments.length}/5 active)
        </h5>
      </div>

      <div className="card-body">
        {uploadError && (
          <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
            {uploadError}
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
                    isRemoved ? "bg-light text-muted opacity-75" : ""
                  }`}
                  data-testid={`attachment-item-${att.id}`}
                >
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="d-flex align-items-start gap-2 text-truncate">
                      <span
                        className={`badge mt-1 ${isRemoved ? "bg-secondary" : "bg-primary"}`}
                      >
                        {att.originalName.split(".").pop()?.toUpperCase() || "FILE"}
                      </span>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <span
                            className={`fw-medium ${
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

                        <div className="text-muted small mt-1">
                          Uploaded: {new Date(att.uploadedAt).toLocaleString()}
                        </div>

                        {isRemoved && (
                          <div className="alert alert-warning py-1 px-2 small mt-2 mb-0">
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
                      <div className="d-flex gap-2 flex-shrink-0">
                        <a
                          href={getAttachmentDownloadUrl(att.id, requesterId)}
                          className="btn btn-outline-primary btn-sm"
                          download={att.originalName}
                          aria-label={`Download ${att.originalName}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleOpenRemoveModal(att)}
                          aria-label={`Remove ${att.originalName}`}
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
            <h6 className="fw-semibold small mb-2">Add New Attachment</h6>
            {canUploadMore ? (
              <div className="d-flex align-items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control form-control-sm"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  aria-label="Select file to upload"
                />
                {uploading && (
                  <span className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Uploading...</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="alert alert-info py-2 px-3 small mb-0">
                This ticket has reached the maximum quota of 5 active attachments. Remove an
                existing attachment to upload another.
              </div>
            )}
            <small className="text-muted d-block mt-1">
              Max 5 MB per file. Allowed formats: JPG, JPEG, PNG, WEBP, PDF.
            </small>
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
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
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
                <div className="modal-body">
                  <p className="small mb-3">
                    Are you sure you want to remove{" "}
                    <strong>{removingAttachment.originalName}</strong>? This attachment will be
                    hidden and blocked from future downloads, but will remain on record.
                  </p>

                  {removalError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                      {removalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="removal-reason-input" className="form-label small fw-bold">
                      Reason for removal <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="removal-reason-input"
                      className="form-control form-control-sm"
                      rows={3}
                      value={removalReason}
                      onChange={(e) => setRemovalReason(e.target.value)}
                      placeholder="e.g. Contains outdated data or uploaded by mistake..."
                      maxLength={500}
                      required
                      disabled={isSubmittingRemoval}
                    />
                    <div className="d-flex justify-content-between small text-muted mt-1">
                      <span>A removal reason is required.</span>
                      <span>{removalReason.trim().length}/500</span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCloseRemoveModal}
                    disabled={isSubmittingRemoval}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger btn-sm"
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
