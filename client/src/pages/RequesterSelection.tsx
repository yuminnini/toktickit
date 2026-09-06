import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRequesters, Requester } from "../api";
import { useRequester } from "../context/RequesterContext";

type LoadState = "loading" | "empty" | "error" | "ready";

export default function RequesterSelection() {
    const [state, setState] = useState<LoadState>("loading");
    const [requesters, setRequesters] = useState<Requester[]>([]);
    const [selectedId, setSelectedId] = useState<number | "">("");
    const { setRequester } = useRequester();
    const navigate = useNavigate();

    const loadRequesters = useCallback(() => {
        setState("loading");
        fetchRequesters()
            .then((list) => {
                setRequesters(list);
                setState(list.length === 0 ? "empty" : "ready");
            })
            .catch(() => setState("error"));
    }, []);

    useEffect(() => {
        loadRequesters();
    }, [loadRequesters]);

    function handleContinue() {
        const chosen = requesters.find((r) => r.id === selectedId);
        if (!chosen) return;
        setRequester(chosen);
        navigate("/my-tickets");
    }

    return (
        <div className="container py-5" style={{ maxWidth: 480 }}>
            <div className="zen-card shadow-sm">
                <div className="text-center mb-3">
                    <span style={{ fontSize: "2rem" }}>👤</span>
                </div>
                <h1 className="h5 text-center mb-2">
                    Select Development Requester
                </h1>
                <p className="text-center text-muted small mb-4">
                    Select a Development Requester to test requester-specific ticket behavior. This
                    is not a login screen. Authentication and role-based access will be introduced
                    in Lab 3.
                </p>

                {state === "loading" && (
                    <div className="text-center py-4" role="status">
                        <div className="spinner-border text-success mb-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-muted mb-0 small">Loading requesters…</p>
                    </div>
                )}

                {state === "empty" && (
                    <p className="text-center text-muted py-3 small">
                        No development requesters are available. Contact an administrator.
                    </p>
                )}

                {state === "error" && (
                    <div className="alert alert-danger" role="alert">
                        <p className="mb-2 small">Unable to load requesters. Check your connection and try again.</p>
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={loadRequesters}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {state === "ready" && (
                    <>
                        <div className="mb-3">
                            <label htmlFor="requester-select" className="form-label fw-semibold small">
                                Development Requester <span className="required-marker">*</span>
                            </label>
                            <select
                                id="requester-select"
                                className="form-select form-control-zen"
                                value={selectedId}
                                onChange={(e) => setSelectedId(Number(e.target.value))}
                                aria-label="Development Requester selection"
                            >
                                <option value="" disabled>Choose a requester…</option>
                                {requesters.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        <div
                            className="alert small py-2 px-3 mb-4"
                            role="status"
                            style={{
                                background: "var(--color-pale-green)",
                                border: "1px solid var(--badge-prio-low-border)",
                                color: "var(--color-primary)",
                            }}
                        >
                            Only active development requesters are shown.
                        </div>
                    </>
                )}

                <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
                    <button
                        type="button"
                        className="btn-zen-secondary"
                        disabled={state !== "ready" || selectedId === ""}
                        onClick={() => setSelectedId("")}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-zen-primary"
                        disabled={state !== "ready" || selectedId === ""}
                        onClick={handleContinue}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}