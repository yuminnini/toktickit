import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import {
  fetchTickets,
  fetchCategories,
  Category,
  TicketListResponse,
  PriorityType,
  TicketStatusType,
} from "../api";
import TicketTable from "../components/TicketTable";
import TicketCard from "../components/TicketCard";
import Pagination from "../components/Pagination";

export default function MyTickets() {
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketsData, setTicketsData] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and pagination state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<PriorityType | "">("");
  const [selectedStatus, setSelectedStatus] = useState<TicketStatusType | "">("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load categories once
  useEffect(() => {
    fetchCategories()
      .then((cats) => setCategories(cats))
      .catch(() => {});
  }, []);

  // Reset when requester changes (Peer review #4)
  useEffect(() => {
    setTicketsData(null);
    setPage(1);
    setSearch("");
    setSelectedCategory("");
    setSelectedPriority("");
    setSelectedStatus("");
  }, [requester?.id]);

  // Load tickets function
  const loadTickets = useCallback(() => {
    if (!requester?.id) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    fetchTickets(
      {
        requesterId: requester.id,
        search: search.trim() || undefined,
        categoryId: selectedCategory ? Number(selectedCategory) : undefined,
        requestedPriority: selectedPriority || undefined,
        status: selectedStatus || undefined,
        sort: sortField,
        order: sortOrder,
        page,
        pageSize,
      },
      controller.signal
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setTicketsData(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message || "Failed to load tickets");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, [
    requester?.id,
    search,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    sortField,
    sortOrder,
    page,
    pageSize,
  ]);

  useEffect(() => {
    loadTickets();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadTickets]);

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedPriority("");
    setSelectedStatus("");
    setSortField("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCategory !== "" ||
    selectedPriority !== "" ||
    selectedStatus !== "";

  const isTrulyEmpty =
    ticketsData !== null &&
    ticketsData.unfilteredTotal === 0 &&
    !hasActiveFilters;

  const isNoResults =
    ticketsData !== null &&
    ticketsData.total === 0 &&
    (hasActiveFilters || ticketsData.unfilteredTotal > 0);

  return (
    <div className="container py-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">My Tickets</h1>
          <p className="text-muted mb-0">
            View and track your submitted IT support tickets
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          onClick={() => navigate("/tickets/new")}
        >
          <span className="fw-bold">+</span> Create Ticket
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card shadow-sm border mb-4">
        <div className="card-body">
          <div className="row g-3">
            {/* Search */}
            <div className="col-12 col-md-4">
              <label htmlFor="ticket-search" className="form-label small fw-semibold text-muted">
                Search
              </label>
              <input
                id="ticket-search"
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by ticket number or summary…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Category */}
            <div className="col-6 col-md-2">
              <label htmlFor="ticket-cat-filter" className="form-label small fw-semibold text-muted">
                Category
              </label>
              <select
                id="ticket-cat-filter"
                className="form-select form-select-sm"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="col-6 col-md-2">
              <label htmlFor="ticket-prio-filter" className="form-label small fw-semibold text-muted">
                Priority
              </label>
              <select
                id="ticket-prio-filter"
                className="form-select form-select-sm"
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value as PriorityType | "");
                  setPage(1);
                }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Status */}
            <div className="col-6 col-md-2">
              <label htmlFor="ticket-status-filter" className="form-label small fw-semibold text-muted">
                Status
              </label>
              <select
                id="ticket-status-filter"
                className="form-select form-select-sm"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as TicketStatusType | "");
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Sort */}
            <div className="col-6 col-md-2">
              <label htmlFor="ticket-sort-select" className="form-label small fw-semibold text-muted">
                Sort By
              </label>
              <select
                id="ticket-sort-select"
                className="form-select form-select-sm"
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, ord] = e.target.value.split("-");
                  setSortField(field);
                  setSortOrder(ord as "asc" | "desc");
                  setPage(1);
                }}
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="ticketNumber-asc">Ticket # (Asc)</option>
                <option value="ticketNumber-desc">Ticket # (Desc)</option>
                <option value="requestedPriority-desc">Priority</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && !ticketsData && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading tickets…</span>
          </div>
          <p className="text-muted mt-2">Loading your tickets…</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <div>{error}</div>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={loadTickets}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State (AC-07 / BR-12) */}
      {isTrulyEmpty && !loading && (
        <div className="card shadow-sm border text-center py-5 empty-state">
          <div className="card-body">
            <div className="mb-3 text-muted" style={{ fontSize: "2.5rem" }}>
              📋
            </div>
            <h5 className="fw-bold mb-2">No tickets yet</h5>
            <p className="text-muted mb-4" style={{ maxWidth: "420px", margin: "0 auto" }}>
              You haven't submitted any support tickets yet. Need help with hardware, software, or access?
            </p>
            <button
              type="button"
              className="btn btn-primary create-ticket-cta"
              onClick={() => navigate("/tickets/new")}
            >
              Create Your First Ticket
            </button>
          </div>
        </div>
      )}

      {/* No Results State (AC-08 / BR-12) */}
      {isNoResults && !loading && (
        <div className="card shadow-sm border text-center py-5 no-results-state">
          <div className="card-body">
            <div className="mb-3 text-muted" style={{ fontSize: "2.5rem" }}>
              🔍
            </div>
            <h5 className="fw-bold mb-2">No tickets found</h5>
            <p className="text-muted mb-4">
              No tickets matched your active search or filters. Try adjusting or clearing them.
            </p>
            <button
              type="button"
              className="btn btn-outline-secondary clear-filters-cta"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Ticket List Display */}
      {ticketsData && ticketsData.data.length > 0 && (
        <div className="card shadow-sm border">
          {/* Desktop & Tablet Table */}
          <div className="d-none d-md-block">
            <TicketTable tickets={ticketsData.data} />
          </div>

          {/* Mobile Card List */}
          <div className="d-md-none p-3">
            <TicketCard tickets={ticketsData.data} />
          </div>

          {/* Pagination Footer */}
          <div className="px-3 border-top">
            <Pagination
              currentPage={ticketsData.page}
              totalPages={ticketsData.totalPages}
              total={ticketsData.total}
              pageSize={ticketsData.pageSize}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
