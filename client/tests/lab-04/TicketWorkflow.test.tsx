import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Badge from "../../src/components/Badge";
import StaffTicketDetailPage from "../../src/pages/StaffTicketDetailPage";
import { AuthContext } from "../../src/context/AuthContext";
import * as api from "../../src/api";

const mockStaffUser: api.SafeUser = {
  id: 10,
  name: "Alice IT Support",
  email: "staff.alice@example.com",
  role: "IT_STAFF",
  active: true,
  mustChangePassword: false,
};

const mockAdminUser: api.SafeUser = {
  id: 99,
  name: "System Administrator",
  email: "admin@example.com",
  role: "ADMINISTRATOR",
  active: true,
  mustChangePassword: false,
};

const sampleStaffTicket: api.StaffTicketDetail = {
  id: 301,
  ticketNumber: "TKT-2026-000301",
  summary: "Email client failing to sync inbox folders",
  description: "Outlook hangs at 'Updating Inbox' since morning update.",
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  appearsResolvedAt: null,
  appearsResolvedById: null,
  version: 2,
  createdAt: "2026-10-28T08:00:00.000Z",
  updatedAt: "2026-10-29T08:00:00.000Z",
  requester: {
    id: 1,
    name: "Jane Requester",
    email: "jane.requester@example.com",
  },
  ticketOwner: {
    id: 10,
    name: "Alice IT Support",
    email: "staff.alice@example.com",
  },
  category: { id: 1, name: "Software" },
  relatedSystem: { id: 1, name: "Email & Collaboration" },
  attachments: [],
};

function renderStaffDetail(user: api.SafeUser = mockStaffUser) {
  return render(
    <MemoryRouter initialEntries={["/staff/tickets/301"]}>
      <AuthContext.Provider
        value={{
          user,
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        <Routes>
          <Route path="/staff/tickets/:id" element={<StaffTicketDetailPage />} />
          <Route path="/staff/tickets" element={<div>Staff Queue Screen</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("Ticket Workflow, Resolution Gate & Non-Color Status Cues (P09 / T25 / AC-06, AC-25)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchEligibleOwners").mockResolvedValue([
      { id: 10, name: "Alice IT Support", email: "staff.alice@example.com", role: "IT_STAFF" },
    ]);
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]);
    vi.spyOn(api, "fetchTicketNotes").mockResolvedValue([]);
  });

  it("T25: renders explicit text labels AND non-color icon indicators across all 8 statuses and 3 priorities (AC-25)", () => {
    const statuses: { val: api.TicketStatusType; label: string; icon: string }[] = [
      { val: "NEW", label: "New", icon: "🆕" },
      { val: "OPEN", label: "Open", icon: "📂" },
      { val: "IN_PROGRESS", label: "In Progress", icon: "⚙️" },
      { val: "WAITING_FOR_REQUESTER", label: "Waiting for Requester", icon: "⏳" },
      { val: "REOPENED", label: "Reopened", icon: "🔄" },
      { val: "RESOLVED", label: "Resolved", icon: "✓" },
      { val: "CLOSED", label: "Closed", icon: "🔒" },
      { val: "CANCELLED", label: "Cancelled", icon: "✕" },
    ];

    for (const st of statuses) {
      const { unmount, container } = render(<Badge type="status" value={st.val} />);
      expect(screen.getByText(st.label)).toBeInTheDocument();
      const iconEl = screen.getByTestId("badge-icon");
      expect(iconEl).toHaveTextContent(st.icon);
      expect(container.querySelector(`[data-status-cue="${st.val}"]`)).toBeInTheDocument();
      unmount();
    }

    const priorities: { val: api.PriorityType; label: string; icon: string }[] = [
      { val: "LOW", label: "Low", icon: "↓" },
      { val: "MEDIUM", label: "Medium", icon: "•" },
      { val: "HIGH", label: "High", icon: "↑" },
    ];

    for (const pr of priorities) {
      const { unmount, container } = render(<Badge type="priority" value={pr.val} />);
      expect(screen.getByText(pr.label)).toBeInTheDocument();
      const iconEl = screen.getByTestId("badge-icon");
      expect(iconEl).toHaveTextContent(pr.icon);
      expect(container.querySelector(`[data-priority-cue="${pr.val}"]`)).toBeInTheDocument();
      unmount();
    }
  });

  it("displays resolution gate warning when selecting RESOLVED while ticket has zero Actions Taken (Decision D2 / AC-06)", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(sampleStaffTicket);
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([]);

    renderStaffDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000301")).toBeInTheDocument();
    });

    const statusSelect = screen.getByTestId("status-transition-select");
    fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });

    expect(screen.getByTestId("resolution-gate-notice")).toBeInTheDocument();
    expect(screen.getByTestId("resolution-gate-notice")).toHaveTextContent(
      /At least one Action Taken must be recorded before resolving/i
    );
  });

  it("surfaces 409 VERSION_CONFLICT banner with Refresh Ticket action on status update conflict", async () => {
    const fetchDetailSpy = vi
      .spyOn(api, "fetchStaffTicketDetail")
      .mockResolvedValue(sampleStaffTicket);
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([
      {
        id: 601,
        ticketId: 301,
        performedBy: { id: 10, name: "Alice IT Support", role: "IT_STAFF" },
        actionDateTime: "2026-10-29T08:30:00.000Z",
        description: "Rebuilt local OST cache.",
        result: "Folders synced properly.",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        version: 1,
        createdAt: "2026-10-29T08:30:00.000Z",
        updatedAt: "2026-10-29T08:30:00.000Z",
      },
    ]);

    const conflictErr: any = new Error("Ticket version conflict");
    conflictErr.status = 409;
    conflictErr.code = "VERSION_CONFLICT";
    vi.spyOn(api, "updateTicketStatus").mockRejectedValueOnce(conflictErr);

    renderStaffDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000301")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("status-transition-select"), {
      target: { value: "RESOLVED" },
    });
    fireEvent.click(screen.getByTestId("submit-status-btn"));
    fireEvent.click(screen.getByTestId("confirm-status-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("refresh-conflict-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("refresh-conflict-btn"));
    expect(fetchDetailSpy).toHaveBeenCalledTimes(2);
  });

  it("Decision D6: hides/disables IT_STAFF-only operations (Claim/Reassign/IT Priority/fetchEligibleOwners) for ADMINISTRATOR while keeping Status Transition enabled", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(sampleStaffTicket);
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue([]);
    const eligibleOwnersSpy = vi.spyOn(api, "fetchEligibleOwners");

    renderStaffDetail(mockAdminUser);

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000301")).toBeInTheDocument();
    });

    // fetchEligibleOwners must NOT be called for ADMINISTRATOR
    expect(eligibleOwnersSpy).not.toHaveBeenCalled();

    // Reassign button hidden and IT Priority disabled for ADMINISTRATOR
    expect(screen.queryByTestId("reassign-owner-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("claim-ticket-btn")).not.toBeInTheDocument();
    expect(screen.getByTestId("it-priority-select")).toBeDisabled();

    // Status transition select remains enabled for ADMINISTRATOR per Decision D6
    expect(screen.getByTestId("status-transition-select")).not.toBeDisabled();
  });
});
