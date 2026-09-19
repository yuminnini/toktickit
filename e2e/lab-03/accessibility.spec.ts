import "../test-env.js";
import { test, expect } from "@playwright/test";
import { getPrisma } from "../../server/src/prisma.js";

test.describe("Accessibility Verification (T52 / AC-52 / VISUAL-01)", () => {
  const defaultPassword = "InitialPass123!";
  let sampleTicketId: number;

  test.beforeAll(async () => {
    const prisma = getPrisma();
    const { hashPassword } = await import("../../server/src/services/password.js");
    const testHash = await hashPassword(defaultPassword);

    // Ensure Admin Sarah exists
    await prisma.user.upsert({
      where: { email: "sarah.admin@example.com" },
      update: { role: "ADMINISTRATOR", active: true, passwordHash: testHash, mustChangePassword: false },
      create: {
        name: "Sarah Admin",
        email: "sarah.admin@example.com",
        role: "ADMINISTRATOR",
        active: true,
        passwordHash: testHash,
        mustChangePassword: false,
        sessionVersion: 1,
      },
    });

    // Ensure Staff Alice exists
    const staff = await prisma.user.upsert({
      where: { email: "staff.alice@example.com" },
      update: { role: "IT_STAFF", active: true, passwordHash: testHash, mustChangePassword: false },
      create: {
        name: "Alice Staff",
        email: "staff.alice@example.com",
        role: "IT_STAFF",
        active: true,
        passwordHash: testHash,
        mustChangePassword: false,
        sessionVersion: 1,
      },
    });

    // Ensure Requester exists
    const req = await prisma.user.upsert({
      where: { email: "jennifer.anderson@example.com" },
      update: { role: "REQUESTER", active: true, passwordHash: testHash, mustChangePassword: false },
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

    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst();
    let ticket = await prisma.ticket.findFirst({ where: { requesterId: req.id } });
    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-A11Y-${Date.now()}`,
          summary: "Accessibility Verification Ticket",
          description: "Ticket for verifying accessible controls, focus indicators, and labels.",
          categoryId: cat!.id,
          relatedSystemId: sys!.id,
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          currentStatus: "IN_PROGRESS",
          requesterId: req.id,
          ticketOwnerId: staff.id,
          version: 1,
        },
      });
    }
    sampleTicketId = ticket.id;
  });

  test("1. Form controls have properly associated <label> elements (AC-52)", async ({ page }) => {
    // Check Login Page
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();

    const formInputs = await page.locator("input:not([type='hidden']), select, textarea").all();
    expect(formInputs.length).toBeGreaterThan(0);

    for (const input of formInputs) {
      const hasAccessibleLabel = await input.evaluate((el: HTMLInputElement) => {
        const id = el.id;
        const ariaLabel = el.getAttribute("aria-label");
        const ariaLabelledby = el.getAttribute("aria-labelledby");
        const hasLabelElement = id ? document.querySelector(`label[for="${id}"]`) !== null : false;
        const hasParentLabel = el.closest("label") !== null;
        return Boolean(ariaLabel || ariaLabelledby || hasLabelElement || hasParentLabel);
      });
      expect(hasAccessibleLabel, `Input must have an associated label or aria-label`).toBe(true);
    }
  });

  test("2. Interactive controls meet minimum 44px touch target guidelines (AC-52)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Login submit button
    const submitBtn = page.locator('button[type="submit"]');
    const submitBox = await submitBtn.boundingBox();
    expect(submitBox).not.toBeNull();
    expect(submitBox!.height).toBeGreaterThanOrEqual(44);

    // Email and Password inputs
    const emailInput = page.locator('input[type="email"]');
    const emailBox = await emailInput.boundingBox();
    expect(emailBox).not.toBeNull();
    expect(emailBox!.height).toBeGreaterThanOrEqual(44);

    const passwordInput = page.locator('input[type="password"]');
    const passwordBox = await passwordInput.boundingBox();
    expect(passwordBox).not.toBeNull();
    expect(passwordBox!.height).toBeGreaterThanOrEqual(44);
  });

  test("3. Focus rings and keyboard tab navigation (AC-52)", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Tab into first focusable control
    await page.keyboard.press("Tab");

    // Active element must have visible focus indication (outline or box-shadow)
    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const hasOutline = style.outlineStyle !== "none" && style.outlineWidth !== "0px";
      const hasBoxShadow = style.boxShadow !== "none" && style.boxShadow !== "";
      return hasOutline || hasBoxShadow;
    });
    expect(hasFocusIndicator).toBe(true);
  });

  test("4. Dialog accessibility, ARIA attributes, and Escape key dismissal (AC-52)", async ({
    page,
  }) => {
    // Login as Admin
    await page.goto("/login");
    await page.fill('input[type="email"]', "sarah.admin@example.com");
    await page.fill('input[type="password"]', defaultPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/users");

    // Open Add User Dialog
    const addUserBtn = page.getByRole("button", { name: "Add User" });
    await addUserBtn.click();

    // Verify dialog role, aria-modal, and accessible name
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-labelledby", "create-user-modal-title");

    // Press Escape key to close dialog
    await page.keyboard.press("Escape");

    // Verify modal is closed
    await expect(dialog).not.toBeVisible();
  });

  test("5. Status alerts use ARIA live regions for assistive announcements (AC-52)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "sarah.admin@example.com");
    await page.fill('input[type="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    // Error alert should have role="alert" or aria-live attribute
    const alert = page.locator(".alert-danger");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveAttribute("role", "alert");
  });
});
