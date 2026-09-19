import React, { useState, useEffect, useCallback } from "react";
import {
  SafeUser,
  RoleType,
  fetchUsersAdmin,
  createUserAdmin,
  updateUserAdmin,
  resetUserPasswordAdmin,
} from "../api";
import { useAuth } from "../context/AuthContext";
import Badge from "../components/Badge";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [resettingUser, setResettingUser] = useState<SafeUser | null>(null);

  // Form States - Create
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<RoleType>("REQUESTER");
  const [createActive, setCreateActive] = useState(true);
  const [createPassword, setCreatePassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form States - Edit
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<RoleType>("REQUESTER");
  const [editActive, setEditActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Form States - Reset Password
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadUsers = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const params: { search?: string; role?: RoleType } = {};
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (roleFilter) params.role = roleFilter as RoleType;

        const data = await fetchUsersAdmin(params, signal);
        setUsers(data);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load user accounts");
        }
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, roleFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers]);

  // Accessibility: Dismiss modals on Escape key (AC-52)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isCreateOpen) setIsCreateOpen(false);
        if (editingUser) setEditingUser(null);
        if (resettingUser) setResettingUser(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen, editingUser, resettingUser]);

  // Handle Create User
  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError("Name is required");
      return;
    }
    if (!createEmail.trim()) {
      setCreateError("Email is required");
      return;
    }
    if (createPassword.length < 12 || createPassword.length > 128) {
      setCreateError("Initial password must be between 12 and 128 characters");
      return;
    }

    setCreateSubmitting(true);
    try {
      await createUserAdmin({
        name: createName.trim(),
        email: createEmail.trim(),
        role: createRole,
        active: createActive,
        initialPassword: createPassword,
      });

      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreateRole("REQUESTER");
      setCreateActive(true);
      setCreatePassword("");
      setShowCreatePassword(false);
      setSuccessMessage("User created successfully");
      loadUsers();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create user");
    } finally {
      setCreateSubmitting(false);
    }
  }

  // Open Edit Modal
  function handleOpenEdit(user: SafeUser) {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditActive(user.active);
    setEditError(null);
  }

  // Handle Edit User
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Name is required");
      return;
    }
    if (!editEmail.trim()) {
      setEditError("Email is required");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await updateUserAdmin(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        active: editActive,
      });

      setEditingUser(null);
      let msg = "User updated successfully";
      if (res.unassignedTicketCount > 0) {
        msg += ` (${res.unassignedTicketCount} assigned tickets unassigned)`;
      }
      setSuccessMessage(msg);
      loadUsers();
    } catch (err: any) {
      setEditError(err.message || "Failed to update user");
    } finally {
      setEditSubmitting(false);
    }
  }

  // Open Reset Password Modal
  function handleOpenReset(user: SafeUser) {
    setResettingUser(user);
    setResetPassword("");
    setShowResetPassword(false);
    setResetError(null);
  }

  // Handle Reset Password Submit
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingUser) return;
    setResetError(null);

    if (resetPassword.length < 12 || resetPassword.length > 128) {
      setResetError("Initial password must be between 12 and 128 characters");
      return;
    }

    setResetSubmitting(true);
    try {
      await resetUserPasswordAdmin(resettingUser.id, resetPassword);
      setResettingUser(null);
      setResetPassword("");
      setSuccessMessage(
        `Password reset successfully for ${resettingUser.name}. User will be required to change password on next login.`
      );
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetSubmitting(false);
    }
  }

  const isSelfEditing = editingUser?.id === currentUser?.id;
  const willUnassignTickets =
    editingUser &&
    (editingUser.role === "IT_STAFF" || editingUser.role === "ADMINISTRATOR") &&
    (!editActive || editRole === "REQUESTER");

  return (
    <div className="container-fluid py-2">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-text)" }}>
            User Administration
          </h1>
          <p className="text-muted mb-0">
            Manage system users, roles, account activation, and credential provisioning.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          style={{
            backgroundColor: "var(--color-primary)",
            borderColor: "var(--color-primary)",
            minHeight: "44px",
          }}
          onClick={() => {
            setIsCreateOpen(true);
            setCreateError(null);
          }}
          aria-label="Add User"
        >
          <span>➕</span>
          <span>Add User</span>
        </button>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div
          className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between"
          role="alert"
        >
          <span>✓ {successMessage}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between" role="alert">
          <span>⚠️ {error}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => loadUsers()}
            style={{ minHeight: "44px" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card shadow-sm border-0 mb-4" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="card-body p-3">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-6 col-lg-5">
              <label htmlFor="user-search-input" className="form-label fw-semibold small text-muted">
                Search Users
              </label>
              <div className="input-group">
                <input
                  id="user-search-input"
                  type="text"
                  className="form-control"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ minHeight: "44px" }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear Search"
                    style={{ minHeight: "44px" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="col-12 col-md-4 col-lg-3">
              <label htmlFor="role-filter-select" className="form-label fw-semibold small text-muted">
                Filter by Role
              </label>
              <select
                id="role-filter-select"
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ minHeight: "44px" }}
              >
                <option value="">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>

            {(searchTerm || roleFilter) && (
              <div className="col-12 col-md-2">
                <button
                  type="button"
                  className="btn btn-link text-muted text-decoration-none p-0"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("");
                  }}
                  style={{ minHeight: "44px", display: "inline-flex", alignItems: "center" }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="card shadow-sm border-0 p-4" style={{ backgroundColor: "var(--color-surface)" }}>
          <div className="placeholder-glow">
            <div className="placeholder col-12 mb-2 py-3 bg-secondary opacity-25 rounded"></div>
            <div className="placeholder col-12 mb-2 py-3 bg-secondary opacity-25 rounded"></div>
            <div className="placeholder col-12 mb-2 py-3 bg-secondary opacity-25 rounded"></div>
          </div>
          <div className="text-center text-muted small mt-2">Loading user directory...</div>
        </div>
      ) : users.length === 0 ? (
        <div
          className="card shadow-sm border-0 text-center p-5"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="display-6 mb-2 text-muted">👥</div>
          <h2 className="h5 fw-bold text-muted mb-1">No users found</h2>
          <p className="text-muted small mb-0">
            {searchTerm || roleFilter
              ? "No accounts match your current filter criteria."
              : "No user accounts have been provisioned yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Hidden on Mobile) */}
          <div
            className="card shadow-sm border-0 d-none d-md-block"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" data-testid="admin-users-table">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-muted small text-uppercase">
                      Name
                    </th>
                    <th scope="col" className="py-3 text-muted small text-uppercase">
                      Email
                    </th>
                    <th scope="col" className="py-3 text-muted small text-uppercase">
                      Role
                    </th>
                    <th scope="col" className="py-3 text-muted small text-uppercase">
                      Status
                    </th>
                    <th scope="col" className="py-3 text-muted small text-uppercase text-end px-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} data-testid={`user-row-${u.id}`}>
                      <td className="px-3 fw-medium" style={{ color: "var(--color-text)" }}>
                        {u.name}
                        {u.id === currentUser?.id && (
                          <span className="badge bg-secondary ms-2 small">You</span>
                        )}
                      </td>
                      <td className="text-muted">{u.email}</td>
                      <td>
                        <Badge type="role" value={u.role} />
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.active ? "bg-success text-white" : "bg-secondary text-white"
                          }`}
                        >
                          {u.active ? "Active" : "Inactive"}
                        </span>
                        {u.mustChangePassword && (
                          <span className="badge bg-warning text-dark ms-2 small">Pwd Reset</span>
                        )}
                      </td>
                      <td className="text-end px-3">
                        <div className="btn-group" role="group">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => handleOpenEdit(u)}
                            style={{ minHeight: "38px" }}
                            aria-label={`Edit ${u.name}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => handleOpenReset(u)}
                            style={{ minHeight: "38px" }}
                            aria-label={`Reset Password for ${u.name}`}
                          >
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (Visible on Mobile) */}
          <div className="d-md-none d-flex flex-column gap-3" data-testid="admin-users-cards">
            {users.map((u) => (
              <div
                key={u.id}
                className="card shadow-sm border-0 p-3"
                style={{ backgroundColor: "var(--color-surface)" }}
                data-testid={`user-card-${u.id}`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h3 className="h6 fw-bold mb-1" style={{ color: "var(--color-text)" }}>
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="badge bg-secondary ms-2 small">You</span>
                      )}
                    </h3>
                    <div className="text-muted small">{u.email}</div>
                  </div>
                  <Badge type="role" value={u.role} />
                </div>

                <div className="d-flex align-items-center gap-2 mb-3">
                  <span
                    className={`badge ${
                      u.active ? "bg-success text-white" : "bg-secondary text-white"
                    }`}
                  >
                    {u.active ? "Active" : "Inactive"}
                  </span>
                  {u.mustChangePassword && (
                    <span className="badge bg-warning text-dark small">Password Change Required</span>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm flex-fill"
                    onClick={() => handleOpenEdit(u)}
                    style={{ minHeight: "44px" }}
                    aria-label={`Edit ${u.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm flex-fill"
                    onClick={() => handleOpenReset(u)}
                    style={{ minHeight: "44px" }}
                    aria-label={`Reset Password for ${u.name}`}
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal: Create User */}
      {isCreateOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold" id="create-user-modal-title">
                    Add New User
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setIsCreateOpen(false)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  {createError && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      {createError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="create-user-name" className="form-label fw-semibold small">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="create-user-name"
                      type="text"
                      className="form-control"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      required
                      style={{ minHeight: "44px" }}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="create-user-email" className="form-label fw-semibold small">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      id="create-user-email"
                      type="email"
                      className="form-control"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="e.g. jane.doe@example.com"
                      required
                      style={{ minHeight: "44px" }}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="create-user-role" className="form-label fw-semibold small">
                      Role <span className="text-danger">*</span>
                    </label>
                    <select
                      id="create-user-role"
                      className="form-select"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as RoleType)}
                      required
                      style={{ minHeight: "44px" }}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="mb-3 form-check form-switch">
                    <input
                      id="create-user-active"
                      type="checkbox"
                      className="form-check-input"
                      checked={createActive}
                      onChange={(e) => setCreateActive(e.target.checked)}
                      style={{ minHeight: "24px", minWidth: "44px" }}
                    />
                    <label htmlFor="create-user-active" className="form-check-label fw-semibold small ms-2">
                      Active Account
                    </label>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="create-user-password" className="form-label fw-semibold small">
                      Initial Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        id="create-user-password"
                        type={showCreatePassword ? "text" : "password"}
                        className="form-control"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        placeholder="Min 12 characters"
                        required
                        style={{ minHeight: "44px" }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        style={{ minHeight: "44px" }}
                        aria-label={showCreatePassword ? "Hide password" : "Show password"}
                      >
                        {showCreatePassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="form-text small">
                      Must be 12–128 characters. The user will be required to change this password on first
                      login.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setIsCreateOpen(false)}
                    style={{ minHeight: "44px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createSubmitting}
                    style={{
                      backgroundColor: "var(--color-primary)",
                      borderColor: "var(--color-primary)",
                      minHeight: "44px",
                    }}
                  >
                    {createSubmitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold" id="edit-user-modal-title">
                    Edit User: {editingUser.name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditingUser(null)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  {editError && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      {editError}
                    </div>
                  )}

                  {willUnassignTickets && (
                    <div className="alert alert-warning py-2 small" role="alert">
                      ⚠️ Note: Deactivating this user or reclassifying them as Requester will automatically
                      unassign any open tickets they currently own.
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="edit-user-name" className="form-label fw-semibold small">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-user-name"
                      type="text"
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      style={{ minHeight: "44px" }}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="edit-user-email" className="form-label fw-semibold small">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-user-email"
                      type="email"
                      className="form-control"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      style={{ minHeight: "44px" }}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="edit-user-role" className="form-label fw-semibold small">
                      Role <span className="text-danger">*</span>
                    </label>
                    <select
                      id="edit-user-role"
                      className="form-select"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as RoleType)}
                      required
                      style={{ minHeight: "44px" }}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        id="edit-user-active"
                        type="checkbox"
                        className="form-check-input"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        disabled={isSelfEditing}
                        style={{ minHeight: "24px", minWidth: "44px" }}
                      />
                      <label htmlFor="edit-user-active" className="form-check-label fw-semibold small ms-2">
                        Active Account
                      </label>
                    </div>
                    {isSelfEditing && (
                      <div className="form-text text-muted small mt-1">
                        You cannot deactivate your own administrator account.
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setEditingUser(null)}
                    style={{ minHeight: "44px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={editSubmitting}
                    style={{
                      backgroundColor: "var(--color-primary)",
                      borderColor: "var(--color-primary)",
                      minHeight: "44px",
                    }}
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resettingUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-password-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleResetSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold" id="reset-password-modal-title">
                    Reset Password for {resettingUser.name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setResettingUser(null)}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  {resetError && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      {resetError}
                    </div>
                  )}

                  <div className="alert alert-info py-2 small" role="alert">
                    ℹ️ Setting a new password will revoke any active sessions for this user and force them to
                    change this password upon their next login.
                  </div>

                  <div className="mb-3">
                    <label htmlFor="reset-user-password" className="form-label fw-semibold small">
                      New Temporary Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        id="reset-user-password"
                        type={showResetPassword ? "text" : "password"}
                        className="form-control"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Min 12 characters"
                        required
                        style={{ minHeight: "44px" }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        style={{ minHeight: "44px" }}
                        aria-label={showResetPassword ? "Hide password" : "Show password"}
                      >
                        {showResetPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="form-text small">Must be between 12 and 128 characters.</div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setResettingUser(null)}
                    style={{ minHeight: "44px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning"
                    disabled={resetSubmitting}
                    style={{ minHeight: "44px" }}
                  >
                    {resetSubmitting ? "Resetting..." : "Confirm Password Reset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
