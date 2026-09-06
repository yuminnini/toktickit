import { Link } from "react-router-dom";
import { TicketListItem } from "../api";
import Badge from "./Badge";

interface TicketCardProps {
  tickets: TicketListItem[];
}

export default function TicketCard({ tickets }: TicketCardProps) {
  return (
    <div className="ticket-cards d-flex flex-column gap-3">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="zen-card ticket-card-item p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <Link
              to={`/tickets/${ticket.id}`}
              className="fw-bold font-monospace text-decoration-none"
              style={{ color: "var(--color-primary)" }}
            >
              {ticket.ticketNumber}
            </Link>
            <Badge type="status" value={ticket.currentStatus} />
          </div>

          <h6 className="mb-2">
            <Link
              to={`/tickets/${ticket.id}`}
              className="text-dark text-decoration-none"
            >
              {ticket.summary}
            </Link>
          </h6>

          <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top small text-muted flex-wrap gap-1">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-medium">{ticket.category}</span>
              <span>•</span>
              <Badge type="priority" value={ticket.requestedPriority} />
            </div>
            <span>
              {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
