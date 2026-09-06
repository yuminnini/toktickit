import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";

export default function AppShell() {
    const { requester, clearRequester } = useRequester();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    function handleChangeRequester() {
        clearRequester();
        navigate("/requester-selection");
    }

    return (
        <div className="min-vh-100 d-flex flex-column" style={{ background: "var(--color-bg)" }}>
            <header
                className="navbar navbar-expand-md navbar-dark px-3 py-2 shadow-sm zen-header"
            >
                <div className="container-fluid zen-container">
                    <NavLink
                        to="/my-tickets"
                        className="navbar-brand fw-bold d-flex align-items-center me-3 text-white"
                        style={{ letterSpacing: "0.5px" }}
                    >
                        TokTickIT
                    </NavLink>

                    {/* Requester info on header bar (single DOM node visible on both desktop & mobile) */}
                    <div className="d-flex align-items-center text-white ms-auto me-2 me-md-0 order-md-last">
                        {requester && (
                            <div className="d-flex align-items-center gap-2">
                                <span
                                    className="badge bg-light text-dark py-1 px-2 rounded-pill text-truncate"
                                    style={{ maxWidth: 160 }}
                                    title={requester.name}
                                >
                                    👤 {requester.name}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-link text-white text-decoration-underline p-1 small"
                                    style={{
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        minHeight: "44px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                    }}
                                    onClick={handleChangeRequester}
                                    aria-label="Change Requester"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        className="navbar-toggler"
                        type="button"
                        aria-label="Toggle navigation"
                        aria-expanded={isMenuOpen}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{ minHeight: "44px", minWidth: "44px" }}
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    <div className={`collapse navbar-collapse ${isMenuOpen ? "show" : ""}`}>
                        <ul className="navbar-nav me-auto mb-2 mb-md-0">
                            <li className="nav-item">
                                <NavLink
                                    to="/my-tickets"
                                    className={({ isActive }) =>
                                        `nav-link px-3 zen-nav-link ${isActive ? "active" : ""}`
                                    }
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    My Tickets
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    to="/tickets/new"
                                    className={({ isActive }) =>
                                        `nav-link px-3 zen-nav-link ${isActive ? "active" : ""}`
                                    }
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Create Ticket
                                </NavLink>
                            </li>
                        </ul>
                    </div>
                </div>
            </header>

            <main className="flex-grow-1 zen-container py-4">
                <Outlet />
            </main>
        </div>
    );
}
