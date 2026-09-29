import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "../../src/components/AppShell";
import { AuthContext } from "../../src/context/AuthContext";
import { SafeUser } from "../../src/api";

function renderShellWithUser(user: SafeUser | null, logoutMock = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthContext.Provider
        value={{
          user,
          isLoading: false,
          login: vi.fn(),
          logout: logoutMock,
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<div>Home Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("Role-based navigation & AuthShell (T13 / AC-13)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("displays Requester navigation and badge; development selector is completely absent", () => {
    const requesterUser: SafeUser = {
      id: 1,
      name: "Alice Smith",
      email: "alice@example.com",
      role: "REQUESTER",
      active: true,
      mustChangePassword: false,
    };

    renderShellWithUser(requesterUser);

    // Nav links for Requester
    expect(screen.getByRole("link", { name: /my tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create ticket/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ticket queue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /user management/i })).not.toBeInTheDocument();

    // User badge
    expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    expect(screen.getByText("Requester")).toBeInTheDocument();

    // Logout button present
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();

    // Development selector must be completely absent (AC-13)
    expect(screen.queryByRole("button", { name: /change requester/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/development requester/i)).not.toBeInTheDocument();
  });

  it("displays Staff navigation and badge; development selector is completely absent", () => {
    const staffUser: SafeUser = {
      id: 2,
      name: "Bob Staff",
      email: "bob@example.com",
      role: "IT_STAFF",
      active: true,
      mustChangePassword: false,
    };

    renderShellWithUser(staffUser);

    // Nav links for Staff
    expect(screen.getByRole("link", { name: /ticket queue/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /my tickets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /user management/i })).not.toBeInTheDocument();

    // User badge
    expect(screen.getByText(/Bob Staff/i)).toBeInTheDocument();
    expect(screen.getByText("IT Staff")).toBeInTheDocument();

    // Development selector absent
    expect(screen.queryByRole("button", { name: /change requester/i })).not.toBeInTheDocument();
  });

  it("displays Administrator navigation and badge; development selector is completely absent", () => {
    const adminUser: SafeUser = {
      id: 3,
      name: "Admin Carol",
      email: "admin@example.com",
      role: "ADMINISTRATOR",
      active: true,
      mustChangePassword: false,
    };

    renderShellWithUser(adminUser);

    // Nav links for Admin
    expect(screen.getByRole("link", { name: /user management/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /my tickets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create ticket/i })).not.toBeInTheDocument();

    // User badge
    expect(screen.getByText(/Admin Carol/i)).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();

    // Development selector absent
    expect(screen.queryByRole("button", { name: /change requester/i })).not.toBeInTheDocument();
  });

  it("hides business navigation links when user mustChangePassword is true", () => {
    const forcedUser: SafeUser = {
      id: 4,
      name: "Diana Prince",
      email: "diana@example.com",
      role: "REQUESTER",
      active: true,
      mustChangePassword: true,
    };

    renderShellWithUser(forcedUser);

    // No business navigation for forced change users (UI-Spec line 38)
    expect(screen.queryByRole("link", { name: /my tickets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ticket queue/i })).not.toBeInTheDocument();

    // User and logout still visible
    expect(screen.getByText(/Diana Prince/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("clicking Logout calls logout function and redirects to /login", async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);
    const user: SafeUser = {
      id: 1,
      name: "Alice Smith",
      email: "alice@example.com",
      role: "REQUESTER",
      active: true,
      mustChangePassword: false,
    };

    renderShellWithUser(user, logoutMock);

    const logoutBtn = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
      expect(screen.getByText("Login Screen")).toBeInTheDocument();
    });
  });
});
