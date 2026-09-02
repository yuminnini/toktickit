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
                className="navbar navbar-expand-md navbar-dark px-3 py-2 shadow-sm"
                style={{ backgroundColor: "var(--color-primary)" }}
            >
                <div className="container-fluid">
                    <NavLink
                        to="/my-tickets"
                        className="navbar-brand fw-bold d-flex align-items-center me-4"
                        style={{ color: "#FFFFFF", letterSpacing: "0.5px" }}
                    >
                        TokTickIT
                    </NavLink>

                    <button
                        className="navbar-toggler"
                        type="button"
                        aria-label="Toggle navigation"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    <div className={`collapse navbar-collapse ${isMenuOpen ? "show" : ""}`}>
                        <ul className="navbar-nav me-auto mb-2 mb-md-0">
                            <li className="nav-item">
                                <NavLink
                                    to="/my-tickets"
                                    className={({ isActive }) =>
                                        `nav-link px-3 ${isActive ? "active fw-bold text-white" : "text-white-50"}`
                                    }
                                    style={({ isActive }) => ({
                                        borderBottom: isActive ? "3px solid var(--color-secondary)" : "none",
                                    })}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    My Tickets
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    to="/tickets/new"
                                    className={({ isActive }) =>
                                        `nav-link px-3 ${isActive ? "active fw-bold text-white" : "text-white-50"}`
                                    }
                                    style={({ isActive }) => ({
                                        borderBottom: isActive ? "3px solid var(--color-secondary)" : "none",
                                    })}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Create Ticket
                                </NavLink>
                            </li>
                        </ul>

                        <div className="d-flex align-items-center text-white">
                            {requester && (
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-light text-dark py-1 px-2 rounded-pill">
                                        👤 {requester.name}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-link text-white text-decoration-underline p-0 ms-2 small"
                                        style={{ fontSize: "14px", cursor: "pointer" }}
                                        onClick={handleChangeRequester}
                                    >
                                        Change
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow-1 container py-4">
                <Outlet />
            </main>
        </div>
    );
}
