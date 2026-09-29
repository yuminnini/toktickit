import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRequester } from "../context/RequesterContext";
import Badge from "./Badge";

export default function AppShell() {
    const { user, logout } = useAuth();
    const { requester, clearRequester } = useRequester();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    function handleChangeRequester() {
        clearRequester();
        navigate("/requester-selection");
    }

    const isForcedPasswordChange = Boolean(user?.mustChangePassword);
    const isRequesterRole = user ? user.role === "REQUESTER" : Boolean(requester);

    return (
        <div className="min-vh-100 d-flex flex-column" style={{ background: "var(--color-bg)" }}>
            <header
                className="navbar navbar-expand-md navbar-dark px-3 py-2 shadow-sm zen-header"
            >
                <div className="container-fluid zen-container">
                    <NavLink
                        to="/"
                        className="navbar-brand fw-bold d-flex align-items-center me-3 text-white"
                        style={{ letterSpacing: "0.5px" }}
                    >
                        TokTickIT
                    </NavLink>

                    {/* User info on header bar */}
                    <div className="d-flex align-items-center text-white ms-auto me-2 me-md-0 order-md-last">
                        {user ? (
                            <div className="d-flex align-items-center gap-2">
                                <span
                                    className="badge bg-light text-dark py-1 px-2 rounded-pill text-truncate"
                                    style={{ maxWidth: 160 }}
                                    title={user.name}
                                >
                                    👤 {user.name}
                                </span>
                                <Badge type="role" value={user.role} />
                                <button
                                    type="button"
                                    className="btn btn-outline-light btn-sm ms-1"
                                    style={{
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        minHeight: "44px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                    }}
                                    onClick={handleLogout}
                                    aria-label="Logout"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : requester ? (
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
                        ) : null}
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
                        {!isForcedPasswordChange && (
                            <ul className="navbar-nav me-auto mb-2 mb-md-0">
                                {isRequesterRole && (
                                    <>
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
                                    </>
                                )}

                                {user?.role === "IT_STAFF" && (
                                    <li className="nav-item">
                                        <NavLink
                                            to="/staff/tickets"
                                            className={({ isActive }) =>
                                                `nav-link px-3 zen-nav-link ${isActive ? "active" : ""}`
                                            }
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Ticket Queue
                                        </NavLink>
                                    </li>
                                )}

                                {user?.role === "ADMINISTRATOR" && (
                                    <li className="nav-item">
                                        <NavLink
                                            to="/admin/users"
                                            className={({ isActive }) =>
                                                `nav-link px-3 zen-nav-link ${isActive ? "active" : ""}`
                                            }
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            User Management
                                        </NavLink>
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow-1 zen-container py-4">
                <Outlet />
            </main>
        </div>
    );
}
