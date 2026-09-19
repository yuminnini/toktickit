import React, { useState, useEffect, useCallback } from "react";
import { CommunicationEntry, fetchTicketComments, createTicketComment } from "../api";
import Badge from "./Badge";

interface PublicCommentsSectionProps {
  ticketId: number;
  canComment: boolean;
}

export default function PublicCommentsSection({ ticketId, canComment }: PublicCommentsSectionProps) {
  const [comments, setComments] = useState<CommunicationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTicketComments(ticketId);
      setComments(data);
    } catch (err: any) {
      setError(err.message || "Unable to load comments");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setFormError("Comment cannot be empty");
      return;
    }
    if (trimmed.length > 2000) {
      setFormError("Comment exceeds 2000 characters limit");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const newComment = await createTicketComment(ticketId, trimmed);
      setComments((prev) => [...prev, newComment]);
      setContent("");
    } catch (err: any) {
      setFormError(err.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card p-3 p-md-4 mb-4" aria-labelledby="public-comments-heading">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 id="public-comments-heading" className="h5 mb-0 fw-bold" style={{ color: "var(--color-primary)" }}>
          Public Comments ({comments.length})
        </h2>
        <span className="badge bg-light text-muted border">Visible to Requester & IT</span>
      </div>

      {loading && (
        <div className="py-3 text-center text-muted" role="status">
          <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Loading comments...
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 ms-2"
            onClick={loadComments}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && comments.length === 0 && (
        <p className="text-muted fst-italic my-2">No public comments yet.</p>
      )}

      {!loading && comments.length > 0 && (
        <div className="comments-list d-flex flex-column gap-3 mb-4">
          {comments.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded border"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-semibold">{c.author.name}</span>
                  <Badge type="role" value={c.author.role} />
                </div>
                <time className="small text-muted" dateTime={c.createdAt}>
                  {new Date(c.createdAt).toLocaleString()}
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
                {c.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {canComment ? (
        <form onSubmit={handleSubmit} className="mt-2">
          {formError && (
            <div className="alert alert-danger py-2 mb-2" role="alert">
              {formError}
            </div>
          )}
          <div className="mb-2">
            <label htmlFor="comment-input" className="form-label small fw-semibold">
              Add a Comment
            </label>
            <textarea
              id="comment-input"
              className="form-control"
              rows={3}
              placeholder="Type your comment here (visible to both requester and IT staff)..."
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
            className="btn btn-zen-primary btn-sm px-3"
            disabled={submitting || content.trim().length === 0}
          >
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </form>
      ) : (
        <div className="small text-muted fst-italic">
          (You have read-only access to comments)
        </div>
      )}
    </section>
  );
}
