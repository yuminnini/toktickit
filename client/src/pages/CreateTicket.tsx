import { useState, useEffect, useRef, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  Category,
  RelatedSystem,
  PriorityType,
  TicketItem,
} from "../api";
import { useRequester } from "../context/RequesterContext";

export default function CreateTicket() {
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [requestedPriority, setRequestedPriority] = useState<PriorityType>("MEDIUM");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<TicketItem | null>(null);

  const summaryInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const categorySelectRef = useRef<HTMLSelectElement>(null);
  const relatedSystemSelectRef = useRef<HTMLSelectElement>(null);

  const [isRefLoading, setIsRefLoading] = useState(true);
  const [refError, setRefError] = useState(false);

  const loadReferenceData = () => {
    setIsRefLoading(true);
    setRefError(false);
    Promise.all([fetchCategories(), fetchRelatedSystems()])
      .then(([cats, sys]) => {
        setCategories(cats);
        setRelatedSystems(sys);
      })
      .catch(() => {
        setRefError(true);
      })
      .finally(() => {
        setIsRefLoading(false);
      });
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  // Auto-select first category and system when loaded if not yet set
  useEffect(() => {
    if (categories.length > 0 && categoryId === "") {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (relatedSystems.length > 0 && relatedSystemId === "") {
      setRelatedSystemId(relatedSystems[0].id);
    }
  }, [relatedSystems, relatedSystemId]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!categoryId) {
      newErrors.categoryId = "Please select a Category";
    }
    if (!relatedSystemId) {
      newErrors.relatedSystemId = "Please select a Related System";
    }

    const trimmedSummary = summary.trim();
    if (trimmedSummary.length === 0) {
      newErrors.summary = "Summary is required";
    } else if (trimmedSummary.length > 150) {
      newErrors.summary = "Summary must be 150 characters or fewer";
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length === 0) {
      newErrors.description = "Description is required";
    } else if (trimmedDescription.length > 2000) {
      newErrors.description = "Description must be 2000 characters or fewer";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Focus first invalid field per UI spec
      if (newErrors.summary && summaryInputRef.current) {
        summaryInputRef.current.focus();
      } else if (newErrors.description && descriptionInputRef.current) {
        descriptionInputRef.current.focus();
      } else if (newErrors.categoryId && categorySelectRef.current) {
        categorySelectRef.current.focus();
      } else if (newErrors.relatedSystemId && relatedSystemSelectRef.current) {
        relatedSystemSelectRef.current.focus();
      }
      return false;
    }

    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    if (!requester) {
      navigate("/requester-selection");
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = await createTicket({
        requesterId: requester.id,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        summary: summary.trim(),
        description: description.trim(),
        requestedPriority,
      });
      setCreatedTicket(ticket);
    } catch (err: any) {
      setApiError(err.message || "Unable to save your ticket. Please try again.");
      if (err.fields) {
        setErrors(err.fields);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCreateAnother() {
    setCreatedTicket(null);
    setSummary("");
    setDescription("");
    setErrors({});
    setApiError(null);
  }

  if (createdTicket) {
    return (
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <div
          className="card p-4 shadow-sm text-center"
          style={{
            backgroundColor: "var(--color-pale-green)",
            borderColor: "var(--color-secondary)",
          }}
        >
          <div className="display-6 mb-3">✅</div>
          <h2 className="h4 mb-2" style={{ color: "var(--color-primary)" }}>
            Ticket Submitted Successfully!
          </h2>
          <p className="text-muted mb-3">Your official Ticket Number has been generated:</p>
          <div className="display-6 fw-bold mb-4" style={{ color: "var(--color-primary)" }}>
            {createdTicket.ticketNumber}
          </div>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/my-tickets" className="btn btn-success">
              View My Tickets
            </Link>
            <button className="btn btn-outline-secondary" onClick={handleCreateAnother}>
              Create Another Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-2" style={{ maxWidth: 720 }}>
      <h1 className="h4 mb-3" style={{ color: "var(--color-primary)" }}>
        Create Ticket
      </h1>

      {apiError && (
        <div className="alert alert-danger mb-4" role="alert">
          {apiError}
        </div>
      )}

      {refError && (
        <div className="alert alert-warning mb-4 d-flex justify-content-between align-items-center" role="alert">
          <span>Unable to load Categories or Related Systems.</span>
          <button className="btn btn-outline-warning btn-sm text-dark" onClick={loadReferenceData}>
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Read-only Context Row */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold text-muted small">Ticket Date</label>
            <input
              type="text"
              className="form-control"
              style={{ backgroundColor: "var(--color-readonly-bg)", cursor: "default" }}
              value="Assigned on creation"
              readOnly
              disabled
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold text-muted small">Requester</label>
            <input
              type="text"
              className="form-control"
              style={{ backgroundColor: "var(--color-readonly-bg)", cursor: "default" }}
              value={requester ? requester.name : ""}
              readOnly
              disabled
            />
          </div>
        </div>

        {/* Classification Group */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label htmlFor="categoryId" className="form-label fw-semibold">
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="categoryId"
              ref={categorySelectRef}
              className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              aria-describedby={errors.categoryId ? "categoryId-error" : undefined}
              disabled={isRefLoading || refError}
            >
              <option value="" disabled>{isRefLoading ? "Loading..." : "Select Category"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <div id="categoryId-error" className="invalid-feedback d-block small" role="alert">
                {errors.categoryId}
              </div>
            )}
          </div>

          <div className="col-md-6">
            <label htmlFor="relatedSystemId" className="form-label fw-semibold">
              Related System <span className="text-danger">*</span>
            </label>
            <select
              id="relatedSystemId"
              ref={relatedSystemSelectRef}
              className={`form-select ${errors.relatedSystemId ? "is-invalid" : ""}`}
              value={relatedSystemId}
              onChange={(e) => setRelatedSystemId(Number(e.target.value))}
              aria-describedby={errors.relatedSystemId ? "relatedSystemId-error" : undefined}
              disabled={isRefLoading || refError}
            >
              <option value="" disabled>{isRefLoading ? "Loading..." : "Select System"}</option>
              {relatedSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.relatedSystemId && (
              <div id="relatedSystemId-error" className="invalid-feedback d-block small" role="alert">
                {errors.relatedSystemId}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mb-3">
          <label htmlFor="summary" className="form-label fw-semibold">
            Summary <span className="text-danger">*</span>
          </label>
          <input
            id="summary"
            ref={summaryInputRef}
            type="text"
            className={`form-control ${errors.summary ? "is-invalid" : ""}`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={150}
            placeholder="Brief description of the problem (max 150 chars)"
            aria-describedby={errors.summary ? "summary-error" : undefined}
          />
          {errors.summary && (
            <div id="summary-error" className="invalid-feedback d-block small" role="alert">
              ⚠️ {errors.summary}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mb-3">
          <label htmlFor="description" className="form-label fw-semibold">
            Description <span className="text-danger">*</span>
          </label>
          <textarea
            id="description"
            ref={descriptionInputRef}
            rows={5}
            className={`form-control ${errors.description ? "is-invalid" : ""}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            placeholder="Detailed description of what occurred, steps to reproduce, etc."
            aria-describedby={errors.description ? "description-error" : undefined}
          />
          {errors.description && (
            <div id="description-error" className="invalid-feedback d-block small" role="alert">
              ⚠️ {errors.description}
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="mb-4">
          <label htmlFor="requestedPriority" className="form-label fw-semibold">
            Requested Priority
          </label>
          <select
            id="requestedPriority"
            className="form-select"
            value={requestedPriority}
            onChange={(e) => setRequestedPriority(e.target.value as PriorityType)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        {/* Form Actions */}
        <div className="d-flex justify-content-end gap-2 pt-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate("/my-tickets")}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-success"
            style={{ backgroundColor: "var(--color-primary)", borderColor: "var(--color-primary)" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting…
              </>
            ) : (
              "Submit Ticket"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
