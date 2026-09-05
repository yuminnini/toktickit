import { Link } from "react-router-dom";
import { TicketListItem } from "../api";
import Badge from "./Badge";

interface TicketTableProps {
  tickets: TicketListItem[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
}

export default function TicketTable({
  tickets,
  sortField,
  sortOrder,
  onSort,
}: TicketTableProps) {
  const renderSortHeader = (label: string, field?: string, width?: string) => {
    if (!field || !onSort) {
      return (
        <th scope="col" style={{ width, color: "var(--color-text)", fontWeight: 600 }}>
          {label}
        </th>
      );
    }
    const isCurrent = sortField === field;
    return (
      <th scope="col" style={{ width, color: "var(--color-text)", fontWeight: 600 }}>
        <button
          type="button"
          className="btn btn-link p-0 text-decoration-none d-inline-flex align-items-center gap-1 text-reset sort-header-btn"
          style={{ fontWeight: 600, fontSize: "inherit" }}
          onClick={() => onSort(field)}
          aria-label={`Sort by ${label}`}
        >
          <span>{label}</span>
          <span
            className={isCurrent ? "fw-bold" : "text-muted"}
            style={{ fontSize: "11px", color: isCurrent ? "var(--color-primary)" : undefined }}
          >
            {isCurrent ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="table-responsive ticket-table-container">
      <table className="table table-hover align-middle mb-0">
        <thead style={{ backgroundColor: "var(--color-bg)", borderBottom: "2px solid var(--color-surface-border)" }}>
          <tr>
            {renderSortHeader("Ticket #", "ticketNumber", "150px")}
            {renderSortHeader("Summary", "summary")}
            {renderSortHeader("Category", undefined, "140px")}
            {renderSortHeader("Priority", "requestedPriority", "110px")}
            {renderSortHeader("Status", "currentStatus", "120px")}
            {renderSortHeader("Created", "createdAt", "130px")}
            {renderSortHeader("Last Updated", "updatedAt", "130px")}
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
                  style={{ maxWidth: "300px" }}
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
              <td className="text-muted small">
                {new Date(ticket.updatedAt).toLocaleDateString("en-US", {
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
