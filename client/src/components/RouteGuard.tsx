import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RoleType } from "../api";

interface RouteGuardProps {
  allowedRoles?: RoleType[];
  allowForcedPasswordChange?: boolean;
}

export default function RouteGuard({
  allowedRoles,
  allowForcedPasswordChange = false,
}: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center min-vh-100"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If password change is forced, only allow /change-password
  if (user.mustChangePassword && !allowForcedPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="container py-5 text-center zen-container">
        <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: 500 }}>
          <h1 className="h3 text-danger mb-3">403 Forbidden</h1>
          <p className="text-muted mb-0">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
