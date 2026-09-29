import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { fetchTicketDetail, TicketDetail as TicketDetailType, indicateAppearsResolved } from "../api";
import Badge from "../components/Badge";
import { AttachmentSection } from "../components/AttachmentSection";
import PublicCommentsSection from "../components/PublicCommentsSection";

const ALLOWED_APPEARS_RESOLVED_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
];

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Appears resolved state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequesterIdRef = useRef<number | undefined>(requester?.id);
  currentRequesterIdRef.current = requester?.id;

  const handleConfirmResolve = async () => {
    if (!ticket) return;
    try {
      setResolving(true);
      setResolveError(null);
      const res = await indicateAppearsResolved(ticket.id);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              appearsResolvedAt: res.appearsResolvedAt,
              version: res.version,
            }
          : prev
      );
      setShowResolveModal(false);
    } catch (err: any) {
      setResolveError(err.message || "Failed to record resolution indication");
    } finally {
      setResolving(false);
    }
  };

  const loadTicket = useCallback(
    (showSpinner = true) => {
      const currentReqId = requester?.id;
      if (!id || !currentReqId) return;

      // Abort any existing in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (showSpinner) {
        setLoading(true);
      }
      setError(null);
      setIsNotFound(false);

      fetchTicketDetail(Number(id), currentReqId, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted && currentRequesterIdRef.current === currentReqId) {
            setTicket(data);
          }
        })
        .catch((err: Error & { status?: number }) => {
          if (!controller.signal.aborted && currentRequesterIdRef.current === currentReqId) {
            if (err.status === 404) {
              setIsNotFound(true);
            } else {
              setError(err.message || "Unable to load ticket details");
            }
          }
        })
        .finally(() => {
          if (!controller.signal.aborted && currentRequesterIdRef.current === currentReqId) {
            setLoading(false);
          }
        });
    },
    [id, requester?.id]
  );

  useEffect(() => {
    loadTicket(true);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadTicket]);

  if (loading) {
    return (
      <div className="zen-container py-5 text-center" role="status">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading ticket…</span>
        </div>
        <p className="text-muted mt-2 small">Loading ticket details…</p>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="zen-container py-5">
        <div className="zen-card text-center py-5 not-found-state">
          <div className="mb-3 text-muted" style={{ fontSize: "2.5rem" }}>
            🔒
          </div>
          <h2 className="h4 mb-2">Ticket Not Found</h2>
          <p className="text-muted mb-4 small" style={{ maxWidth: "450px", margin: "0 auto" }}>
            The ticket you requested does not exist, or you do not have permission to view it.
          </p>
          <button
            type="button"
            className="btn-zen-primary"
            onClick={() => navigate("/my-tickets")}
          >
            &larr; Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="zen-container py-5">
        <div className="alert alert-danger mb-4" role="alert">
          {error || "An unexpected error occurred."}
        </div>
        <button
          type="button"
          className="btn-zen-secondary"
          onClick={() => navigate("/my-tickets")}
        >
          &larr; Back to My Tickets
        </button>
      </div>
    );
  }

  const canIndicateResolved =
    !ticket.appearsResolvedAt &&
    ALLOWED_APPEARS_RESOLVED_STATUSES.includes(ticket.currentStatus);

  return (
    <div className="zen-container py-4">
      {/* Header and Back Link */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-4">
        <div>
          <button
            type="button"
            className="btn-zen-tertiary p-0 mb-2 small"
            onClick={() => navigate("/my-tickets")}
            aria-label="Back to My Tickets"
          >
            &larr; Back to My Tickets
          </button>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <h1 className="h3 font-monospace mb-0 ticket-number" style={{ color: "var(--color-primary)" }}>
              {ticket.ticketNumber}
            </h1>
            <Badge type="status" value={ticket.currentStatus} />
          </div>
        </div>

        <div className="d-flex flex-column align-items-sm-end gap-2">
          <div className="text-muted small">
            Created on{" "}
            <span className="fw-semibold">
              {new Date(ticket.createdAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {canIndicateResolved && (
            <button
              type="button"
              className="btn btn-outline-success btn-sm"
              onClick={() => setShowResolveModal(true)}
              data-testid="problem-appears-resolved-btn"
            >
              ✓ Problem Appears Resolved
            </button>
          )}
        </div>
      </div>

      {/* Appears resolved notice banner */}
      {ticket.appearsResolvedAt && (
        <div className="alert alert-success d-flex align-items-center mb-4" role="status">
          <span className="fs-5 me-2" aria-hidden="true">✓</span>
          <div>
            <strong>You indicated this problem appeared resolved</strong> on{" "}
            {new Date(ticket.appearsResolvedAt).toLocaleString()}.
            <div className="small text-muted">
              IT support has been notified. The formal status remains {ticket.currentStatus} until staff complete resolution.
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Left Column: Summary, Description, Attachments, Comments */}
        <div className="col-12 col-lg-8">
          <div className="zen-card mb-4">
            <h2 className="h5 fw-bold mb-3 ticket-summary" style={{ color: "var(--color-text)" }}>
              {ticket.summary}
            </h2>

            <div className="text-muted small fw-bold text-uppercase mt-4 mb-2">
              Description
            </div>
            <div
              className="form-control-readonly-zen p-3 rounded border text-break ticket-description"
              style={{ whiteSpace: "pre-wrap", minHeight: "100px" }}
            >
              {ticket.description}
            </div>
          </div>

          {/* Attachments Section */}
          <AttachmentSection
            ticketId={ticket.id}
            requesterId={requester!.id}
            attachments={ticket.attachments || []}
            onAttachmentChanged={() => loadTicket(false)}
          />

          {/* Public Comments Section */}
          <div className="mt-4">
            <PublicCommentsSection ticketId={ticket.id} canComment={true} />
          </div>
        </div>

        {/* Right Column: Metadata Details */}
        <div className="col-12 col-lg-4">
          <div className="zen-card">
            <div
              className="fw-bold py-2 mb-3 border-bottom"
              style={{ color: "var(--color-primary)", fontSize: "16px" }}
            >
              Ticket Details
            </div>
            <div>
              <div className="mb-3">
                <div className="text-muted small mb-1">Priority</div>
                <div>
                  <Badge type="priority" value={ticket.requestedPriority} />
                </div>
              </div>

              <div className="mb-3">
                <div className="text-muted small mb-1">Category</div>
                <div className="fw-semibold">{ticket.category.name}</div>
              </div>

              <div className="mb-3">
                <div className="text-muted small mb-1">Related System</div>
                <div className="fw-semibold">{ticket.relatedSystem.name}</div>
              </div>

              <div className="pt-2 border-top">
                <div className="text-muted small mb-1">Requester</div>
                <div className="fw-semibold">{requester?.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Appears Resolved */}
      {showResolveModal && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Indicate Problem Appears Resolved</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowResolveModal(false)}
                  disabled={resolving}
                />
              </div>
              <div className="modal-body">
                {resolveError && (
                  <div className="alert alert-danger py-2 mb-3">{resolveError}</div>
                )}
                <p>
                  Are you sure you want to mark this problem as appearing resolved?
                </p>
                <p className="text-muted small mb-0">
                  This lets the IT support team know that your issue seems fixed from your perspective.
                  The official ticket status will not change until staff formally review and resolve it.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowResolveModal(false)}
                  disabled={resolving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleConfirmResolve}
                  disabled={resolving}
                >
                  {resolving ? "Confirming..." : "Confirm Resolution"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showResolveModal && <div className="modal-backdrop show" />}
    </div>
  );
}
