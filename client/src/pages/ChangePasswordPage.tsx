import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  function validate(): boolean {
    const errors: typeof fieldErrors = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else if (newPassword.length < 12) {
      errors.newPassword = "Password must be at least 12 characters long";
    } else if (newPassword.length > 128) {
      errors.newPassword = "Password must not exceed 128 characters";
    } else if (currentPassword && newPassword === currentPassword) {
      errors.newPassword = "New password must be different from current password";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required";
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUser = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (updatedUser.role === "REQUESTER") {
        navigate("/my-tickets", { replace: true });
      } else if (updatedUser.role === "IT_STAFF") {
        navigate("/staff/tickets", { replace: true });
      } else if (updatedUser.role === "ADMINISTRATOR") {
        navigate("/admin/users", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      if (err.code === "INVALID_CURRENT_PASSWORD") {
        setFieldErrors((prev) => ({
          ...prev,
          currentPassword: "Incorrect current password",
        }));
      } else {
        setErrorMessage(err.message || "Failed to update password. Please check requirements.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="min-vh-100 py-5"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="zen-container" style={{ maxWidth: 520 }}>
        {/* Top bar with Logout option */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <span className="fw-bold" style={{ color: "var(--color-primary)" }}>
            TokTickIT
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            style={{ minHeight: "44px" }}
            onClick={() => logout().then(() => navigate("/login"))}
            aria-label="Logout"
          >
            Sign Out
          </button>
        </div>

        {/* Forced Change Banner */}
        {user?.mustChangePassword && (
          <div
            className="alert alert-warning py-3 px-4 mb-4 shadow-sm"
            role="alert"
            aria-live="polite"
          >
            <h2 className="h6 fw-bold mb-1">Password Change Required</h2>
            <p className="mb-0 small">
              You must update your temporary or initial password before accessing the system.
            </p>
          </div>
        )}

        {/* Change Password Card */}
        <div
          className="card shadow-sm border-0"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "8px",
            border: "1px solid var(--color-surface-border)",
          }}
        >
          <div className="card-body p-4">
            <h1 className="h4 fw-bold mb-3" style={{ color: "var(--color-text)" }}>
              Change Password
            </h1>

            {errorMessage && (
              <div
                className="alert alert-danger py-2 px-3 mb-3 small"
                role="alert"
                aria-live="polite"
              >
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Current Password */}
              <div className="mb-3">
                <label
                  htmlFor="currentPassword"
                  className="form-label small fw-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type={showPasswords ? "text" : "password"}
                  className={`form-control ${fieldErrors.currentPassword ? "is-invalid" : ""}`}
                  style={{
                    backgroundColor: "var(--color-editable-bg)",
                    borderColor: fieldErrors.currentPassword ? undefined : "var(--color-editable-border)",
                    minHeight: "44px",
                  }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                />
                {fieldErrors.currentPassword && (
                  <div className="invalid-feedback">{fieldErrors.currentPassword}</div>
                )}
              </div>

              {/* New Password */}
              <div className="mb-3">
                <label
                  htmlFor="newPassword"
                  className="form-label small fw-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type={showPasswords ? "text" : "password"}
                  className={`form-control ${fieldErrors.newPassword ? "is-invalid" : ""}`}
                  style={{
                    backgroundColor: "var(--color-editable-bg)",
                    borderColor: fieldErrors.newPassword ? undefined : "var(--color-editable-border)",
                    minHeight: "44px",
                  }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                />
                {fieldErrors.newPassword && (
                  <div className="invalid-feedback">{fieldErrors.newPassword}</div>
                )}
                <div className="form-text small" style={{ fontSize: "var(--font-size-helper)" }}>
                  Must be 12 to 128 characters long and different from your current password.
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-3">
                <label
                  htmlFor="confirmPassword"
                  className="form-label small fw-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  className={`form-control ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
                  style={{
                    backgroundColor: "var(--color-editable-bg)",
                    borderColor: fieldErrors.confirmPassword ? undefined : "var(--color-editable-border)",
                    minHeight: "44px",
                  }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                />
                {fieldErrors.confirmPassword && (
                  <div className="invalid-feedback">{fieldErrors.confirmPassword}</div>
                )}
              </div>

              {/* Show/Hide Passwords Checkbox */}
              <div className="form-check mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showPasswordsToggle"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="showPasswordsToggle">
                  Show passwords
                </label>
              </div>

              <button
                type="submit"
                className="btn w-100 fw-semibold text-white"
                style={{
                  backgroundColor: "var(--color-primary)",
                  minHeight: "44px",
                  border: "none",
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Updating password...
                  </>
                ) : (
                  "Change Password"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
