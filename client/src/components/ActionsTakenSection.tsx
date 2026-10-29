import React, { useEffect, useState, useCallback } from "react";
import {
  ActionTakenItem,
  TicketStatusType,
  fetchTicketActions,
  createTicketAction,
  updateTicketAction,
} from "../api";
import { useAuth } from "../context/AuthContext";
import Badge from "./Badge";

interface ActionsTakenSectionProps {
  ticketId: number;
  ticketStatus: TicketStatusType;
  initialActions?: ActionTakenItem[];
  onActionsChanged?: (actions: ActionTakenItem[]) => void;
}

function toLocalDatetimeInputValue(isoString?: string): string {
  const date = isoString ? new Date(isoString) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function ActionsTakenSection({
  ticketId,
  ticketStatus,
  initialActions,
  onActionsChanged,
}: ActionsTakenSectionProps) {
  const { user } = useAuth();
  const [actions, setActions] = useState<ActionTakenItem[]>(initialActions ?? []);
  const [loading, setLoading] = useState<boolean>(!initialActions);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<ActionTakenItem | null>(null);
  const [actionDateTime, setActionDateTime] = useState<string>(() => toLocalDatetimeInputValue());
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const isStaffOrAdmin = user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";
  const isTicketLocked = ["RESOLVED", "CLOSED", "CANCELLED"].includes(ticketStatus);

  const loadActions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const fetched = await fetchTicketActions(ticketId);
      setActions(fetched);
      onActionsChanged?.(fetched);
    } catch (err: any) {
      setLoadError(err?.message || "Unable to load actions taken");
    } finally {
      setLoading(false);
    }
  }, [ticketId, onActionsChanged]);

  useEffect(() => {
    if (initialActions) {
      setActions(initialActions);
      setLoading(false);
      onActionsChanged?.(initialActions);
      return;
    }
    loadActions();
  }, [ticketId, initialActions, loadActions, onActionsChanged]);

  const openCreateForm = () => {
    setEditingAction(null);
    setActionDateTime(toLocalDatetimeInputValue());
    setDescription("");
    setResult("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setAttachmentNotes("");
    setFormError(null);
    setConflictError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (action: ActionTakenItem) => {
    setEditingAction(action);
    setActionDateTime(toLocalDatetimeInputValue(action.actionDateTime));
    setDescription(action.description);
    setResult(action.result);
    setFollowUpRequired(action.followUpRequired);
    setFollowUpNote(action.followUpNote || "");
    setAttachmentNotes(action.attachmentNotes || "");
    setFormError(null);
    setConflictError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAction(null);
    setFormError(null);
    setConflictError(null);
  };

  const handleFollowUpToggle = (checked: boolean) => {
    setFollowUpRequired(checked);
    if (!checked) {
      setFollowUpNote("");
    }
  };

  const handleReloadConflict = async () => {
    try {
      const latest = await fetchTicketActions(ticketId);
      setActions(latest);
      onActionsChanged?.(latest);
      if (editingAction) {
        const updatedTarget = latest.find((a) => a.id === editingAction.id);
        if (updatedTarget) {
          setEditingAction(updatedTarget);
        }
      }
      setConflictError(null);
    } catch (err: any) {
      setFormError(err?.message || "Failed to reload latest actions");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setConflictError(null);

    const trimmedDesc = description.trim();
    const trimmedResult = result.trim();
    const trimmedFollowUp = followUpNote.trim();
    const trimmedAttachment = attachmentNotes.trim();

    if (trimmedDesc.length < 3 || trimmedDesc.length > 2000) {
      setFormError("Action description must be between 3 and 2000 characters.");
      return;
    }
    if (trimmedResult.length < 3 || trimmedResult.length > 2000) {
      setFormError("Action result must be between 3 and 2000 characters.");
      return;
    }
    if (followUpRequired && (trimmedFollowUp.length < 3 || trimmedFollowUp.length > 2000)) {
      setFormError("Follow-up note is required when follow-up is enabled (3–2000 characters).");
      return;
    }
    if (trimmedAttachment.length > 500) {
      setFormError("Attachment notes cannot exceed 500 characters.");
      return;
    }

    const parsedDate = actionDateTime ? new Date(actionDateTime) : new Date();
    const isoDateTime = Number.isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

    setSubmitting(true);
    try {
      if (editingAction) {
        await updateTicketAction(editingAction.id, {
          actionDateTime: isoDateTime,
          description: trimmedDesc,
          result: trimmedResult,
          followUpRequired,
          followUpNote: followUpRequired ? trimmedFollowUp : null,
          attachmentNotes: trimmedAttachment ? trimmedAttachment : null,
          expectedVersion: editingAction.version,
        });
      } else {
        await createTicketAction(ticketId, {
          actionDateTime: isoDateTime,
          description: trimmedDesc,
          result: trimmedResult,
          followUpRequired,
          followUpNote: followUpRequired ? trimmedFollowUp : null,
          attachmentNotes: trimmedAttachment ? trimmedAttachment : null,
        });
      }

      const refreshed = await fetchTicketActions(ticketId);
      setActions(refreshed);
      onActionsChanged?.(refreshed);
      closeForm();
    } catch (err: any) {
      if (err?.status === 409 || err?.code === "VERSION_CONFLICT") {
        setConflictError(
          err.message ||
            "This action was modified by another user. Reload the latest version before saving."
        );
      } else {
        setFormError(err?.message || "Failed to save action taken.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canEditEntry = (action: ActionTakenItem): boolean => {
    if (!user || !isStaffOrAdmin || isTicketLocked) return false;
    return user.role === "ADMINISTRATOR" || user.id === action.performedBy.id;
  };

  return (
    <div className="card card-zen border-0 p-4 mb-4" data-testid="actions-taken-section">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
        <div className="d-flex align-items-center gap-2">
          <h5 className="fw-bold mb-0">Actions Taken</h5>
          <span className="badge rounded-pill badge-zen status-open" data-testid="actions-count-badge">
            {actions.length}
          </span>
        </div>

        {isStaffOrAdmin && !isTicketLocked && !isFormOpen && (
          <button
            type="button"
            className="btn btn-primary btn-sm px-3 fw-medium"
            data-testid="record-action-btn"
            onClick={openCreateForm}
          >
            + Record Action Taken
          </button>
        )}
      </div>

      {isStaffOrAdmin && isTicketLocked && (
        <div
          className="alert alert-secondary py-2 px-3 small mb-3 border-0"
          data-testid="actions-locked-notice"
        >
          Action Taken entries are locked because this ticket is currently{" "}
          <strong>{ticketStatus}</strong>.
        </div>
      )}

      {loadError && (
        <div className="alert alert-danger py-2 small mb-3" role="alert">
          {loadError}
        </div>
      )}

      {/* Create / Edit Form for IT Staff & Administrator */}
      {isStaffOrAdmin && !isTicketLocked && isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="p-3 mb-4 rounded-3 border bg-light"
          data-testid="action-taken-form"
          noValidate
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0">
              {editingAction ? `Edit Action Taken #${editingAction.id}` : "Record New Action Taken"}
            </h6>
            <span className="text-muted small">
              {editingAction ? `Version v${editingAction.version}` : "New Entry"}
            </span>
          </div>

          {conflictError && (
            <div
              className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2 py-2"
              role="alert"
              data-testid="action-conflict-banner"
            >
              <span className="small fw-medium">{conflictError}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark fw-semibold"
                data-testid="reload-actions-btn"
                onClick={handleReloadConflict}
              >
                Reload Latest Actions
              </button>
            </div>
          )}

          {formError && (
            <div
              className="alert alert-danger py-2 small"
              role="alert"
              data-testid="action-form-error"
            >
              {formError}
            </div>
          )}

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="action-performer-input" className="form-label small fw-semibold">
                Performed By (Auto-Recorded)
              </label>
              <input
                id="action-performer-input"
                type="text"
                className="form-control form-control-sm bg-readonly"
                value={editingAction ? editingAction.performedBy.name : user?.name || ""}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="action-datetime-input" className="form-label small fw-semibold">
                Action Date &amp; Time <span className="text-danger">*</span>
              </label>
              <input
                id="action-datetime-input"
                type="datetime-local"
                className="form-control form-control-sm"
                value={actionDateTime}
                onChange={(e) => setActionDateTime(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="action-description-input" className="form-label small fw-semibold">
              Action Description <span className="text-danger">*</span>
            </label>
            <textarea
              id="action-description-input"
              className="form-control"
              rows={2}
              placeholder="Describe the troubleshooting or diagnostic work performed (3–2000 chars)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="action-result-input" className="form-label small fw-semibold">
              Result / Outcome <span className="text-danger">*</span>
            </label>
            <textarea
              id="action-result-input"
              className="form-control"
              rows={2}
              placeholder="Record the outcome of the action (3–2000 chars)..."
              value={result}
              onChange={(e) => setResult(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="mb-3">
            <div className="form-check form-switch mb-2">
              <input
                id="action-followup-toggle"
                type="checkbox"
                className="form-check-input"
                checked={followUpRequired}
                onChange={(e) => handleFollowUpToggle(e.target.checked)}
                disabled={submitting}
              />
              <label htmlFor="action-followup-toggle" className="form-check-label small fw-semibold">
                Follow-Up Required?
              </label>
            </div>

            <label htmlFor="action-followup-note-input" className="form-label small fw-semibold">
              Follow-Up Note {followUpRequired && <span className="text-danger">*</span>}
            </label>
            <textarea
              id="action-followup-note-input"
              className={`form-control form-control-sm ${!followUpRequired ? "bg-readonly" : ""}`}
              rows={2}
              placeholder={
                followUpRequired
                  ? "Describe required follow-up steps or verification needed..."
                  : "Enable 'Follow-Up Required' to enter a follow-up note"
              }
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              disabled={!followUpRequired || submitting}
              required={followUpRequired}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="action-attachment-notes-input" className="form-label small fw-semibold">
              Attachment / Reference Notes (Optional)
            </label>
            <input
              id="action-attachment-notes-input"
              type="text"
              className="form-control form-control-sm"
              placeholder="e.g., Refer to diagnostic log attachment #1 (max 500 chars)"
              value={attachmentNotes}
              onChange={(e) => setAttachmentNotes(e.target.value)}
              disabled={submitting}
              maxLength={500}
            />
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              onClick={closeForm}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm px-4 fw-medium"
              data-testid="save-action-btn"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : editingAction
                ? "Update Action Taken"
                : "Save Action Taken"}
            </button>
          </div>
        </form>
      )}

      {/* Chronological List of Actions Taken */}
      {loading ? (
        <p className="text-muted small mb-0" data-testid="actions-loading">
          Loading actions taken...
        </p>
      ) : actions.length === 0 ? (
        <p className="text-muted small fst-italic mb-0" data-testid="actions-empty-state">
          No actions taken have been recorded for this ticket yet.
        </p>
      ) : (
        <div className="d-flex flex-column gap-3" data-testid="actions-list">
          {actions.map((action) => (
            <div
              key={action.id}
              className="p-3 rounded-3 border bg-white"
              data-testid="action-item"
            >
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span className="fw-semibold small">{action.performedBy.name}</span>
                  <Badge type="role" value={action.performedBy.role} />
                  <span className="text-muted small">
                    {new Date(action.actionDateTime).toLocaleString()}
                  </span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  {action.followUpRequired ? (
                    <span
                      className="badge rounded-pill badge-zen status-in-progress"
                      data-testid="followup-required-badge"
                    >
                      ⏳ Follow-Up Required
                    </span>
                  ) : (
                    <span
                      className="badge rounded-pill badge-zen status-closed"
                      data-testid="no-followup-badge"
                    >
                      ✓ No Follow-Up
                    </span>
                  )}

                  {canEditEntry(action) && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-0 px-2"
                      data-testid={`edit-action-btn-${action.id}`}
                      aria-label={`Edit action #${action.id}`}
                      onClick={() => openEditForm(action)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="row g-2 mt-1">
                <div className="col-md-6">
                  <div className="text-muted small fw-semibold">Action Description</div>
                  <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                    {action.description}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small fw-semibold">Result / Outcome</div>
                  <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                    {action.result}
                  </div>
                </div>
              </div>

              {action.followUpRequired && action.followUpNote && (
                <div
                  className="mt-2 p-2 rounded-2 small"
                  style={{ backgroundColor: "#FFF4E5", color: "#8C4A00" }}
                  data-testid="action-followup-note"
                >
                  <strong>Follow-Up Note:</strong> {action.followUpNote}
                </div>
              )}

              {action.attachmentNotes && (
                <div className="mt-2 text-muted small" data-testid="action-attachment-note">
                  <strong>Attachment Reference:</strong> {action.attachmentNotes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
