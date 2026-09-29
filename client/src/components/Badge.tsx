import { PriorityType, TicketStatusType, RoleType } from "../api";

interface BadgeProps {
  type: "priority" | "status" | "role";
  value: PriorityType | TicketStatusType | RoleType;
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

  if (type === "role") {
    switch (value) {
      case "REQUESTER":
        return <span className="badge rounded-pill badge-zen role-requester priority-low">Requester</span>;
      case "IT_STAFF":
        return <span className="badge rounded-pill badge-zen role-staff status-open">IT Staff</span>;
      case "ADMINISTRATOR":
        return <span className="badge rounded-pill badge-zen role-admin status-in-progress">Administrator</span>;
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
    case "WAITING_FOR_REQUESTER":
      return <span className="badge rounded-pill badge-zen status-waiting-for-requester status-in-progress">Waiting for Requester</span>;
    case "REOPENED":
      return <span className="badge rounded-pill badge-zen status-reopened status-open">Reopened</span>;
    case "RESOLVED":
      return <span className="badge rounded-pill badge-zen status-resolved">Resolved</span>;
    case "CLOSED":
      return <span className="badge rounded-pill badge-zen status-closed">Closed</span>;
    case "CANCELLED":
      return <span className="badge rounded-pill badge-zen status-cancelled status-closed">Cancelled</span>;
  }
}
