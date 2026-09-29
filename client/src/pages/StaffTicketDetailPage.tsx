import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  StaffTicketDetail,
  EligibleOwner,
  PriorityType,
  TicketStatusType,
  fetchStaffTicketDetail,
  fetchEligibleOwners,
  claimTicket,
  assignTicketOwner,
  updateItPriority,
  updateTicketStatus,
  getAttachmentDownloadUrl,
} from "../api";
import { useAuth } from "../context/AuthContext";
import Badge from "../components/Badge";
import PublicCommentsSection from "../components/PublicCommentsSection";
import InternalNotesSection from "../components/InternalNotesSection";
import { formatBytes } from "../components/AttachmentPicker";

const VALID_STATUS_TRANSITIONS: Record<TicketStatusType, TicketStatusType[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

export default function StaffTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<StaffTicketDetail | null>(null);
  const [eligibleOwners, setEligibleOwners] = useState<EligibleOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Operations state
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | "">("");
  const [selectedItPriority, setSelectedItPriority] = useState<PriorityType | "">("");
  const [selectedStatus, setSelectedStatus] = useState<TicketStatusType | "">("");

  // Confirmation Modals state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TicketStatusType | null>(null);

  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [pendingOwnerId, setPendingOwnerId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadTicket = useCallback(
    (showSpinner = true) => {
      if (!id) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (showSpinner) {
        setLoading(true);
      }
      setError(null);
      setConflictError(null);
      setOperationError(null);

      fetchStaffTicketDetail(Number(id), controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setTicket(data);
            setSelectedOwnerId(data.ticketOwner ? data.ticketOwner.id : "");
            setSelectedItPriority(data.itPriority);
            setSelectedStatus(data.currentStatus);
          }
        })
        .catch((err: any) => {
          if (!controller.signal.aborted) {
            setError(err.message || "Unable to load ticket details");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    },
    [id]
  );

  useEffect(() => {
    loadTicket(true);
    fetchEligibleOwners()
      .then((owners) => setEligibleOwners(owners))
      .catch(() => {});

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadTicket]);

  // Claim Ticket
  const handleClaim = async () => {
    if (!ticket) return;
    try {
      setSubmitting(true);
      setOperationError(null);
      setConflictError(null);
      const updated = await claimTicket(ticket.id, ticket.version);
      setTicket(updated);
      setSelectedOwnerId(updated.ticketOwner ? updated.ticketOwner.id : "");
    } catch (err: any) {
      if (err.status === 409 || err.code === "VERSION_CONFLICT") {
        setConflictError("This ticket was modified by another user or is already claimed. Please refresh to load latest changes.");
      } else {
        setOperationError(err.message || "Failed to claim ticket");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Reassign Owner
  const handleConfirmReassign = async () => {
    if (!ticket || pendingOwnerId === null) return;
    try {
      setSubmitting(true);
      setOperationError(null);
      setConflictError(null);
      const updated = await assignTicketOwner(ticket.id, pendingOwnerId, ticket.version);
      setTicket(updated);
      setSelectedOwnerId(updated.ticketOwner ? updated.ticketOwner.id : "");
      setShowOwnerModal(false);
      setPendingOwnerId(null);
    } catch (err: any) {
      if (err.status === 409 || err.code === "VERSION_CONFLICT") {
        setConflictError("This ticket was modified by another user. Please refresh before reassigning.");
        setShowOwnerModal(false);
      } else {
        setOperationError(err.message || "Failed to reassign owner");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // IT Priority
  const handleItPriorityChange = async (newPrio: PriorityType) => {
    if (!ticket || newPrio === ticket.itPriority) return;
    try {
      setSubmitting(true);
      setOperationError(null);
      setConflictError(null);
      const updated = await updateItPriority(ticket.id, newPrio, ticket.version);
      setTicket(updated);
      setSelectedItPriority(updated.itPriority);
    } catch (err: any) {
      if (err.status === 409 || err.code === "VERSION_CONFLICT") {
        setConflictError("This ticket was modified by another user. Please refresh before updating priority.");
      } else {
        setOperationError(err.message || "Failed to update IT priority");
      }
      setSelectedItPriority(ticket.itPriority);
    } finally {
      setSubmitting(false);
    }
  };

  // Status Change Confirmation
  const handleConfirmStatusChange = async () => {
    if (!ticket || !pendingStatus) return;
    try {
      setSubmitting(true);
      setOperationError(null);
      setConflictError(null);
      const updated = await updateTicketStatus(ticket.id, pendingStatus, ticket.version);
      setTicket(updated);
      setSelectedStatus(updated.currentStatus);
      setShowStatusModal(false);
      setPendingStatus(null);
    } catch (err: any) {
      if (err.status === 409 || err.code === "VERSION_CONFLICT") {
        setConflictError("This ticket was modified by another user. Please refresh before updating status.");
        setShowStatusModal(false);
      } else {
        setOperationError(err.message || "Failed to update status");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="zen-container py-5 text-center" role="status">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading ticket details…</span>
        </div>
        <p className="text-muted mt-3 small">Loading staff ticket details…</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="zen-container py-5">
        <div className="alert alert-danger p-4 mb-4" role="alert">
          <h2 className="h5 fw-bold mb-2">Error Loading Ticket</h2>
          <p className="mb-3 small">{error || "Ticket not found or access denied."}</p>
          <button type="button" className="btn btn-zen-secondary btn-sm" onClick={() => navigate("/staff/tickets")}>
            &larr; Back to Staff Queue
          </button>
        </div>
      </div>
    );
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[ticket.currentStatus] || [];
  const activeAttachments = (ticket.attachments || []).filter((a) => !a.removedAt);

  return (
    <div className="zen-container py-4">
      {/* Back button and Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-4">
        <div>
          <button
            type="button"
            className="btn btn-zen-tertiary p-0 mb-2 small"
            onClick={() => navigate("/staff/tickets")}
          >
            &larr; Back to Staff Queue
          </button>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <h1 className="h3 font-monospace mb-0 fw-bold" style={{ color: "var(--color-primary)" }}>
              {ticket.ticketNumber}
            </h1>
            <Badge type="status" value={ticket.currentStatus} />
            <span className="badge bg-light text-dark border">Version {ticket.version}</span>
          </div>
        </div>

        <div className="text-muted small text-sm-end">
          <div>
            Created: <strong>{new Date(ticket.createdAt).toLocaleString()}</strong>
          </div>
          <div>
            Updated: <strong>{new Date(ticket.updatedAt).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* 409 Stale Data Conflict Banner */}
      {conflictError && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center p-3 mb-4" role="alert">
          <div>
            <strong className="d-block">⚠️ Concurrency Conflict (409)</strong>
            <span className="small">{conflictError}</span>
          </div>
          <button
            type="button"
            className="btn btn-warning btn-sm text-dark fw-semibold ms-3"
            onClick={() => loadTicket(true)}
            data-testid="refresh-conflict-btn"
          >
            🔄 Refresh Ticket
          </button>
        </div>
      )}

      {/* General Operation Error */}
      {operationError && (
        <div className="alert alert-danger py-2 mb-4" role="alert">
          {operationError}
        </div>
      )}

      {/* Problem Appears Resolved Notice */}
      {ticket.appearsResolvedAt && (
        <div className="alert alert-info d-flex align-items-center p-3 mb-4" role="status">
          <span className="fs-4 me-2">ℹ️</span>
          <div>
            <strong>Requester Indication:</strong> The requester reported that this problem appeared resolved on{" "}
            <strong>{new Date(ticket.appearsResolvedAt).toLocaleString()}</strong>.
            <div className="small text-muted">
              Verify system health and resolve ticket if confirmed.
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Left Column: Ticket Details, Attachments, Comments, Notes */}
        <div className="col-12 col-lg-8">
          <div className="card p-4 mb-4 shadow-sm" style={{ backgroundColor: "var(--color-surface)" }}>
            <h2 className="h5 fw-bold mb-3" style={{ color: "var(--color-text)" }}>
              {ticket.summary}
            </h2>

            <div className="text-muted small fw-bold text-uppercase mb-2">Description</div>
            <div
              className="p-3 rounded border mb-4 text-break"
              style={{
                backgroundColor: "var(--color-readonly-bg)",
                whiteSpace: "pre-wrap",
                minHeight: "100px",
              }}
            >
              {ticket.description}
            </div>

            {/* Requester Profile Snapshot */}
            <div className="p-3 rounded border bg-light">
              <div className="fw-bold small text-uppercase text-muted mb-2">Requester Information</div>
              <div className="d-flex flex-wrap gap-4 small">
                <div>
                  <span className="text-muted">Name: </span>
                  <strong>{ticket.requester.name}</strong>
                </div>
                <div>
                  <span className="text-muted">Email: </span>
                  <strong>{ticket.requester.email}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments (Read-only download list for Staff) */}
          <div className="card p-4 mb-4 shadow-sm" style={{ backgroundColor: "var(--color-surface)" }}>
            <h3 className="h6 fw-bold mb-3" style={{ color: "var(--color-primary)" }}>
              Attachments ({activeAttachments.length})
            </h3>
            {activeAttachments.length === 0 ? (
              <p className="text-muted small fst-italic mb-0">No attachments provided.</p>
            ) : (
              <ul className="list-group list-group-flush border rounded">
                {activeAttachments.map((a) => (
                  <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center p-3">
                    <div>
                      <div className="fw-semibold small">{a.originalName}</div>
                      <div className="text-muted small">
                        {formatBytes(a.sizeBytes)} • Uploaded {new Date(a.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <a
                      href={getAttachmentDownloadUrl(a.id)}
                      className="btn btn-outline-primary btn-sm px-3"
                      download
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Public Comments Section */}
          <PublicCommentsSection ticketId={ticket.id} canComment={true} />

          {/* Internal Notes Section (Staff and Admin only) */}
          <InternalNotesSection ticketId={ticket.id} canCreateNote={true} />
        </div>

        {/* Right Column: IT Staff Operations Panel */}
        <div className="col-12 col-lg-4">
          <div
            className="card p-4 shadow-sm border-primary"
            style={{ backgroundColor: "var(--color-surface)", borderTop: "4px solid var(--color-primary)" }}
          >
            <h2 className="h6 fw-bold text-uppercase mb-3 pb-2 border-bottom" style={{ color: "var(--color-primary)" }}>
              IT Operations Panel
            </h2>

            {/* Ownership Control */}
            <div className="mb-4">
              <label className="form-label small fw-bold text-muted text-uppercase mb-1">
                Owner Assignment
              </label>
              {ticket.ticketOwner ? (
                <div>
                  <div className="d-flex align-items-center justify-content-between p-2 rounded border bg-light mb-2">
                    <span className="fw-semibold small">👤 {ticket.ticketOwner.name}</span>
                    <Badge type="role" value="IT_STAFF" />
                  </div>
                  <label htmlFor="reassign-select" className="form-label small text-muted">
                    Reassign to another staff:
                  </label>
                  <div className="d-flex gap-2">
                    <select
                      id="reassign-select"
                      className="form-select form-select-sm"
                      value={selectedOwnerId}
                      onChange={(e) => setSelectedOwnerId(Number(e.target.value))}
                      disabled={submitting}
                    >
                      {eligibleOwners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.role === "ADMINISTRATOR" ? "Admin" : "Staff"})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-zen-secondary btn-sm text-nowrap"
                      disabled={submitting || Number(selectedOwnerId) === ticket.ticketOwner.id}
                      onClick={() => {
                        setPendingOwnerId(Number(selectedOwnerId));
                        setShowOwnerModal(true);
                      }}
                      data-testid="reassign-owner-btn"
                    >
                      Reassign
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="alert alert-warning py-2 small mb-2">
                    ⚠️ Currently unassigned
                  </div>
                  <button
                    type="button"
                    className="btn btn-zen-primary btn-sm w-100 fw-bold"
                    onClick={handleClaim}
                    disabled={submitting}
                    data-testid="claim-ticket-btn"
                  >
                    {submitting ? "Claiming..." : "🖐️ Claim This Ticket"}
                  </button>
                </div>
              )}
            </div>

            {/* IT Priority vs Requested Priority */}
            <div className="mb-4">
              <div className="mb-2">
                <span className="small text-muted d-block">Requested Priority (Read-only):</span>
                <Badge type="priority" value={ticket.requestedPriority} />
              </div>

              <div>
                <label htmlFor="it-priority-select" className="form-label small fw-bold text-muted text-uppercase mb-1">
                  IT Operational Priority
                </label>
                <select
                  id="it-priority-select"
                  className="form-select form-select-sm"
                  value={selectedItPriority}
                  onChange={(e) => handleItPriorityChange(e.target.value as PriorityType)}
                  disabled={submitting}
                  data-testid="it-priority-select"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>

            {/* Status Transition Control */}
            <div className="mb-4">
              <label htmlFor="status-transition-select" className="form-label small fw-bold text-muted text-uppercase mb-1">
                Change Status
              </label>
              <div className="mb-2 small">
                Current: <Badge type="status" value={ticket.currentStatus} />
              </div>

              {validTransitions.length > 0 ? (
                <div className="d-flex gap-2">
                  <select
                    id="status-transition-select"
                    className="form-select form-select-sm"
                    value={pendingStatus || ""}
                    onChange={(e) => setPendingStatus(e.target.value as TicketStatusType)}
                    disabled={submitting}
                    data-testid="status-transition-select"
                  >
                    <option value="">Select next status...</option>
                    {validTransitions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-zen-primary btn-sm text-nowrap"
                    disabled={submitting || !pendingStatus}
                    onClick={() => setShowStatusModal(true)}
                    data-testid="submit-status-btn"
                  >
                    Update
                  </button>
                </div>
              ) : (
                <div className="small text-muted fst-italic">
                  No further transitions allowed from {ticket.currentStatus}.
                </div>
              )}
            </div>

            {/* Category & System Metadata */}
            <div className="pt-3 border-top">
              <div className="mb-2 small">
                <span className="text-muted">Category: </span>
                <strong>{ticket.category.name}</strong>
              </div>
              <div className="small">
                <span className="text-muted">System: </span>
                <strong>{ticket.relatedSystem.name}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reassign Owner Confirmation Modal */}
      {showOwnerModal && pendingOwnerId !== null && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Ticket Reassignment</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowOwnerModal(false)}
                  disabled={submitting}
                />
              </div>
              <div className="modal-body">
                <p>Are you sure you want to reassign this ticket?</p>
                <div className="p-3 rounded bg-light border small mb-3">
                  <div>
                    Current Owner: <strong>{ticket.ticketOwner ? ticket.ticketOwner.name : "Unassigned"}</strong>
                  </div>
                  <div>
                    New Owner:{" "}
                    <strong>{eligibleOwners.find((o) => o.id === pendingOwnerId)?.name || "Selected Owner"}</strong>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowOwnerModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-zen-primary btn-sm"
                  onClick={handleConfirmReassign}
                  disabled={submitting}
                  data-testid="confirm-reassign-btn"
                >
                  {submitting ? "Reassigning..." : "Confirm Reassignment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showOwnerModal && <div className="modal-backdrop show" />}

      {/* Status Change Confirmation Modal */}
      {showStatusModal && pendingStatus && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Status Transition</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowStatusModal(false)}
                  disabled={submitting}
                />
              </div>
              <div className="modal-body">
                {operationError && (
                  <div className="alert alert-danger py-2 mb-3">{operationError}</div>
                )}
                <p>Are you sure you want to transition this ticket?</p>
                <div className="d-flex align-items-center justify-content-center gap-3 p-3 rounded bg-light border mb-3">
                  <Badge type="status" value={ticket.currentStatus} />
                  <span className="fs-5">➔</span>
                  <Badge type="status" value={pendingStatus} />
                </div>
                {pendingStatus === "REOPENED" && ticket.appearsResolvedAt && (
                  <div className="alert alert-warning small py-2 mb-0">
                    ⚠️ Reopening this ticket will clear the requester's previous resolution indication.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowStatusModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-zen-primary btn-sm"
                  onClick={handleConfirmStatusChange}
                  disabled={submitting}
                  data-testid="confirm-status-btn"
                >
                  {submitting ? "Updating..." : "Confirm Transition"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showStatusModal && <div className="modal-backdrop show" />}
    </div>
  );
}
