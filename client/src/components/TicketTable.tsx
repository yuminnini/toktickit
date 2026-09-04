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
        <thead className="table-light">
          <tr>
            <th scope="col" style={{ width: "160px" }}>Ticket #</th>
            <th scope="col">Summary</th>
            <th scope="col" style={{ width: "160px" }}>Category</th>
            <th scope="col" style={{ width: "110px" }}>Priority</th>
            <th scope="col" style={{ width: "120px" }}>Status</th>
            <th scope="col" style={{ width: "140px" }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="ticket-row">
              <td>
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="fw-bold text-decoration-none font-monospace text-primary ticket-number-link"
                >
                  {ticket.ticketNumber}
                </Link>
              </td>
              <td>
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="text-dark text-decoration-none d-block text-truncate ticket-summary-link"
                  style={{ maxWidth: "320px" }}
                >
                  {ticket.summary}
                </Link>
              </td>
              <td>
                <span className="text-muted ticket-category">{ticket.category}</span>
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
