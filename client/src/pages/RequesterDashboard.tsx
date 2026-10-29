import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRequesterDashboard, RequesterDashboardResponse } from "../api";
import { useAuth } from "../context/AuthContext";
import { useRequester } from "../context/RequesterContext";
import Badge from "../components/Badge";

export default function RequesterDashboard() {
  const { user } = useAuth();
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRequesterDashboard();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Unable to load requester dashboard");
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
      <div className="zen-container py-5 text-center" role="status" data-testid="requester-dashboard-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
        <p className="text-muted mt-2 small">Loading your ticket overview...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="zen-container py-5" data-testid="requester-dashboard-error">
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{error || "Failed to load dashboard."}</span>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const openCount =
    data.byStatus.NEW +
    data.byStatus.OPEN +
    data.byStatus.IN_PROGRESS +
    data.byStatus.WAITING_FOR_REQUESTER +
    data.byStatus.REOPENED;

  const metricCards = [
    {
      id: "req-metric-open",
      label: "My Open Tickets",
      count: openCount,
      path: "/my-tickets",
      accent: "#006B3C",
      icon: "📂",
    },
    {
      id: "req-metric-in-progress",
      label: "In Progress",
      count: data.byStatus.IN_PROGRESS,
      path: "/my-tickets?status=IN_PROGRESS",
      accent: "#8C4A00",
      icon: "⚙️",
    },
    {
      id: "req-metric-resolved",
      label: "Resolved",
      count: data.byStatus.RESOLVED,
      path: "/my-tickets?status=RESOLVED",
      accent: "#0B7A46",
      icon: "✓",
    },
    {
      id: "req-metric-closed",
      label: "Closed",
      count: data.byStatus.CLOSED,
      path: "/my-tickets?status=CLOSED",
      accent: "#5A6B63",
      icon: "🔒",
    },
  ];

  const displayName = user?.name || requester?.name || "Requester";

  return (
    <div className="zen-container py-4" data-testid="requester-dashboard">
      {/* Welcome Banner */}
      <div
        className="p-4 rounded-3 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3 text-white shadow-sm"
        style={{ background: "linear-gradient(135deg, #006B3C 0%, #0B7A46 100%)" }}
      >
        <div>
          <h1 className="h4 fw-bold mb-1">Welcome, {displayName}!</h1>
          <p className="mb-0 small opacity-75">How can we help you today?</p>
        </div>
        <button
          type="button"
          className="btn btn-light btn-sm fw-semibold px-3"
          onClick={loadDashboard}
          data-testid="refresh-requester-dashboard-btn"
        >
          ↻ Refresh
        </button>
      </div>

      {/* 4 Interactive Metric Cards */}
      <div className="row g-3 mb-4">
        {metricCards.map((card) => (
          <div key={card.id} className="col-6 col-md-3">
            <div
              role="button"
              tabIndex={0}
              aria-label={`${card.label}: ${card.count}. Activate to view tickets`}
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

      {/* Bottom Section: Recent Tickets & Quick Actions */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card card-zen border-0 p-4 h-100 shadow-sm" data-testid="requester-recent-tickets">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h6 fw-bold mb-0">My Recent Tickets</h2>
              <button
                type="button"
                className="btn btn-link btn-sm text-decoration-none fw-semibold p-0"
                style={{ color: "var(--color-primary)" }}
                onClick={() => navigate("/my-tickets")}
              >
                View all &rarr;
              </button>
            </div>

            {data.recentlyUpdated.length === 0 ? (
              <div className="text-center py-4" data-testid="requester-empty-state">
                <p className="text-muted small mb-3">
                  You have not submitted any tickets yet. Need IT assistance?
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4 fw-medium"
                  onClick={() => navigate("/tickets/new")}
                  data-testid="empty-submit-ticket-btn"
                >
                  + Submit a Ticket
                </button>
              </div>
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
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentlyUpdated.map((item) => (
                      <tr
                        key={item.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/tickets/${item.id}`)}
                        data-testid={`requester-recent-row-${item.id}`}
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
                          <Badge type="priority" value={item.requestedPriority} />
                        </td>
                        <td className="text-muted">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card card-zen border-0 p-4 h-100 shadow-sm" data-testid="requester-quick-actions">
            <h2 className="h6 fw-bold mb-3">Quick Actions</h2>
            <div className="d-grid gap-2">
              <button
                type="button"
                className="btn btn-primary fw-medium text-start py-2 px-3"
                onClick={() => navigate("/tickets/new")}
                data-testid="req-quick-create-ticket"
              >
                + Create Ticket
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary fw-medium text-start py-2 px-3"
                onClick={() => navigate("/my-tickets")}
                data-testid="req-quick-view-tickets"
              >
                📋 View My Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
