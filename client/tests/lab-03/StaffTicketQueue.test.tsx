import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import StaffQueuePage from "../../src/pages/StaffQueuePage";
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

function renderStaffQueue() {
  return render(
    <MemoryRouter initialEntries={["/staff/tickets"]}>
      <AuthContext.Provider
        value={{
          user: mockStaffUser,
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        <Routes>
          <Route path="/staff/tickets" element={<StaffQueuePage />} />
          <Route path="/staff/tickets/:id" element={<div>Staff Detail Page Mock</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("Staff Queue UI (T27 / AC-27 / QUEUE-UI)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Hardware" },
      { id: 2, name: "Network" },
    ]);
  });

  // 1. Loading Skeleton / Spinner State
  it("renders distinct loading skeleton while fetching queue data", () => {
    // Return a promise that never resolves immediately
    vi.spyOn(api, "fetchStaffTickets").mockReturnValue(new Promise(() => {}));

    renderStaffQueue();

    expect(screen.getByTestId("queue-loading")).toBeInTheDocument();
    expect(screen.getByText(/loading queue tickets/i)).toBeInTheDocument();
  });

  // 2. Empty Queue State (unfiltered)
  it("renders empty queue state when there are no tickets and no active filters", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });

    renderStaffQueue();

    await waitFor(() => {
      expect(screen.queryByTestId("queue-loading")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("queue-empty-state")).toBeInTheDocument();
    expect(screen.getByText("Queue is empty")).toBeInTheDocument();
    expect(screen.getByText(/there are currently no tickets in the queue/i)).toBeInTheDocument();
  });

  // 3. No Matches State (with active search or filters)
  it("renders distinct no-results state with reset action when search/filters yield zero matches", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });

    renderStaffQueue();

    // Type into search
    const searchInput = screen.getByLabelText(/search tickets/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent-ticket" } });

    await waitFor(() => {
      expect(screen.getByText("No tickets match your criteria")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /reset filters/i })).toBeInTheDocument();
  });

  // 4. Error and Retry State
  it("renders error state on API failure and allows retrying", async () => {
    const fetchSpy = vi.spyOn(api, "fetchStaffTickets")
      .mockRejectedValueOnce(new Error("Network connection dropped"))
      .mockResolvedValueOnce({
        data: [
          {
            id: 101,
            ticketNumber: "TKT-2026-000101",
            summary: "Printer toner leaking",
            category: { id: 1, name: "Hardware" },
            requestedPriority: "LOW",
            itPriority: "LOW",
            currentStatus: "OPEN",
            ticketOwner: null,
            updatedAt: "2026-09-18T10:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

    renderStaffQueue();

    await waitFor(() => {
      expect(screen.getByText(/unable to load ticket queue/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/network connection dropped/i)).toBeInTheDocument();
    const retryBtn = screen.getByTestId("queue-retry-button");
    expect(retryBtn).toBeInTheDocument();

    // Click retry
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("Printer toner leaking").length).toBeGreaterThanOrEqual(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  // 5. Data Table View & Controls
  it("renders ticket table with columns, owner badges, and filter reset on page size change", async () => {
    const fetchSpy = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [
        {
          id: 201,
          ticketNumber: "TKT-2026-000201",
          summary: "VPN authentication failure",
          category: { id: 2, name: "Network" },
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          currentStatus: "IN_PROGRESS",
          ticketOwner: { id: 10, name: "Alice IT Support", email: "staff.alice@example.com" },
          updatedAt: "2026-09-18T12:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderStaffQueue();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000201").length).toBeGreaterThanOrEqual(1);
    });

    // Check columns and badges
    expect(screen.getAllByText("VPN authentication failure").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Network").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("High").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Alice IT Support/).length).toBeGreaterThanOrEqual(1);

    // Total count badge
    expect(screen.getByTestId("queue-total-count")).toHaveTextContent("1");

    // Change filter: Owner assignment
    const unassignedBtn = screen.getByTestId("owner-filter-unassigned");
    fireEvent.click(unassignedBtn);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "unassigned", page: 1 }),
      expect.anything()
    );
  });
});
