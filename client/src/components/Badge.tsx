import { PriorityType, TicketStatusType } from "../api";

interface BadgeProps {
  type: "priority" | "status";
  value: PriorityType | TicketStatusType;
}

export default function Badge({ type, value }: BadgeProps) {
  if (type === "priority") {
    switch (value) {
      case "LOW":
        return (
          <span
            className="badge rounded-pill priority-low"
            style={{
              backgroundColor: "#EAF6EF",
              color: "#006B3C",
              border: "1px solid #C4E5D4",
              fontWeight: 600,
              padding: "4px 8px",
            }}
          >
            Low
          </span>
        );
      case "MEDIUM":
        return (
          <span
            className="badge rounded-pill priority-medium"
            style={{
              backgroundColor: "#FEF3C7",
              color: "#92400E",
              border: "1px solid #FCD34D",
              fontWeight: 600,
              padding: "4px 8px",
            }}
          >
            Medium
          </span>
        );
      case "HIGH":
        return (
          <span
            className="badge rounded-pill priority-high"
            style={{
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              border: "1px solid #FCA5A5",
              fontWeight: 600,
              padding: "4px 8px",
            }}
          >
            High
          </span>
        );
    }
  }

  // Status
  switch (value) {
    case "NEW":
      return (
        <span
          className="badge rounded-pill status-new"
          style={{
            backgroundColor: "#E2E8F0",
            color: "#334155",
            border: "1px solid #CBD5E1",
            fontWeight: 600,
            padding: "4px 8px",
          }}
        >
          New
        </span>
      );
    case "OPEN":
      return <span className="badge bg-primary rounded-pill status-open">Open</span>;
    case "IN_PROGRESS":
      return <span className="badge bg-warning text-dark rounded-pill status-in-progress">In Progress</span>;
    case "RESOLVED":
      return <span className="badge bg-success rounded-pill status-resolved">Resolved</span>;
    case "CLOSED":
      return <span className="badge bg-secondary rounded-pill status-closed">Closed</span>;
  }
}
