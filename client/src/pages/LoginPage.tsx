import React, { useState, useEffect, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // If already authenticated, redirect to appropriate page
  useEffect(() => {
    if (user) {
      if (user.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname;
        if (from && from !== "/login" && from !== "/change-password") {
          navigate(from, { replace: true });
        } else if (user.role === "REQUESTER") {
          navigate("/my-tickets", { replace: true });
        } else if (user.role === "IT_STAFF") {
          navigate("/staff/tickets", { replace: true });
        } else if (user.role === "ADMINISTRATOR") {
          navigate("/admin/users", { replace: true });
        } else {
          navigate("/my-tickets", { replace: true });
        }
      }
    }
  }, [user, navigate, location]);

  // Handle countdown timer for rate limiting (429)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (countdown > 0 || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const loggedInUser = await login({ email, password });
      if (loggedInUser.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else if (loggedInUser.role === "REQUESTER") {
        navigate("/my-tickets", { replace: true });
      } else if (loggedInUser.role === "IT_STAFF") {
        navigate("/staff/tickets", { replace: true });
      } else if (loggedInUser.role === "ADMINISTRATOR") {
        navigate("/admin/users", { replace: true });
      } else {
        navigate("/my-tickets", { replace: true });
      }
    } catch (err: any) {
      if (err.status === 429 || err.code === "TOO_MANY_ATTEMPTS") {
        const retrySec = err.retryAfter || 60;
        setCountdown(retrySec);
        setErrorMessage(
          `Too many failed login attempts. Please try again in ${retrySec} seconds.`
        );
      } else {
        setErrorMessage(err.message || "Invalid email or password");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center align-items-center py-5"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="zen-container" style={{ maxWidth: 420 }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <h1
            className="fw-bold mb-1"
            style={{ color: "var(--color-primary)", letterSpacing: "0.5px" }}
          >
            TokTickIT
          </h1>
          <p className="text-muted small">IT Service Desk Platform</p>
        </div>

        {/* Login Card */}
        <div
          className="card shadow-sm border-0"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "8px",
            border: "1px solid var(--color-surface-border)",
          }}
        >
          <div className="card-body p-4">
            <h2 className="h4 fw-bold mb-4" style={{ color: "var(--color-text)" }}>
              Sign In
            </h2>

            {errorMessage && (
              <div
                className="alert alert-danger py-2 px-3 mb-3 small"
                role="alert"
                aria-live="polite"
              >
                {countdown > 0
                  ? `Too many failed login attempts. Please try again in ${countdown} seconds.`
                  : errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label
                  htmlFor="email"
                  className="form-label small fw-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  style={{
                    backgroundColor: "var(--color-editable-bg)",
                    borderColor: "var(--color-editable-border)",
                    minHeight: "44px",
                  }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  disabled={isSubmitting || countdown > 0}
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="form-label small fw-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  Password
                </label>
                <div className="input-group">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    style={{
                      backgroundColor: "var(--color-editable-bg)",
                      borderColor: "var(--color-editable-border)",
                      minHeight: "44px",
                    }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting || countdown > 0}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    style={{ minHeight: "44px" }}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isSubmitting || countdown > 0}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn w-100 fw-semibold text-white"
                style={{
                  backgroundColor: "var(--color-primary)",
                  minHeight: "44px",
                  border: "none",
                }}
                disabled={isSubmitting || countdown > 0 || !email || !password}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Signing in...
                  </>
                ) : countdown > 0 ? (
                  `Locked (${countdown}s)`
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
