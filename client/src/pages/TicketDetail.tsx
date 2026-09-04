import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { fetchTicketDetail, TicketDetail as TicketDetailType } from "../api";
import Badge from "../components/Badge";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id || !requester?.id) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTicket(null);
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    fetchTicketDetail(Number(id), requester.id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setTicket(data);
        }
      })
      .catch((err: Error & { status?: number }) => {
        if (!controller.signal.aborted) {
          if (err.status === 404) {
            setIsNotFound(true);
          } else {
            setError(err.message || "Unable to load ticket details");
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [id, requester?.id]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading ticket…</span>
        </div>
        <p className="text-muted mt-2">Loading ticket details…</p>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="container py-5">
        <div className="card shadow-sm border text-center py-5 not-found-state">
          <div className="card-body">
            <div className="mb-3 text-muted" style={{ fontSize: "2.5rem" }}>
              🔒
            </div>
            <h4 className="fw-bold mb-2">Ticket Not Found</h4>
            <p className="text-muted mb-4" style={{ maxWidth: "450px", margin: "0 auto" }}>
              The ticket you requested does not exist, or you do not have permission to view it.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/my-tickets")}
            >
              &larr; Back to My Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          {error || "An unexpected error occurred."}
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate("/my-tickets")}
        >
          &larr; Back to My Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header and Back Link */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-4">
        <div>
          <button
            type="button"
            className="btn btn-link text-decoration-none p-0 mb-2 d-inline-flex align-items-center gap-1 text-muted small"
            onClick={() => navigate("/my-tickets")}
          >
            &larr; Back to My Tickets
          </button>
          <div className="d-flex align-items-center gap-3">
            <h1 className="h3 fw-bold font-monospace mb-0 ticket-number">
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
          <div className="card shadow-sm border mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3 ticket-summary">
                {ticket.summary}
              </h5>

              <h6 className="text-muted small fw-bold text-uppercase mt-4 mb-2">
                Description
              </h6>
              <div
                className="bg-light p-3 rounded border text-break ticket-description"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {ticket.description}
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="card shadow-sm border">
            <div className="card-body p-4">
              <h6 className="card-title fw-bold mb-3">
                Attachments ({ticket.attachments?.length || 0})
              </h6>

              {ticket.attachments && ticket.attachments.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {ticket.attachments.map((att) => (
                    <li
                      key={att.id}
                      className="list-group-item d-flex justify-content-between align-items-center px-0 py-2"
                    >
                      <span className="text-truncate" style={{ maxWidth: "300px" }}>
                        📎 {att.originalName}
                      </span>
                      <span className="badge bg-light text-muted border">
                        {Math.round(att.sizeBytes / 1024)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted small mb-0">No attachments uploaded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata Details */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border">
            <div className="card-header bg-light fw-bold py-3">
              Ticket Details
            </div>
            <div className="card-body p-3">
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
