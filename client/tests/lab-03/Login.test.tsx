import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginPage from "../../src/pages/LoginPage";
import ChangePasswordPage from "../../src/pages/ChangePasswordPage";
import * as api from "../../src/api";
import { AuthContext, AuthProvider } from "../../src/context/AuthContext";

describe("Login and Change Password UI (T12 / AC-12)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe("LoginPage Component", () => {
    it("renders email, password inputs, submit button and toggles password visibility", () => {
      render(
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const submitBtn = screen.getByRole("button", { name: /sign in/i });
      const toggleBtn = screen.getByRole("button", { name: /show password/i });

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(submitBtn).toBeInTheDocument();

      // Click show password
      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();

      // Click hide password
      fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("displays error message on invalid credentials (401)", async () => {
      vi.spyOn(api, "getCurrentUserApi").mockResolvedValue(null);
      vi.spyOn(api, "loginApi").mockRejectedValue(new Error("Invalid email or password"));

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "wrongpassword" },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    it("displays 429 rate limit countdown and locks submit button", async () => {
      vi.spyOn(api, "getCurrentUserApi").mockResolvedValue(null);
      const rateLimitError = new Error("Too many failed login attempts") as any;
      rateLimitError.status = 429;
      rateLimitError.code = "TOO_MANY_ATTEMPTS";
      rateLimitError.retryAfter = 15;

      vi.spyOn(api, "loginApi").mockRejectedValue(rateLimitError);

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "wrongpassword" },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/too many failed login attempts.*15 seconds/i)).toBeInTheDocument();
      });

      // Submit button should be disabled with countdown text
      const submitBtn = screen.getByRole("button", { name: /locked/i });
      expect(submitBtn).toBeDisabled();
    });

    it("navigates to /my-tickets on successful login for active Requester", async () => {
      vi.spyOn(api, "getCurrentUserApi").mockResolvedValue(null);
      vi.spyOn(api, "loginApi").mockResolvedValue({
        user: {
          id: 1,
          name: "Alice Smith",
          email: "alice@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
        },
      });
      vi.spyOn(api, "fetchCsrfToken").mockResolvedValue("mock-csrf-token");

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/my-tickets" element={<div>My Tickets Screen</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "alice@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "correctpassword" },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText("My Tickets Screen")).toBeInTheDocument();
      });
    });

    it("navigates to /change-password when user mustChangePassword is true", async () => {
      vi.spyOn(api, "getCurrentUserApi").mockResolvedValue(null);
      vi.spyOn(api, "loginApi").mockResolvedValue({
        user: {
          id: 4,
          name: "Diana Prince",
          email: "diana@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: true,
        },
      });
      vi.spyOn(api, "fetchCsrfToken").mockResolvedValue("mock-csrf-token");

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/change-password" element={<div>Change Password Screen</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "diana@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "temppassword" },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText("Change Password Screen")).toBeInTheDocument();
      });
    });
  });

  describe("ChangePasswordPage Component", () => {
    it("validates password length (12-128 chars), distinctness, and confirmation match", async () => {
      const mockUser: api.SafeUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        role: "REQUESTER",
        active: true,
        mustChangePassword: true,
      };

      render(
        <MemoryRouter initialEntries={["/change-password"]}>
          <AuthContext.Provider
            value={{
              user: mockUser,
              isLoading: false,
              login: vi.fn(),
              logout: vi.fn(),
              changePassword: vi.fn(),
              refreshUser: vi.fn(),
            }}
          >
            <ChangePasswordPage />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      // Verify forced-change banner is rendered
      expect(screen.getByText(/password change required/i)).toBeInTheDocument();

      // Test short password (< 12 chars)
      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: "oldpassword123" },
      });
      fireEvent.change(screen.getByLabelText(/^new password/i), {
        target: { value: "short" },
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: "short" },
      });

      fireEvent.click(screen.getByRole("button", { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 12 characters long/i)).toBeInTheDocument();
      });

      // Test new password equals current password
      fireEvent.change(screen.getByLabelText(/^new password/i), {
        target: { value: "oldpassword123" },
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: "oldpassword123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/different from current password/i)).toBeInTheDocument();
      });

      // Test mismatched confirmation
      fireEvent.change(screen.getByLabelText(/^new password/i), {
        target: { value: "brandnewpassword123" },
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: "differentpassword123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it("successfully submits valid passwords and redirects", async () => {
      const mockChangePassword = vi.fn().mockResolvedValue({
        id: 1,
        name: "Test User",
        email: "test@example.com",
        role: "REQUESTER",
        active: true,
        mustChangePassword: false,
      });

      render(
        <MemoryRouter initialEntries={["/change-password"]}>
          <AuthContext.Provider
            value={{
              user: {
                id: 1,
                name: "Test User",
                email: "test@example.com",
                role: "REQUESTER",
                active: true,
                mustChangePassword: true,
              },
              isLoading: false,
              login: vi.fn(),
              logout: vi.fn(),
              changePassword: mockChangePassword,
              refreshUser: vi.fn(),
            }}
          >
            <Routes>
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/my-tickets" element={<div>My Tickets Screen</div>} />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/current password/i), {
        target: { value: "oldpassword123" },
      });
      fireEvent.change(screen.getByLabelText(/^new password/i), {
        target: { value: "brandnewsecurepassword123" },
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: "brandnewsecurepassword123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /change password/i }));

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith({
          currentPassword: "oldpassword123",
          newPassword: "brandnewsecurepassword123",
          confirmPassword: "brandnewsecurepassword123",
        });
        expect(screen.getByText("My Tickets Screen")).toBeInTheDocument();
      });
    });
  });
});
