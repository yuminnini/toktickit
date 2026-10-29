import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActionsTakenSection from "../../src/components/ActionsTakenSection";
import { AuthContext } from "../../src/context/AuthContext";
import * as api from "../../src/api";

const mockStaffAlice: api.SafeUser = {
  id: 10,
  name: "Alice IT Support",
  email: "staff.alice@example.com",
  role: "IT_STAFF",
  active: true,
  mustChangePassword: false,
};

const mockStaffBob: api.SafeUser = {
  id: 11,
  name: "Bob IT Support",
  email: "staff.bob@example.com",
  role: "IT_STAFF",
  active: true,
  mustChangePassword: false,
};

const mockAdmin: api.SafeUser = {
  id: 99,
  name: "System Administrator",
  email: "admin@example.com",
  role: "ADMINISTRATOR",
  active: true,
  mustChangePassword: false,
};

const mockRequester: api.SafeUser = {
  id: 1,
  name: "Jane Requester",
  email: "jane.requester@example.com",
  role: "REQUESTER",
  active: true,
  mustChangePassword: false,
};

const sampleActions: api.ActionTakenItem[] = [
  {
    id: 501,
    ticketId: 100,
    performedBy: {
      id: 10,
      name: "Alice IT Support",
      role: "IT_STAFF",
    },
    actionDateTime: "2026-10-29T09:00:00.000Z",
    description: "Inspected network switch port 14 and reset VLAN configuration.",
    result: "Link status restored to 1 Gbps full duplex.",
    followUpRequired: true,
    followUpNote: "Monitor packet loss over next 24 hours.",
    attachmentNotes: "See switch_port_14_diag.txt",
    version: 1,
    createdAt: "2026-10-29T09:00:00.000Z",
    updatedAt: "2026-10-29T09:00:00.000Z",
  },
  {
    id: 502,
    ticketId: 100,
    performedBy: {
      id: 11,
      name: "Bob IT Support",
      role: "IT_STAFF",
    },
    actionDateTime: "2026-10-29T10:30:00.000Z",
    description: "Verified workstation DNS resolution after switch reset.",
    result: "All internal hostnames resolving normally.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    version: 1,
    createdAt: "2026-10-29T10:30:00.000Z",
    updatedAt: "2026-10-29T10:30:00.000Z",
  },
];

function renderWithUser(
  user: api.SafeUser | null,
  ticketStatus: api.TicketStatusType = "IN_PROGRESS",
  initialActions?: api.ActionTakenItem[]
) {
  return render(
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
      <ActionsTakenSection
        ticketId={100}
        ticketStatus={ticketStatus}
        initialActions={initialActions}
      />
    </AuthContext.Provider>
  );
}

