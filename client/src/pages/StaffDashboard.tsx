import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchStaffDashboard, StaffDashboardResponse } from "../api";
import { useAuth } from "../context/AuthContext";
import Badge from "../components/Badge";

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStaffDashboard();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Unable to load staff dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleCardKeyDown = (e: React.KeyboardEvent, targetPath: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(targetPath);
    }
  };

  if (loading) {
    return (
      <div className="zen-container py-5 text-center" role="status" data-testid="staff-dashboard-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
        <p className="text-muted mt-2 small">Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="zen-container py-5" data-testid="staff-dashboard-error">
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{error || "Failed to load dashboard."}</span>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      id: "metric-card-new",
      label: "New",
      count: data.queueMetrics.NEW,
      path: "/staff/tickets?status=NEW",
      accent: "#355C7D",
      icon: "🆕",
    },
    {
      id: "metric-card-open",
      label: "Open",
      count: data.queueMetrics.OPEN,
      path: "/staff/tickets?status=OPEN",
      accent: "#006B3C",
      icon: "📂",
    },
    {
      id: "metric-card-in-progress",
      label: "In Progress",
      count: data.queueMetrics.IN_PROGRESS,
      path: "/staff/tickets?status=IN_PROGRESS",
      accent: "#8C4A00",
      icon: "⚙️",
    },
    {
      id: "metric-card-waiting",
      label: "Waiting for Requester",
      count: data.queueMetrics.WAITING_FOR_REQUESTER,
      path: "/staff/tickets?status=WAITING_FOR_REQUESTER",
      accent: "#8C4A00",
      icon: "⏳",
    },
    {
      id: "metric-card-my-assigned",
      label: "My Assigned",
      count: data.queueMetrics.myAssigned,
      path: "/staff/tickets?owner=mine",
      accent: "#0B7A46",
      icon: "👤",
    },
  ];

  return (
    <div className="zen-container py-4" data-testid="staff-dashboard">
      {/* Welcome Banner */}
      <div
        className="p-4 rounded-3 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3 text-white shadow-sm"
        style={{ background: "linear-gradient(135deg, #006B3C 0%, #0B7A46 100%)" }}
      >
        <div>
          <h1 className="h4 fw-bold mb-1">Welcome back, {user?.name || "IT Support"}!</h1>
          <p className="mb-0 small opacity-75">Monitor and manage all service requests.</p>
        </div>
        <button
          type="button"
          className="btn btn-light btn-sm fw-semibold px-3"
          onClick={loadDashboard}
          data-testid="refresh-dashboard-btn"
        >
          ↻ Refresh
        </button>
      </div>

      {/* 5 Interactive Queue Metric Cards */}
      <div className="row g-3 mb-4">
        {metricCards.map((card) => (
          <div key={card.id} className="col-6 col-md-4 col-lg">
            <div
              role="button"
              tabIndex={0}
              aria-label={`${card.label}: ${card.count}. Activate to filter queue`}
              data-testid={card.id}
              onClick={() => navigate(card.path)}
              onKeyDown={(e) => handleCardKeyDown(e, card.path)}
              className="card card-zen border-0 p-3 h-100 shadow-sm"
              style={{
                cursor: "pointer",
                borderTop: `4px solid ${card.accent}`,
                transition: "transform 0.15s ease",
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fs-3 fw-bold" style={{ color: card.accent }} data-testid={`${card.id}-count`}>
                  {card.count}
                </span>
                <span className="fs-5" aria-hidden="true">
                  {card.icon}
                </span>
              </div>
              <div className="small fw-semibold text-muted">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Administrator Extension: System User Accounts Summary (AC-21) */}
      {data.userStats && (
        <div
          className="card card-zen border-0 p-4 mb-4 shadow-sm"
          data-testid="admin-user-stats-section"
        >
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h2 className="h6 fw-bold mb-0" style={{ color: "var(--color-primary)" }}>
                🛡️ System User Accounts Overview
              </h2>
              <span className="small text-muted">Administrator operational account metrics</span>
            </div>
            <button
              type="button"
              className="btn btn-outline-success btn-sm fw-medium"
              onClick={() => navigate("/admin/users")}
              data-testid="manage-users-link"
            >
              Manage Users &rarr;
            </button>
          </div>
          <div className="row g-3">
            <div className="col-sm-4">
              <div className="p-3 rounded-3 bg-light border text-center">
                <div className="fs-4 fw-bold" data-testid="stat-total-users">
                  {data.userStats.totalUsers}
                </div>
                <div className="small text-muted fw-semibold">Total Users</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="p-3 rounded-3 bg-light border text-center">
                <div className="fs-4 fw-bold text-success" data-testid="stat-active-staff">
                  {data.userStats.activeStaff}
                </div>
                <div className="small text-muted fw-semibold">Active IT Staff &amp; Admins</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="p-3 rounded-3 bg-light border text-center">
                <div className="fs-4 fw-bold text-secondary" data-testid="stat-inactive-users">
                  {data.userStats.inactiveUsers}
                </div>
                <div className="small text-muted fw-semibold">Inactive Accounts</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Section: Recent Queue & Quick Actions */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card card-zen border-0 p-4 h-100 shadow-sm" data-testid="staff-recent-queue">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 fw-bold mb-0">My Recent Tickets</h2>
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none fw-semibold p-0"
                style={{ color: "var(--color-primary)" }}
                onClick={() => navigate("/staff/tickets")}
              >
                View all &rarr;
              </button>
            </div>

            {data.recentQueue.length === 0 ? (
              <p className="text-muted small fst-italic mb-0" data-testid="staff-recent-empty">
                No active tickets currently in the queue.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Ticket No.</th>
                      <th>Summary</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Requester</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentQueue.map((item) => (
                      <tr
                        key={item.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/staff/tickets/${item.id}`)}
                        data-testid={`recent-queue-row-${item.id}`}
                      >
                        <td className="font-monospace fw-semibold" style={{ color: "var(--color-primary)" }}>
                          {item.ticketNumber}
                        </td>
                        <td className="fw-medium">{item.summary}</td>
                        <td>{item.category.name}</td>
                        <td>
                          <Badge type="status" value={item.currentStatus} />
                        </td>
                        <td>
                          <Badge type="priority" value={item.itPriority} />
                        </td>
                        <td>{item.requester.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card card-zen border-0 p-4 h-100 shadow-sm" data-testid="staff-quick-actions">
            <h2 className="h6 fw-bold mb-3">Quick Actions</h2>
            <div className="d-grid gap-2">
              <button
                type="button"
                className="btn btn-primary fw-medium text-start py-2 px-3"
                onClick={() => navigate("/tickets/new")}
                data-testid="quick-action-create-ticket"
              >
                + Create Ticket
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary fw-medium text-start py-2 px-3"
                onClick={() => navigate("/staff/tickets")}
                data-testid="quick-action-search-tickets"
              >
                🔍 Search Tickets
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary fw-medium text-start py-2 px-3"
                onClick={() => navigate("/staff/tickets?owner=mine")}
                data-testid="quick-action-my-queue"
              >
                📋 My Queue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
