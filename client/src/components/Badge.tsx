import { PriorityType, TicketStatusType } from "../api";

interface BadgeProps {
  type: "priority" | "status";
  value: PriorityType | TicketStatusType;
}

export default function Badge({ type, value }: BadgeProps) {
  if (type === "priority") {
    switch (value) {
      case "LOW":
        return <span className="badge rounded-pill badge-zen priority-low">Low</span>;
      case "MEDIUM":
        return <span className="badge rounded-pill badge-zen priority-medium">Medium</span>;
      case "HIGH":
        return <span className="badge rounded-pill badge-zen priority-high">High</span>;
    }
  }

  // Status
  switch (value) {
    case "NEW":
      return <span className="badge rounded-pill badge-zen status-new">New</span>;
    case "OPEN":
      return <span className="badge rounded-pill badge-zen status-open">Open</span>;
    case "IN_PROGRESS":
      return <span className="badge rounded-pill badge-zen status-in-progress">In Progress</span>;
    case "RESOLVED":
      return <span className="badge rounded-pill badge-zen status-resolved">Resolved</span>;
    case "CLOSED":
      return <span className="badge rounded-pill badge-zen status-closed">Closed</span>;
  }
}
