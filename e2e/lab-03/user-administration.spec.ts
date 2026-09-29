import "../test-env.js";
import { test, expect } from "@playwright/test";
import { getPrisma } from "../../server/src/prisma.js";

test.describe("Administrator User Management E2E (ADMIN-E2E / AC-40–AC-49)", () => {
  test.describe.configure({ mode: "serial" });

  const adminEmail = "sarah.admin@example.com";
  const defaultPassword = "InitialPass123!";
  const testStaffEmail = `e2e.staff.${Date.now()}@example.com`;
  const newStaffPassword = "NewStaffPassword456!";
  const resetStaffPassword = "ResetStaffPassword789!";

  let createdStaffUserId: number;
  let testTicketId: number;

  test.beforeAll(async () => {
    const prisma = getPrisma();
    const { hashPassword } = await import("../../server/src/services/password.js");
    const testHash = await hashPassword(defaultPassword);

    // Ensure Admin Sarah exists
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: "ADMINISTRATOR",
        active: true,
        passwordHash: testHash,
        mustChangePassword: false,
      },
      create: {
        name: "Sarah Admin",
        email: adminEmail,
        role: "ADMINISTRATOR",
        active: true,
        passwordHash: testHash,
        mustChangePassword: false,
        sessionVersion: 1,
      },
    });

    // Ensure a regular Requester exists
    await prisma.user.upsert({
      where: { email: "jennifer.anderson@example.com" },
      update: {
        role: "REQUESTER",
        active: true,
        passwordHash: testHash,
        mustChangePassword: false,
      },
      create: {
        name: "Jennifer Anderson",
        email: "jennifer.anderson@example.com",
        role: "REQUESTER",
        active: true,
        passwordHash: testHash,
        mustChangePassword: false,
        sessionVersion: 1,
      },
    });
  });

  test.afterAll(async () => {
    const prisma = getPrisma();
    try {
      if (testTicketId) {
        await prisma.ticket.delete({ where: { id: testTicketId } }).catch(() => {});
      }
      if (createdStaffUserId) {
        await prisma.session.deleteMany({ where: { userId: createdStaffUserId } }).catch(() => {});
        await prisma.user.delete({ where: { id: createdStaffUserId } }).catch(() => {});
      }
    } catch {}
  });

  async function loginAs(page: any, email: string, password = defaultPassword) {
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
  }

  test("1. Admin logs in and views user administration page with search and filter controls", async ({
    page,
  }) => {
    await loginAs(page, adminEmail);

    // Admin should automatically redirect to /admin/users
    await page.waitForURL("**/admin/users");
    await expect(page.locator("h1")).toContainText("User Administration");

    // Search and filter toolbar should be visible
    await expect(page.locator("#user-search-input")).toBeVisible();
    await expect(page.locator("#role-filter-select")).toBeVisible();

    // Sarah Admin should appear in the table
    await expect(page.locator("body")).toContainText("Sarah Admin");
  });

  test("2. Admin creates a new IT Staff user (AC-40, AC-41)", async ({ page }) => {
    await loginAs(page, adminEmail);
    await page.waitForURL("**/admin/users");

    // Click "Add User" button
    const addUserBtn = page.getByRole("button", { name: "Add User" });
    await addUserBtn.click();

    // Verify Add User modal is displayed
    const modalTitle = page.locator("#create-user-modal-title");
    await expect(modalTitle).toBeVisible();

    // Fill form
    await page.fill("#create-user-name", "E2E Staff Member");
    await page.fill("#create-user-email", testStaffEmail);
    await page.selectOption("#create-user-role", "IT_STAFF");
    await page.fill("#create-user-password", defaultPassword);

    // Submit
    const submitBtn = page.locator('div[role="dialog"] button[type="submit"]');
    await submitBtn.click();

    // Modal closes and success alert appears
    await expect(modalTitle).not.toBeVisible();
    await expect(page.locator(".alert-success")).toContainText("User created successfully");

    // The new user should appear in the user list
    const searchInput = page.locator("#user-search-input");
    await searchInput.fill(testStaffEmail);
    await expect(page.locator("body")).toContainText("E2E Staff Member");

    // Get created user ID from database for subsequent steps
    const prisma = getPrisma();
    const createdUser = await prisma.user.findUnique({ where: { email: testStaffEmail } });
    expect(createdUser).not.toBeNull();
    expect(createdUser!.mustChangePassword).toBe(true);
    createdStaffUserId = createdUser!.id;
  });

  test("3. Newly created user is forced to change password on first login (AC-41, AC-02, AC-12)", async ({
    browser,
  }) => {
    // Open fresh incognito context
    const context = await browser.newContext();
    const userPage = await context.newPage();

    await userPage.goto("/login");
    await userPage.fill('input[type="email"]', testStaffEmail);
    await userPage.fill('input[type="password"]', defaultPassword);
    await userPage.click('button[type="submit"]');

    // Must be forced to /change-password
    await userPage.waitForURL("**/change-password");
    await expect(userPage.locator("body")).toContainText("Change Password");

    // Submit new password
    await userPage.fill("#currentPassword", defaultPassword);
    await userPage.fill("#newPassword", newStaffPassword);
    await userPage.fill("#confirmPassword", newStaffPassword);
    await userPage.click('button[type="submit"]');

    // Should successfully redirect to staff dashboard
    await userPage.waitForURL("**/staff/tickets");
    await expect(userPage.locator("h1")).toContainText("IT Staff Ticket Queue");

    // Verify mustChangePassword is now false in DB
    const prisma = getPrisma();
    const updated = await prisma.user.findUnique({ where: { id: createdStaffUserId } });
    expect(updated!.mustChangePassword).toBe(false);

    await context.close();
  });

  test("4. Admin deactivating an assigned staff member atomically unassigns their tickets (AC-46)", async ({
    page,
  }) => {
    const prisma = getPrisma();
    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst();
    const req = await prisma.user.findFirst({ where: { role: "REQUESTER" } });

    // Create a ticket assigned to our staff user
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-UNASSIGN-${Date.now()}`,
        summary: "E2E Ticket for Unassignment Test",
        description: "Testing atomic unassignment when staff member is deactivated.",
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
        requestedPriority: "MEDIUM",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        requesterId: req!.id,
        ticketOwnerId: createdStaffUserId,
        version: 1,
      },
    });
    testTicketId = ticket.id;

    // Login as Admin
    await page.goto("/login");
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', defaultPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/users");

    // Find and edit the staff user
    const searchInput = page.locator("#user-search-input");
    await searchInput.fill(testStaffEmail);
    await expect(page.locator("body")).toContainText("E2E Staff Member");

    // Click Edit button
    const editBtn = page.locator(`button[aria-label="Edit E2E Staff Member"]`).first();
    await editBtn.click();

    const editModalTitle = page.locator("#edit-user-modal-title");
    await expect(editModalTitle).toBeVisible();

    // Deactivate user by unchecking Active
    const activeCheckbox = page.locator("#edit-user-active");
    await activeCheckbox.uncheck();

    // Warning about unassigning tickets should appear
    await expect(page.locator('div[role="dialog"] .alert-warning')).toContainText(
      "unassign any open tickets they currently own"
    );

    // Save changes
    const saveBtn = page.locator('div[role="dialog"] button[type="submit"]');
    await saveBtn.click();

    // Modal closes and success alert shows unassigned ticket count
    await expect(editModalTitle).not.toBeVisible();
    await expect(page.locator(".alert-success")).toContainText("1 assigned tickets unassigned");

    // Verify ticket in DB is now unassigned (ticketOwnerId === null) and version incremented
    const updatedTicket = await prisma.ticket.findUnique({ where: { id: testTicketId } });
    expect(updatedTicket!.ticketOwnerId).toBeNull();
    expect(updatedTicket!.version).toBe(2);
  });

  test("5. Admin resets user password and forces mustChangePassword (AC-47)", async ({ page }) => {
    await loginAs(page, adminEmail);
    await page.waitForURL("**/admin/users");

    const searchInput = page.locator("#user-search-input");
    await searchInput.fill(testStaffEmail);
    await expect(page.locator("body")).toContainText("E2E Staff Member");

    // Click Reset Password button
    const resetBtn = page.locator(`button[aria-label="Reset Password for E2E Staff Member"]`).first();
    await resetBtn.click();

    const resetModalTitle = page.locator("#reset-password-modal-title");
    await expect(resetModalTitle).toBeVisible();

    // Enter new temporary password
    await page.fill("#reset-user-password", resetStaffPassword);
    const submitResetBtn = page.locator('div[role="dialog"] button[type="submit"]');
    await submitResetBtn.click();

    await expect(resetModalTitle).not.toBeVisible();
    await expect(page.locator(".alert-success")).toContainText("Password reset successfully");

    // Verify in DB that mustChangePassword is back to true
    const prisma = getPrisma();
    const userAfterReset = await prisma.user.findUnique({ where: { id: createdStaffUserId } });
    expect(userAfterReset!.mustChangePassword).toBe(true);
  });

  test("6. Self-deactivation is disabled for current administrator (AC-44)", async ({ page }) => {
    await loginAs(page, adminEmail);
    await page.waitForURL("**/admin/users");

    const searchInput = page.locator("#user-search-input");
    await searchInput.fill(adminEmail);
    await expect(page.locator("body")).toContainText("Sarah Admin");

    // Click Edit on self
    const editBtn = page.locator(`button[aria-label="Edit Sarah Admin"]`).first();
    await editBtn.click();

    const editModalTitle = page.locator("#edit-user-modal-title");
    await expect(editModalTitle).toBeVisible();

    // Active checkbox must be disabled
    const activeCheckbox = page.locator("#edit-user-active");
    await expect(activeCheckbox).toBeDisabled();

    // Helpful warning/hint is displayed
    await expect(page.locator('div[role="dialog"] .text-muted')).toContainText("You cannot deactivate your own administrator account");

    // Cancel modal
    await page.locator('div[role="dialog"] button:has-text("Cancel")').click();
    await expect(editModalTitle).not.toBeVisible();
  });

  test("7. Non-admin user cannot access user management screens or APIs (AC-48)", async ({
    page,
  }) => {
    // Login as Requester
    await page.goto("/login");
    await page.fill('input[type="email"]', "jennifer.anderson@example.com");
    await page.fill('input[type="password"]', defaultPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/my-tickets");

    // Attempt direct navigation to /admin/users
    await page.goto("/admin/users");

    // Should display 403 Forbidden or route guard block
    await expect(page.locator("body")).toContainText(/403|Forbidden|Access Denied/i);
    await expect(page.locator("#addUserModal")).toHaveCount(0);
  });
});
