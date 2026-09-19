import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminUsersPage from "../../src/pages/AdminUsersPage";
import { AuthContext } from "../../src/context/AuthContext";
import * as api from "../../src/api";

const mockAdminUser: api.SafeUser = {
  id: 1,
  name: "Sarah Admin",
  email: "sarah.admin@example.com",
  role: "ADMINISTRATOR",
  active: true,
  mustChangePassword: false,
};

const sampleUsers: api.SafeUser[] = [
  {
    id: 1,
    name: "Sarah Admin",
    email: "sarah.admin@example.com",
    role: "ADMINISTRATOR",
    active: true,
    mustChangePassword: false,
  },
  {
    id: 2,
    name: "Bob Staff Tech",
    email: "bob.staff@example.com",
    role: "IT_STAFF",
    active: true,
    mustChangePassword: false,
  },
  {
    id: 3,
    name: "Rachel Requester",
    email: "rachel.requester@example.com",
    role: "REQUESTER",
    active: false,
    mustChangePassword: true,
  },
];

function renderAdminUsers() {
  return render(
    <MemoryRouter initialEntries={["/admin/users"]}>
      <AuthContext.Provider
        value={{
          user: mockAdminUser,
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        <Routes>
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("User Management UI (T49 / AC-49)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchUsersAdmin").mockResolvedValue(sampleUsers);
  });

  it("renders user table with columns, role badges, status badges, and action buttons", async () => {
    renderAdminUsers();

    await waitFor(() => {
      expect(screen.getAllByText("Sarah Admin").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("User Administration")).toBeInTheDocument();
    expect(screen.getAllByText("Bob Staff Tech").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rachel Requester").length).toBeGreaterThan(0);

    // Sarah is the current user, so "You" badge should appear
    expect(screen.getAllByText("You").length).toBeGreaterThan(0);

    // Active / Inactive statuses
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);

    // Action buttons
    expect(screen.getAllByRole("button", { name: /edit/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /reset password/i }).length).toBeGreaterThan(0);
  });

  it("filters users via search input and role filter", async () => {
    renderAdminUsers();

    await waitFor(() => {
      expect(screen.getAllByText("Sarah Admin").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByLabelText(/search users/i);
    fireEvent.change(searchInput, { target: { value: "bob" } });

    await waitFor(() => {
      expect(api.fetchUsersAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ search: "bob" }),
        expect.anything()
      );
    });

    const roleSelect = screen.getByLabelText(/filter by role/i);
    fireEvent.change(roleSelect, { target: { value: "IT_STAFF" } });

    await waitFor(() => {
      expect(api.fetchUsersAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ role: "IT_STAFF" }),
        expect.anything()
      );
    });

    // Clear filters button
    const clearBtn = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(api.fetchUsersAdmin).toHaveBeenCalledWith({}, expect.anything());
    });
  });

  it("opens Add User modal, validates inputs, and submits new user successfully", async () => {
    const createSpy = vi.spyOn(api, "createUserAdmin").mockResolvedValue({
      user: {
        id: 4,
        name: "New User",
        email: "new.user@example.com",
        role: "REQUESTER",
        active: true,
        mustChangePassword: true,
      },
    });

    renderAdminUsers();

    await waitFor(() => {
      expect(screen.getAllByText("Sarah Admin").length).toBeGreaterThan(0);
    });

    const addBtn = screen.getByRole("button", { name: /add user/i });
    fireEvent.click(addBtn);

    // Modal is open
    expect(screen.getByRole("heading", { name: "Add New User" })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/initial password/i);

    fireEvent.change(nameInput, { target: { value: "New User" } });
    fireEvent.change(emailInput, { target: { value: "new.user@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "ValidPassword123!" } });

    const submitBtn = screen.getByRole("button", { name: "Create User" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "New User",
        email: "new.user@example.com",
        role: "REQUESTER",
        active: true,
        initialPassword: "ValidPassword123!",
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
    });
  });

  it("disables active toggle when editing self and warns about ticket unassignment when deactivating staff", async () => {
    renderAdminUsers();

    await waitFor(() => {
      expect(screen.getAllByText("Sarah Admin").length).toBeGreaterThan(0);
    });

    // 1. Edit self (Sarah Admin): Active toggle must be disabled
    const editSelfBtn = screen.getAllByRole("button", { name: /edit sarah admin/i })[0];
    fireEvent.click(editSelfBtn);

    expect(screen.getByRole("heading", { name: "Edit User: Sarah Admin" })).toBeInTheDocument();
    const activeToggle = screen.getByLabelText("Active Account");
    expect(activeToggle).toBeDisabled();
    expect(screen.getByText(/you cannot deactivate your own administrator account/i)).toBeInTheDocument();

    // Cancel self edit
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // 2. Edit Bob Staff Tech: deactivating shows warning about ticket unassignment
    const editBobBtn = screen.getAllByRole("button", { name: /edit bob staff tech/i })[0];
    fireEvent.click(editBobBtn);

    expect(screen.getByRole("heading", { name: "Edit User: Bob Staff Tech" })).toBeInTheDocument();
    const bobActiveToggle = screen.getByLabelText("Active Account");
    expect(bobActiveToggle).not.toBeDisabled();

    // Toggle off active
    fireEvent.click(bobActiveToggle);

    // Warning about unassigning tickets should appear
    expect(screen.getByText(/will automatically unassign any open tickets/i)).toBeInTheDocument();

    const updateSpy = vi.spyOn(api, "updateUserAdmin").mockResolvedValue({
      user: {
        id: 2,
        name: "Bob Staff Tech",
        email: "bob.staff@example.com",
        role: "IT_STAFF",
        active: false,
        mustChangePassword: false,
      },
      unassignedTicketCount: 3,
    });

    const saveBtn = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(2, {
        name: "Bob Staff Tech",
        email: "bob.staff@example.com",
        role: "IT_STAFF",
        active: false,
      });
    });

    // Success banner reports unassigned tickets count
    await waitFor(() => {
      expect(screen.getByText(/3 assigned tickets unassigned/i)).toBeInTheDocument();
    });
  });

  it("opens Reset Password modal, shows policy helper, and submits reset successfully", async () => {
    const resetSpy = vi.spyOn(api, "resetUserPasswordAdmin").mockResolvedValue({
      user: {
        id: 2,
        name: "Bob Staff Tech",
        email: "bob.staff@example.com",
        role: "IT_STAFF",
        active: true,
        mustChangePassword: true,
      },
    });

    renderAdminUsers();

    await waitFor(() => {
      expect(screen.getAllByText("Bob Staff Tech").length).toBeGreaterThan(0);
    });

    const resetBtn = screen.getAllByRole("button", { name: /reset password for bob staff tech/i })[0];
    fireEvent.click(resetBtn);

    expect(screen.getByRole("heading", { name: /reset password for bob staff tech/i })).toBeInTheDocument();
    expect(screen.getByText(/will revoke any active sessions/i)).toBeInTheDocument();

    const newPwdInput = screen.getByLabelText(/new temporary password/i);
    fireEvent.change(newPwdInput, { target: { value: "NewTempPassword123!" } });

    // Test toggle reveal
    const showBtn = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(showBtn);
    expect(newPwdInput).toHaveAttribute("type", "text");

    const confirmBtn = screen.getByRole("button", { name: /confirm password reset/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith(2, "NewTempPassword123!");
    });

    await waitFor(() => {
      expect(screen.getByText(/password reset successfully for bob staff tech/i)).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully and displays error alerts", async () => {
    vi.spyOn(api, "createUserAdmin").mockRejectedValue(new Error("A user with this email already exists"));

    renderAdminUsers();

    await waitFor(() => {
      expect(screen.getAllByText("Sarah Admin").length).toBeGreaterThan(0);
    });

    const addBtn = screen.getByRole("button", { name: /add user/i });
    fireEvent.click(addBtn);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Duplicate User" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "dup@example.com" } });
    fireEvent.change(screen.getByLabelText(/initial password/i), { target: { value: "Password123456!" } });

    fireEvent.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(screen.getByText("A user with this email already exists")).toBeInTheDocument();
    });
  });
});
