import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { fetchTicketDetail, TicketDetail as TicketDetailType } from "../api";
import Badge from "../components/Badge";
import { AttachmentSection } from "../components/AttachmentSection";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequesterIdRef = useRef<number | undefined>(requester?.id);
  currentRequesterIdRef.current = requester?.id;

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
      </div>

      <div className="row g-4">
        {/* Left Column: Summary and Description */}
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
    </div>
  );
}
