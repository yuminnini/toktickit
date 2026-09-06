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
  const [categoryError, setCategoryError] = useState<string | null>(null);
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
  const [pageSize, setPageSize] = useState(10);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load categories with error handling and retry
  const loadCategories = useCallback(() => {
    setCategoryError(null);
    fetchCategories()
      .then((cats) => {
        setCategories(cats);
        setCategoryError(null);
      })
      .catch(() => {
        setCategoryError("Unable to load categories for filtering.");
      });
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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

  const handleHeaderSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCategory !== "" ||
    selectedPriority !== "" ||
    selectedStatus !== "";

  // BR-12: Empty state is strictly when requester has never submitted a ticket (unfilteredTotal === 0)
  const isTrulyEmpty =
    ticketsData !== null &&
    ticketsData.unfilteredTotal === 0;

  // BR-12: No results is when requester has tickets, but active filters match zero
  const isNoResults =
    ticketsData !== null &&
    ticketsData.unfilteredTotal > 0 &&
    ticketsData.total === 0;

  return (
    <div className="zen-container py-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">My Tickets</h1>
          <p className="text-muted mb-0 small">
            View and track your submitted IT support tickets
          </p>
        </div>
        <button
          type="button"
          className="btn-zen-primary d-inline-flex align-items-center gap-2"
          onClick={() => navigate("/tickets/new")}
        >
          <span className="fw-bold">+</span> Create Ticket
        </button>
      </div>

      {/* Category Load Error Warning */}
      {categoryError && (
        <div className="alert alert-warning py-2 px-3 mb-3 d-flex justify-content-between align-items-center small" role="alert">
          <span>⚠️ {categoryError}</span>
          <button
            type="button"
            className="btn btn-outline-warning btn-sm text-dark"
            onClick={loadCategories}
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Controls Bar */}
      <div className="zen-card mb-4">
        <div className="row g-2 align-items-end">
          {/* Search Input */}
          <div className="col-12 col-md-4">
            <label htmlFor="ticket-search-input" className="form-label small fw-semibold text-muted">
              Search
            </label>
            <input
              id="ticket-search-input"
              type="search"
              className="form-control form-control-zen"
              placeholder="Search by ticket number or summary…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Category Filter */}
          <div className="col-6 col-sm-3 col-lg-2">
            <label htmlFor="ticket-category-filter" className="form-label small fw-semibold text-muted">
              Category
            </label>
            <select
              id="ticket-category-filter"
              className="form-select form-control-zen"
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

          {/* Priority Filter */}
          <div className="col-6 col-sm-3 col-lg-2">
            <label htmlFor="ticket-prio-filter" className="form-label small fw-semibold text-muted">
              Priority
            </label>
            <select
              id="ticket-prio-filter"
              className="form-select form-control-zen"
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
          <div className="col-6 col-sm-3 col-lg-2">
            <label htmlFor="ticket-status-filter" className="form-label small fw-semibold text-muted">
              Status
            </label>
            <select
              id="ticket-status-filter"
              className="form-select form-control-zen"
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
          <div className="col-6 col-sm-3 col-lg-2">
            <label htmlFor="ticket-sort-select" className="form-label small fw-semibold text-muted">
              Sort By
            </label>
            <select
              id="ticket-sort-select"
              className="form-select form-control-zen"
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
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="ticketNumber-asc">Ticket # (Asc)</option>
              <option value="ticketNumber-desc">Ticket # (Desc)</option>
              <option value="requestedPriority-desc">Priority</option>
              <option value="currentStatus-asc">Status (A-Z)</option>
              <option value="currentStatus-desc">Status (Z-A)</option>
            </select>
          </div>

          {/* Page Size */}
          <div className="col-6 col-sm-3 col-lg-1">
            <label htmlFor="ticket-pagesize-select" className="form-label small fw-semibold text-muted">
              Per Page
            </label>
            <select
              id="ticket-pagesize-select"
              className="form-select form-control-zen"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Clear Filters in Toolbar */}
          <div className="col-6 col-sm-3 col-lg-1 d-flex align-items-end">
            <button
              type="button"
              className="btn-zen-secondary w-100 clear-filters-btn"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              title="Reset all search and filter parameters"
              style={{ padding: "0.375rem 0.5rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && !ticketsData && (
        <div className="text-center py-5" role="status">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading tickets…</span>
          </div>
          <p className="text-muted mt-2 small">Loading your tickets…</p>
        </div>
      )}

      {/* Error state: Replaces the table per ui-spec.md and review feedback */}
      {error && (
        <div className="zen-card py-5 text-center my-3" role="alert">
          <div className="alert alert-danger d-inline-flex flex-column align-items-center gap-3 p-4 mb-0" style={{ maxWidth: "480px" }}>
            <div className="fw-semibold">Unable to load your tickets</div>
            <div className="small text-muted">{error}</div>
            <button
              type="button"
              className="btn-zen-primary btn-sm"
              onClick={loadTickets}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty State (AC-07 / BR-12) - Shown only when no error and never had tickets */}
      {!error && isTrulyEmpty && !loading && (
        <div className="zen-card text-center py-5 empty-state">
          <div className="mb-3 text-muted" style={{ fontSize: "2.5rem" }}>
            📋
          </div>
          <h2 className="h5 mb-2">No tickets yet</h2>
          <p className="text-muted mb-4 small" style={{ maxWidth: "420px", margin: "0 auto" }}>
            You haven't submitted any support tickets yet. Need help with hardware, software, or access?
          </p>
          <button
            type="button"
            className="btn-zen-primary create-ticket-cta"
            onClick={() => navigate("/tickets/new")}
          >
            Create Your First Ticket
          </button>
        </div>
      )}

      {/* No Results State (AC-08 / BR-12) - Shown only when no error, has tickets overall, but filter yields 0 */}
      {!error && isNoResults && !loading && (
        <div className="zen-card text-center py-5 no-results-state">
          <div className="mb-3 text-muted" style={{ fontSize: "2.5rem" }}>
            🔍
          </div>
          <h2 className="h5 mb-2">No tickets found</h2>
          <p className="text-muted mb-4 small">
            No tickets matched your active search or filters. Try adjusting or clearing them.
          </p>
          <button
            type="button"
            className="btn-zen-secondary clear-filters-cta"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Ticket List Display (Desktop: Table ≥992px, Mobile/Tablet: Cards <992px) */}
      {!error && ticketsData && ticketsData.data.length > 0 && (
        <div className="zen-card p-0 overflow-hidden">
          {/* Desktop Table (≥992px per ui-spec.md §8) */}
          <div className="d-none d-lg-block">
            <TicketTable
              tickets={ticketsData.data}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleHeaderSort}
            />
          </div>

          {/* Tablet/Mobile Stacked Cards (<992px per ui-spec.md §8) */}
          <div className="d-lg-none p-3">
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
