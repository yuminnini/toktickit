import React, { useState, useEffect, useCallback } from "react";
import { CommunicationEntry, fetchTicketNotes, createTicketNote } from "../api";
import Badge from "./Badge";

interface InternalNotesSectionProps {
  ticketId: number;
  canCreateNote: boolean;
}

export default function InternalNotesSection({ ticketId, canCreateNote }: InternalNotesSectionProps) {
  const [notes, setNotes] = useState<CommunicationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTicketNotes(ticketId);
      setNotes(data);
    } catch (err: any) {
      setError(err.message || "Unable to load internal notes");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setFormError("Internal note cannot be empty");
      return;
    }
    if (trimmed.length > 2000) {
      setFormError("Internal note exceeds 2000 characters limit");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const newNote = await createTicketNote(ticketId, trimmed);
      setNotes((prev) => [...prev, newNote]);
      setContent("");
    } catch (err: any) {
      setFormError(err.message || "Failed to post internal note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="card p-3 p-md-4 mb-4 border-warning"
      style={{ backgroundColor: "rgba(254, 243, 199, 0.25)" }}
      aria-labelledby="internal-notes-heading"
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 id="internal-notes-heading" className="h5 mb-0 fw-bold text-dark">
          Internal Notes ({notes.length})
        </h2>
        <span
          className="badge bg-warning text-dark border border-warning fw-semibold px-2 py-1"
          data-testid="private-notes-label"
        >
          🔒 Private - IT Staff & Admin Only
        </span>
      </div>

      {loading && (
        <div className="py-3 text-center text-muted" role="status">
          <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Loading internal notes...
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 ms-2"
            onClick={loadNotes}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && notes.length === 0 && (
        <p className="text-muted fst-italic my-2">No internal notes yet.</p>
      )}

      {!loading && notes.length > 0 && (
        <div className="notes-list d-flex flex-column gap-3 mb-4">
          {notes.map((n) => (
            <div
              key={n.id}
              className="p-3 rounded border"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">{n.author.name}</span>
                  <Badge type="role" value={n.author.role} />
                </div>
                <time className="small text-muted" dateTime={n.createdAt}>
                  {new Date(n.createdAt).toLocaleString()}
                </time>
              </div>
              <p
                className="mb-0 text-break"
                style={{
                  whiteSpace: "pre-wrap",
                  color: "var(--color-text)",
                  fontFamily: "inherit",
                }}
              >
                {n.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {canCreateNote ? (
        <form onSubmit={handleSubmit} className="mt-2">
          {formError && (
            <div className="alert alert-danger py-2 mb-2" role="alert">
              {formError}
            </div>
          )}
          <div className="mb-2">
            <label htmlFor="internal-note-input" className="form-label small fw-semibold">
              Add Internal Note (Hidden from requester)
            </label>
            <textarea
              id="internal-note-input"
              className="form-control"
              rows={3}
              placeholder="Type technical observations, vendor updates, or internal remarks..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
              maxLength={2000}
              required
            />
            <div className="d-flex justify-content-between align-items-center mt-1">
              <span className="small text-muted">{content.trim().length} / 2000</span>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-warning btn-sm px-3 fw-semibold text-dark"
            disabled={submitting || content.trim().length === 0}
          >
            {submitting ? "Posting..." : "Post Internal Note"}
          </button>
        </form>
      ) : (
        <div className="small text-muted fst-italic">
          (Administrators have read-only access to internal notes)
        </div>
      )}
    </section>
  );
}