describe("Actions Taken Section & Keyboard Accessibility (P08 / T24 / AC-01–AC-09, AC-24)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders chronological Actions Taken list and strictly omits create/edit buttons for REQUESTER (AC-04, AC-07)", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue(sampleActions);

    renderWithUser(mockRequester, "IN_PROGRESS");

    await waitFor(() => {
      expect(screen.getAllByTestId("action-item")).toHaveLength(2);
    });

    expect(screen.getByText(/Inspected network switch port 14/i)).toBeInTheDocument();
    expect(screen.getByText(/Monitor packet loss over next 24 hours/i)).toBeInTheDocument();
    expect(screen.getByText(/See switch_port_14_diag.txt/i)).toBeInTheDocument();

    // Requester must NOT see "+ Record Action Taken" or any "Edit" button
    expect(screen.queryByTestId("record-action-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-action-btn-501")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-action-btn-502")).not.toBeInTheDocument();
  });

  it("shows Edit button only on own actions for IT_STAFF and on all actions for ADMINISTRATOR (Decision D4 / AC-02, AC-03)", async () => {
    const { unmount } = renderWithUser(mockStaffAlice, "IN_PROGRESS", sampleActions);

    // Alice (id=10) can edit action 501 (own) but NOT action 502 (Bob's)
    expect(screen.getByTestId("record-action-btn")).toBeInTheDocument();
    expect(screen.getByTestId("edit-action-btn-501")).toBeInTheDocument();
    expect(screen.queryByTestId("edit-action-btn-502")).not.toBeInTheDocument();

    unmount();

    // Administrator can edit both 501 and 502
    renderWithUser(mockAdmin, "IN_PROGRESS", sampleActions);
    expect(screen.getByTestId("edit-action-btn-501")).toBeInTheDocument();
    expect(screen.getByTestId("edit-action-btn-502")).toBeInTheDocument();
  });

  it("locks Action Taken creation and editing when ticket is RESOLVED, CLOSED, or CANCELLED (Decision D5 / AC-09)", () => {
    renderWithUser(mockStaffAlice, "RESOLVED", sampleActions);

    expect(screen.getByTestId("actions-locked-notice")).toBeInTheDocument();
    expect(screen.queryByTestId("record-action-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-action-btn-501")).not.toBeInTheDocument();
  });

  it("T24: supports keyboard navigation, accessible form labels, and conditional Follow-Up Note validation (AC-05, AC-24)", async () => {
    const createSpy = vi.spyOn(api, "createTicketAction").mockResolvedValue({
      ...sampleActions[0],
      id: 503,
    });
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue(sampleActions);

    renderWithUser(mockStaffAlice, "IN_PROGRESS", []);

    const recordBtn = screen.getByTestId("record-action-btn");
    recordBtn.focus();
    expect(document.activeElement).toBe(recordBtn);
    fireEvent.click(recordBtn);

    // Form controls have accessible labels
    const performerInput = screen.getByLabelText(/Performed By/i) as HTMLInputElement;
    expect(performerInput).toHaveValue("Alice IT Support");
    expect(performerInput).toHaveAttribute("readonly");

    const descInput = screen.getByLabelText(/Action Description/i);
    const resultInput = screen.getByLabelText(/Result \/ Outcome/i);
    const followUpToggle = screen.getByLabelText(/Follow-Up Required\?/i) as HTMLInputElement;
    const followUpNoteInput = screen.getByLabelText(/Follow-Up Note/i) as HTMLTextAreaElement;

    // Initially followUpRequired is false and followUpNoteInput is disabled
    expect(followUpToggle.checked).toBe(false);
    expect(followUpNoteInput).toBeDisabled();

    fireEvent.change(descInput, { target: { value: "Replaced faulty patch cable on port 14." } });
    fireEvent.change(resultInput, { target: { value: "Connection stabilized immediately." } });

    // Enable follow-up required without providing follow-up note -> should fail validation
    fireEvent.click(followUpToggle);
    expect(followUpNoteInput).not.toBeDisabled();

    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("action-form-error")).toHaveTextContent(
        /Follow-up note is required when follow-up is enabled/i
      );
    });
    expect(createSpy).not.toHaveBeenCalled();

    // Provide valid follow-up note and submit
    fireEvent.change(followUpNoteInput, {
      target: { value: "Confirm with user tomorrow morning." },
    });
    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          description: "Replaced faulty patch cable on port 14.",
          result: "Connection stabilized immediately.",
          followUpRequired: true,
          followUpNote: "Confirm with user tomorrow morning.",
        })
      );
    });
  });

  it("handles 409 VERSION_CONFLICT during action edit by displaying reload banner while preserving draft (AC-10)", async () => {
    const conflictErr: any = new Error("Version conflict detected");
    conflictErr.status = 409;
    conflictErr.code = "VERSION_CONFLICT";

    vi.spyOn(api, "updateTicketAction").mockRejectedValueOnce(conflictErr);
    const fetchSpy = vi.spyOn(api, "fetchTicketActions").mockResolvedValue([
      { ...sampleActions[0], version: 2 },
    ]);

    renderWithUser(mockStaffBob, "IN_PROGRESS", [
      { ...sampleActions[0], performedBy: { id: 11, name: "Bob IT Support", role: "IT_STAFF" } },
    ]);

    fireEvent.click(screen.getByTestId("edit-action-btn-501"));

    const descInput = screen.getByLabelText(/Action Description/i) as HTMLTextAreaElement;
    fireEvent.change(descInput, { target: { value: "Updated description draft kept safe" } });

    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("action-conflict-banner")).toBeInTheDocument();
    });

    // Draft text is preserved
    expect(descInput.value).toBe("Updated description draft kept safe");

    // Clicking reload fetches latest actions and clears conflict banner
    fireEvent.click(screen.getByTestId("reload-actions-btn"));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(100);
      expect(screen.queryByTestId("action-conflict-banner")).not.toBeInTheDocument();
    });
  });
});

