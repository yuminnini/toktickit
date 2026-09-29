import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchStaffTickets,
  fetchCategories,
  Category,
  StaffQueueResponse,
  PriorityType,
  TicketStatusType,
} from "../api";
import { useAuth } from "../context/AuthContext";
import Badge from "../components/Badge";
import Pagination from "../components/Pagination";

export default function StaffQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [queueData, setQueueData] = useState<StaffQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedReqPriority, setSelectedReqPriority] = useState<PriorityType | "">("");
  const [selectedItPriority, setSelectedItPriority] = useState<PriorityType | "">("");
  const [selectedStatus, setSelectedStatus] = useState<TicketStatusType | "">("");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "unassigned" | "mine">("all");

  // Sorting & Pagination state
  const [sortField, setSortField] = useState<
    "ticketNumber" | "updatedAt" | "requestedPriority" | "itPriority" | "currentStatus"
  >("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load categories for filter
  useEffect(() => {
    fetchCategories()
      .then((cats) => setCategories(cats))
      .catch(() => {});
  }, []);

  const loadQueue = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    fetchStaffTickets(
      {
        search: search.trim() || undefined,
        categoryId: selectedCategory ? Number(selectedCategory) : undefined,
        requestedPriority: selectedReqPriority || undefined,
        itPriority: selectedItPriority || undefined,
        status: selectedStatus || undefined,
        owner: ownerFilter,
        sort: sortField,
        order: sortOrder,
        page,
        pageSize,
      },
      controller.signal
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setQueueData(data);
        }
      })
      .catch((err: any) => {
        if (!controller.signal.aborted) {
          setError(err.message || "Failed to load staff tickets");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, [
    search,
    selectedCategory,
    selectedReqPriority,
    selectedItPriority,
    selectedStatus,
    ownerFilter,
    sortField,
    sortOrder,
    page,
    pageSize,
  ]);

  useEffect(() => {
    loadQueue();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadQueue]);

  // Handle filter changes (resets page to 1)
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setPage(1);
  };

  const handleReqPriorityChange = (val: PriorityType | "") => {
    setSelectedReqPriority(val);
    setPage(1);
  };

  const handleItPriorityChange = (val: PriorityType | "") => {
    setSelectedItPriority(val);
    setPage(1);
  };

  const handleStatusChange = (val: TicketStatusType | "") => {
    setSelectedStatus(val);
    setPage(1);
  };

  const handleOwnerFilterChange = (val: "all" | "unassigned" | "mine") => {
    setOwnerFilter(val);
    setPage(1);
  };

  const handlePageSizeChange = (val: number) => {
    setPageSize(val);
    setPage(1);
  };

  const handleSortChange = (
    field: "ticketNumber" | "updatedAt" | "requestedPriority" | "itPriority" | "currentStatus"
  ) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "updatedAt" ? "desc" : "asc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedReqPriority("");
    setSelectedItPriority("");
    setSelectedStatus("");
    setOwnerFilter("all");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedCategory ||
      selectedReqPriority ||
      selectedItPriority ||
      selectedStatus ||
      ownerFilter !== "all"
  );

  return (
    <div className="zen-container py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-primary)" }}>
            IT Staff Ticket Queue
          </h1>
          <p className="text-muted small mb-0">
            Triage, assign, and manage support tickets across all systems
          </p>
        </div>
        {queueData && (
          <div className="badge bg-light text-dark border px-3 py-2 fs-6" data-testid="queue-total-count">
            Total in view: <strong>{queueData.total}</strong>
          </div>
        )}
      </div>

      {/* Filters Card */}
      <div className="card p-3 mb-4 shadow-sm" style={{ backgroundColor: "var(--color-surface)" }}>
        {/* Top Row: Search and Ownership Tabs */}
        <div className="row g-3 mb-3 align-items-center">
          <div className="col-12 col-md-6">
            <label htmlFor="staff-search-input" className="form-label small fw-semibold">
              Search Tickets
            </label>
            <div className="input-group">
              <input
                id="staff-search-input"
                type="text"
                className="form-control"
                placeholder="Search ticket number or summary..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                maxLength={150}
              />
              {search && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => handleSearchChange("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold d-block">Owner Assignment</label>
            <div className="btn-group w-100" role="group" aria-label="Filter by owner">
              <button
                type="button"
                className={`btn btn-sm ${ownerFilter === "all" ? "btn-zen-primary" : "btn-outline-secondary"}`}
                onClick={() => handleOwnerFilterChange("all")}
                data-testid="owner-filter-all"
              >
                All Tickets
              </button>
              <button
                type="button"
                className={`btn btn-sm ${ownerFilter === "unassigned" ? "btn-zen-primary" : "btn-outline-secondary"}`}
                onClick={() => handleOwnerFilterChange("unassigned")}
                data-testid="owner-filter-unassigned"
              >
                Unassigned
              </button>
              <button
                type="button"
                className={`btn btn-sm ${ownerFilter === "mine" ? "btn-zen-primary" : "btn-outline-secondary"}`}
                onClick={() => handleOwnerFilterChange("mine")}
                data-testid="owner-filter-mine"
              >
                Assigned to Me
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Row: Select Filters */}
        <div className="row g-3 align-items-end">
          <div className="col-6 col-md-3">
            <label htmlFor="staff-filter-category" className="form-label small fw-semibold">
              Category
            </label>
            <select
              id="staff-filter-category"
              className="form-select form-select-sm"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label htmlFor="staff-filter-req-priority" className="form-label small fw-semibold">
              Req. Priority
            </label>
            <select
              id="staff-filter-req-priority"
              className="form-select form-select-sm"
              value={selectedReqPriority}
              onChange={(e) => handleReqPriorityChange(e.target.value as PriorityType | "")}
            >
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label htmlFor="staff-filter-it-priority" className="form-label small fw-semibold">
              IT Priority
            </label>
            <select
              id="staff-filter-it-priority"
              className="form-select form-select-sm"
              value={selectedItPriority}
              onChange={(e) => handleItPriorityChange(e.target.value as PriorityType | "")}
            >
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="col-6 col-md-3">
            <label htmlFor="staff-filter-status" className="form-label small fw-semibold">
              Status
            </label>
            <select
              id="staff-filter-status"
              className="form-select form-select-sm"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as TicketStatusType | "")}
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
              <option value="REOPENED">Reopened</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="col-12 col-md-2 d-flex gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm w-100"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="zen-card text-center py-5" role="status" data-testid="queue-loading">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading queue…</span>
          </div>
          <p className="text-muted mt-3 small">Loading queue tickets…</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="alert alert-danger p-4 mb-4" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong className="d-block mb-1">Unable to load ticket queue</strong>
              <span className="small">{error}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={loadQueue}
              data-testid="queue-retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty States */}
      {!loading && !error && queueData && queueData.data.length === 0 && (
        <div className="zen-card text-center py-5" data-testid="queue-empty-state">
          <div className="mb-3 text-muted" style={{ fontSize: "2.5rem" }}>
            {hasActiveFilters ? "🔍" : "📭"}
          </div>
          <h2 className="h5 fw-bold mb-2">
            {hasActiveFilters ? "No tickets match your criteria" : "Queue is empty"}
          </h2>
          <p className="text-muted small mb-3" style={{ maxWidth: "400px", margin: "0 auto" }}>
            {hasActiveFilters
              ? "Try adjusting your search terms, status, or priority filters to find what you need."
              : "There are currently no tickets in the queue matching this view."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-zen-secondary btn-sm"
              onClick={clearFilters}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Data Available */}
      {!loading && !error && queueData && queueData.data.length > 0 && (
        <>
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="d-none d-md-block table-responsive mb-4 shadow-sm rounded border">
            <table className="table table-hover align-middle mb-0" style={{ backgroundColor: "var(--color-surface)" }}>
              <thead className="table-light">
                <tr>
                  <th scope="col" style={{ cursor: "pointer", width: "30%" }} onClick={() => handleSortChange("ticketNumber")}>
                    Ticket / Summary {sortField === "ticketNumber" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col">Category</th>
                  <th scope="col" style={{ cursor: "pointer" }} onClick={() => handleSortChange("requestedPriority")}>
                    Req. Prio {sortField === "requestedPriority" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col" style={{ cursor: "pointer" }} onClick={() => handleSortChange("itPriority")}>
                    IT Prio {sortField === "itPriority" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col" style={{ cursor: "pointer" }} onClick={() => handleSortChange("currentStatus")}>
                    Status {sortField === "currentStatus" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col">Owner</th>
                  <th scope="col" style={{ cursor: "pointer" }} onClick={() => handleSortChange("updatedAt")}>
                    Updated {sortField === "updatedAt" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col" className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {queueData.data.map((t) => (
                  <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/staff/tickets/${t.id}`)}>
                    <td>
                      <div className="fw-bold font-monospace small" style={{ color: "var(--color-primary)" }}>
                        {t.ticketNumber}
                      </div>
                      <div className="text-truncate small" style={{ maxWidth: "320px" }} title={t.summary}>
                        {t.summary}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border small">{t.category.name}</span>
                    </td>
                    <td>
                      <Badge type="priority" value={t.requestedPriority} />
                    </td>
                    <td>
                      <Badge type="priority" value={t.itPriority} />
                    </td>
                    <td>
                      <Badge type="status" value={t.currentStatus} />
                    </td>
                    <td>
                      {t.ticketOwner ? (
                        <span className="small fw-semibold">{t.ticketOwner.name}</span>
                      ) : (
                        <span className="badge bg-warning text-dark border small">Unassigned</span>
                      )}
                    </td>
                    <td className="small text-muted">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-zen-primary btn-sm px-3"
                        onClick={() => navigate(`/staff/tickets/${t.id}`)}
                        aria-label={`Open ticket ${t.ticketNumber}`}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (Hidden on desktop) */}
          <div className="d-md-none d-flex flex-column gap-3 mb-4">
            {queueData.data.map((t) => (
              <div
                key={t.id}
                className="card p-3 shadow-sm border"
                style={{ backgroundColor: "var(--color-surface)" }}
                onClick={() => navigate(`/staff/tickets/${t.id}`)}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="font-monospace fw-bold" style={{ color: "var(--color-primary)" }}>
                    {t.ticketNumber}
                  </span>
                  <Badge type="status" value={t.currentStatus} />
                </div>
                <h2 className="h6 fw-semibold mb-2">{t.summary}</h2>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-light text-muted border">{t.category.name}</span>
                  <Badge type="priority" value={t.itPriority} />
                  {t.ticketOwner ? (
                    <span className="badge bg-light text-dark border">👤 {t.ticketOwner.name}</span>
                  ) : (
                    <span className="badge bg-warning text-dark border">Unassigned</span>
                  )}
                </div>
                <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                  <span className="small text-muted">{new Date(t.updatedAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    className="btn btn-zen-primary btn-sm px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/staff/tickets/${t.id}`);
                    }}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="staff-page-size" className="small text-muted text-nowrap">
                Per page:
              </label>
              <select
                id="staff-page-size"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <Pagination
              currentPage={page}
              totalPages={queueData.totalPages}
              total={queueData.total}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </>
      )}
    </div>
  );
}
