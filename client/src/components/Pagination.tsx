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
  if (total <= 0) {
    return null;
  }

  const effectiveTotalPages = Math.max(1, totalPages);
  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  // Generate page numbers
  const pages: number[] = [];
  for (let i = 1; i <= effectiveTotalPages; i++) {
    pages.push(i);
  }

  return (
    <nav
      className="zen-pagination-container"
      aria-label="Ticket pagination"
    >
      <div className="text-muted small">
        Showing <span className="fw-semibold text-dark">{startItem}</span> to{" "}
        <span className="fw-semibold text-dark">{endItem}</span> of{" "}
        <span className="fw-semibold text-dark">{total}</span> tickets
      </div>

      <div className="d-flex align-items-center gap-2 flex-wrap">
        <button
          type="button"
          className="zen-page-nav-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          &#9668; Previous
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`zen-page-btn ${p === currentPage ? "active" : ""}`}
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="zen-page-nav-btn"
          disabled={currentPage >= effectiveTotalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          Next &#9658;
        </button>
      </div>
    </nav>
  );
}
