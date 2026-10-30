import { PriorityType, TicketStatusType, RoleType } from "../api";

interface BadgeProps {
  type: "priority" | "status" | "role";
  value: PriorityType | TicketStatusType | RoleType;
}

export default function Badge({ type, value }: BadgeProps) {
  if (type === "priority") {
    switch (value) {
      case "LOW":
        return (
          <span className="badge rounded-pill badge-zen priority-low" data-priority-cue="LOW">
            <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">↓</span>
            <span>Low</span>
          </span>
        );
      case "MEDIUM":
        return (
          <span className="badge rounded-pill badge-zen priority-medium" data-priority-cue="MEDIUM">
            <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">•</span>
            <span>Medium</span>
          </span>
        );
      case "HIGH":
        return (
          <span className="badge rounded-pill badge-zen priority-high" data-priority-cue="HIGH">
            <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">↑</span>
            <span>High</span>
          </span>
        );
    }
  }

  if (type === "role") {
    switch (value) {
      case "REQUESTER":
        return (
          <span className="badge rounded-pill badge-zen role-requester priority-low" data-role-cue="REQUESTER">
            <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">👤</span>
            <span>Requester</span>
          </span>
        );
      case "IT_STAFF":
        return (
          <span className="badge rounded-pill badge-zen role-staff status-open" data-role-cue="IT_STAFF">
            <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">🛠️</span>
            <span>IT Staff</span>
          </span>
        );
      case "ADMINISTRATOR":
        return (
          <span className="badge rounded-pill badge-zen role-admin status-in-progress" data-role-cue="ADMINISTRATOR">
            <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">🛡️</span>
            <span>Administrator</span>
          </span>
        );
    }
  }

  // Status
  switch (value) {
    case "NEW":
      return (
        <span className="badge rounded-pill badge-zen status-new" data-status-cue="NEW">
          <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">🆕</span>
          <span>New</span>
        </span>
      );
    case "OPEN":
      return (
        <span className="badge rounded-pill badge-zen status-open" data-status-cue="OPEN">
          <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">📂</span>
          <span>Open</span>
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="badge rounded-pill badge-zen status-in-progress" data-status-cue="IN_PROGRESS">
          <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">⚙️</span>
          <span>In Progress</span>
        </span>
      );
    case "WAITING_FOR_REQUESTER":
      return (
        <span className="badge rounded-pill badge-zen status-waiting-for-requester status-in-progress" data-status-cue="WAITING_FOR_REQUESTER">
          <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">⏳</span>
          <span>Waiting for Requester</span>
        </span>
      );
    case "REOPENED":
      return (
        <span className="badge rounded-pill badge-zen status-reopened status-open" data-status-cue="REOPENED">
          <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">🔄</span>
          <span>Reopened</span>
        </span>
      );
    case "RESOLVED":
      return (
        <span className="badge rounded-pill badge-zen status-resolved" data-status-cue="RESOLVED">
          <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">✓</span>
          <span>Resolved</span>
        </span>
      );
    case "CLOSED":
      return (
        <span className="badge rounded-pill badge-zen status-closed" data-status-cue="CLOSED">
          <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">🔒</span>
          <span>Closed</span>
        </span>
      );
    case "CANCELLED":
      return (
        <span className="badge rounded-pill badge-zen status-cancelled status-closed" data-status-cue="CANCELLED">
          <span className="badge-icon me-1" aria-hidden="true" data-testid="badge-icon">✕</span>
          <span>Cancelled</span>
        </span>
      );
  }
}

