import { Link } from "react-router-dom";
import { TicketListItem } from "../api";
import Badge from "./Badge";

interface TicketTableProps {
  tickets: TicketListItem[];
}

export default function TicketTable({ tickets }: TicketTableProps) {
  return (
    <div className="table-responsive ticket-table-container">
      <table className="table table-hover align-middle mb-0">
        <thead style={{ backgroundColor: "var(--color-bg)", borderBottom: "2px solid var(--color-surface-border)" }}>
          <tr>
            <th scope="col" style={{ width: "160px", color: "var(--color-text)", fontWeight: 600 }}>Ticket #</th>
            <th scope="col" style={{ color: "var(--color-text)", fontWeight: 600 }}>Summary</th>
            <th scope="col" style={{ width: "160px", color: "var(--color-text)", fontWeight: 600 }}>Category</th>
            <th scope="col" style={{ width: "110px", color: "var(--color-text)", fontWeight: 600 }}>Priority</th>
            <th scope="col" style={{ width: "120px", color: "var(--color-text)", fontWeight: 600 }}>Status</th>
            <th scope="col" style={{ width: "140px", color: "var(--color-text)", fontWeight: 600 }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="ticket-row">
              <td>
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="fw-bold text-decoration-none font-monospace ticket-number-link"
                  style={{ color: "var(--color-primary)" }}
                >
                  {ticket.ticketNumber}
                </Link>
              </td>
              <td>
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="text-dark text-decoration-none d-block text-truncate ticket-summary-link"
                  style={{ maxWidth: "340px" }}
                  title={ticket.summary}
                >
                  {ticket.summary}
                </Link>
              </td>
              <td>
                <span className="text-muted ticket-category small">{ticket.category}</span>
              </td>
              <td>
                <Badge type="priority" value={ticket.requestedPriority} />
              </td>
              <td>
                <Badge type="status" value={ticket.currentStatus} />
              </td>
              <td className="text-muted small">
                {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
