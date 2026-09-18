import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import RouteGuard from "./components/RouteGuard";
import AppShell from "./components/AppShell";
import MyTickets from "./pages/MyTickets";
import CreateTicket from "./pages/CreateTicket";
import TicketDetail from "./pages/TicketDetail";
import StaffQueuePage from "./pages/StaffQueuePage";
import StaffTicketDetailPage from "./pages/StaffTicketDetailPage";
import CheckSystem from "./pages/CheckSystem";
import { useAuth } from "./context/AuthContext";

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  if (user.role === "REQUESTER") {
    return <Navigate to="/my-tickets" replace />;
  }
  if (user.role === "IT_STAFF") {
    return <Navigate to="/staff/tickets" replace />;
  }
  if (user.role === "ADMINISTRATOR") {
    return <Navigate to="/admin/users" replace />;
  }
  return <Navigate to="/my-tickets" replace />;
}

function AdminUsersPlaceholder() {
  return (
    <div className="card shadow-sm p-4 border-0" style={{ backgroundColor: "var(--color-surface)" }}>
      <h1 className="h4 fw-bold mb-2">User Administration</h1>
      <p className="text-muted">User administration (scheduled for Phase F4).</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/check-system" element={<CheckSystem />} />

        {/* Legacy requester selection redirect */}
        <Route path="/requester-selection" element={<Navigate to="/login" replace />} />

        {/* Forced Password Change Route */}
        <Route element={<RouteGuard allowForcedPasswordChange={true} />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        {/* Protected Application Routes */}
        <Route element={<RouteGuard />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<RoleRedirect />} />

            {/* Requester Routes */}
            <Route element={<RouteGuard allowedRoles={["REQUESTER"]} />}>
              <Route path="/my-tickets" element={<MyTickets />} />
              <Route path="/tickets/new" element={<CreateTicket />} />
            </Route>

            {/* Shared / General Ticket Detail */}
            <Route path="/tickets/:id" element={<TicketDetail />} />

            {/* IT Staff Routes */}
            <Route element={<RouteGuard allowedRoles={["IT_STAFF"]} />}>
              <Route path="/staff/tickets" element={<StaffQueuePage />} />
              <Route path="/staff/tickets/:id" element={<StaffTicketDetailPage />} />
            </Route>

            {/* Administrator Routes */}
            <Route element={<RouteGuard allowedRoles={["ADMINISTRATOR"]} />}>
              <Route path="/admin/users" element={<AdminUsersPlaceholder />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}