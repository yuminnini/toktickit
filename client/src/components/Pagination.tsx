interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1 && total <= pageSize) {
    return null;
  }

  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <nav
      className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 py-3"
      aria-label="Ticket pagination"
    >
      <div className="text-muted small">
        Showing <span className="fw-semibold">{startItem}</span> to{" "}
        <span className="fw-semibold">{endItem}</span> of{" "}
        <span className="fw-semibold">{total}</span> tickets
      </div>

      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          &larr; Previous
        </button>

        <span className="text-muted small px-2">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          Next &rarr;
        </button>
      </div>
    </nav>
  );
}
