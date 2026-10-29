import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import RequesterDashboard from "../../src/pages/RequesterDashboard";
import MyTickets from "../../src/pages/MyTickets";
import { AuthContext } from "../../src/context/AuthContext";
import { RequesterContext } from "../../src/context/RequesterContext";
import * as api from "../../src/api";

const mockRequesterUser: api.SafeUser = {
  id: 1,
  name: "Jane Requester",
  email: "jane.requester@example.com",
  role: "REQUESTER",
  active: true,
  mustChangePassword: false,
};

const sampleRequesterDashboard: api.RequesterDashboardResponse = {
  myOpenTickets: 4,
  inProgress: 2,
  resolved: 2,
  closed: 1,
  waitingForRequester: 0,
  recentlyUpdated: [
    {
      id: 701,
      ticketNumber: "TKT-2026-000701",
      summary: "Laptop battery not charging past 15%",
      category: { id: 1, name: "Hardware" },
      currentStatus: "IN_PROGRESS",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      updatedAt: "2026-10-29T10:00:00.000Z",
    },
  ],
};

function LocationTracker() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname + location.search}</div>;
}

function renderRequesterDashboardApp() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AuthContext.Provider
        value={{
          user: mockRequesterUser,
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        <RequesterContext.Provider
          value={{
            requester: {
              id: 1,
              name: "Jane Requester",
            },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <LocationTracker />
          <Routes>
            <Route path="/dashboard" element={<RequesterDashboard />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/tickets/new" element={<div data-testid="create-ticket-screen">Create Ticket</div>} />
          </Routes>
        </RequesterContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("Requester Dashboard & Status Card Drill-Down (P11 / T18 / AC-17, AC-18, AC-24)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      total: 0,
      unfilteredTotal: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
  });

  it("renders Requester metric cards and recent tickets list (AC-17)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(sampleRequesterDashboard);

    renderRequesterDashboardApp();

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard")).toBeInTheDocument();
    });

    // Open count = NEW (1) + OPEN (1) + IN_PROGRESS (2) + WAITING (0) + REOPENED (0) = 4
    expect(screen.getByTestId("req-metric-open-count")).toHaveTextContent("4");
    expect(screen.getByTestId("req-metric-in-progress-count")).toHaveTextContent("2");
    expect(screen.getByTestId("req-metric-resolved-count")).toHaveTextContent("2");
    expect(screen.getByTestId("req-metric-closed-count")).toHaveTextContent("1");

    expect(screen.getByText("TKT-2026-000701")).toBeInTheDocument();
    expect(screen.getByText("Laptop battery not charging past 15%")).toBeInTheDocument();
  });

  it("T18: clicking 'In Progress' status card navigates to /my-tickets?status=IN_PROGRESS and pre-filters MyTickets (AC-18)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(sampleRequesterDashboard);
    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets");

    renderRequesterDashboardApp();

    await waitFor(() => {
      expect(screen.getByTestId("req-metric-in-progress")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("req-metric-in-progress"));

    await waitFor(() => {
      expect(screen.getByTestId("current-location")).toHaveTextContent(
        "/my-tickets?status=IN_PROGRESS"
      );
    });

    expect(fetchTicketsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ requesterId: 1, status: "IN_PROGRESS", page: 1 }),
      expect.anything()
    );
  });

  it("renders friendly empty state with Submit a Ticket button when requester has zero tickets (AC-17)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue({
      myOpenTickets: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      waitingForRequester: 0,
      recentlyUpdated: [],
    });

    renderRequesterDashboardApp();

    await waitFor(() => {
      expect(screen.getByTestId("requester-empty-state")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("empty-submit-ticket-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("current-location")).toHaveTextContent("/tickets/new");
    });
  });
});
