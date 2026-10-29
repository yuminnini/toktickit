import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import StaffDashboard from "../../src/pages/StaffDashboard";
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

const mockAdminUser: api.SafeUser = {
  id: 99,
  name: "System Administrator",
  email: "admin@example.com",
  role: "ADMINISTRATOR",
  active: true,
  mustChangePassword: false,
};

const sampleStaffDashboardData: api.StaffDashboardResponse = {
  queueMetrics: {
    NEW: 3,
    OPEN: 4,
    IN_PROGRESS: 2,
    WAITING_FOR_REQUESTER: 1,
    REOPENED: 1,
    RESOLVED: 5,
    CLOSED: 8,
    CANCELLED: 0,
    myAssigned: 6,
    unassigned: 3,
  },
  recentQueue: [
    {
      id: 401,
      ticketNumber: "TKT-2026-000401",
      summary: "Core router latency spike",
      category: { id: 2, name: "Network" },
      currentStatus: "IN_PROGRESS",
      itPriority: "HIGH",
      requester: { id: 1, name: "Jane Requester" },
      ticketOwner: { id: 10, name: "Alice IT Support" },
      updatedAt: "2026-10-29T11:00:00.000Z",
    },
  ],
};

function LocationTracker() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname + location.search}</div>;
}

function renderStaffDashboardApp(user: api.SafeUser = mockStaffUser) {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
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
        <LocationTracker />
        <Routes>
          <Route path="/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/tickets" element={<StaffQueuePage />} />
          <Route path="/admin/users" element={<div data-testid="admin-users-screen">User Management</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("IT Staff & Administrator Dashboard (P10 / T20 / AC-19, AC-20, AC-21, AC-24)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 2, name: "Network" }]);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
  });

  it("renders 5 queue metric cards and recent queue table for IT_STAFF without admin userStats (AC-19)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(sampleStaffDashboardData);

    renderStaffDashboardApp(mockStaffUser);

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });

    expect(screen.getByTestId("metric-card-new-count")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-card-open-count")).toHaveTextContent("4");
    expect(screen.getByTestId("metric-card-in-progress-count")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-card-waiting-count")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-card-my-assigned-count")).toHaveTextContent("6");

    expect(screen.getByText("TKT-2026-000401")).toBeInTheDocument();
    expect(screen.getByText("Core router latency spike")).toBeInTheDocument();

    // IT_STAFF should NOT see Administrator userStats section
    expect(screen.queryByTestId("admin-user-stats-section")).not.toBeInTheDocument();
  });

  it("T20: clicking 'My Assigned' metric card navigates to /staff/tickets?owner=mine and pre-filters StaffQueuePage (AC-20)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(sampleStaffDashboardData);
    const queueSpy = vi.spyOn(api, "fetchStaffTickets");

    renderStaffDashboardApp(mockStaffUser);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-my-assigned")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("metric-card-my-assigned"));

    await waitFor(() => {
      expect(screen.getByTestId("current-location")).toHaveTextContent("/staff/tickets?owner=mine");
    });

    expect(queueSpy).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "mine", page: 1 }),
      expect.anything()
    );
  });

  it("supports keyboard activation (Enter / Space) on status metric cards to drill down to filtered queue (AC-20, AC-24)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(sampleStaffDashboardData);
    const queueSpy = vi.spyOn(api, "fetchStaffTickets");

    renderStaffDashboardApp(mockStaffUser);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-waiting")).toBeInTheDocument();
    });

    const waitingCard = screen.getByTestId("metric-card-waiting");
    waitingCard.focus();
    fireEvent.keyDown(waitingCard, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByTestId("current-location")).toHaveTextContent(
        "/staff/tickets?status=WAITING_FOR_REQUESTER"
      );
    });

    expect(queueSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "WAITING_FOR_REQUESTER", page: 1 }),
      expect.anything()
    );
  });

  it("renders System User Accounts summary and Manage Users link when ADMINISTRATOR userStats is returned (AC-21)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue({
      ...sampleStaffDashboardData,
      userStats: {
        totalUsers: 12,
        activeStaff: 4,
        inactiveUsers: 2,
      },
    });

    renderStaffDashboardApp(mockAdminUser);

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-stats-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("stat-total-users")).toHaveTextContent("12");
    expect(screen.getByTestId("stat-active-staff")).toHaveTextContent("4");
    expect(screen.getByTestId("stat-inactive-users")).toHaveTextContent("2");

    fireEvent.click(screen.getByTestId("manage-users-link"));
    await waitFor(() => {
      expect(screen.getByTestId("current-location")).toHaveTextContent("/admin/users");
    });
  });
});
