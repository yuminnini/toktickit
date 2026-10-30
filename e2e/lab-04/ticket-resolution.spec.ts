import "../test-env.js";
import { test, expect } from "@playwright/test";
import { getPrisma } from "../../server/src/prisma.js";

test.describe("Lab 4 Ticket Resolution & Advisory Flow E2E (AC-06 / D2, AC-10, AC-11, AC-12)", () => {
  test.describe.configure({ mode: "serial" });

  let ticketId: number;
  const ticketNumber = `TKT-L4-RES-${Date.now()}`;
  const ticketSummary = `Lab 4 E2E Resolution Gate Ticket ${Date.now()}`;

  test.beforeAll(async () => {
    const prisma = getPrisma();
    const { hashPassword } = await import("../../server/src/services/password.js");
    const testHash = await hashPassword("InitialPass123!");

    const staffUser = await prisma.user.upsert({
      where: { email: "staff.alice@example.com" },
      update: {
        name: "Alice IT Support",
        active: true,
        role: "IT_STAFF",
        passwordHash: testHash,
        mustChangePassword: false,
      },
      create: {
        name: "Alice IT Support",
        email: "staff.alice@example.com",
        role: "IT_STAFF",
        active: true,
        passwordHash: testHash,
        mustChangePassword: false,
        sessionVersion: 1,
      },
    });

    const reqUser = await prisma.user.upsert({
      where: { email: "jennifer.anderson@example.com" },
      update: {
        name: "Jennifer Anderson",
        active: true,
        role: "REQUESTER",
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

    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst();

    const created = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary: ticketSummary,
        description: "E2E test ticket for verifying advisory resolution and staff resolution gate.",
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "IN_PROGRESS",
        requesterId: reqUser.id,
        ticketOwnerId: staffUser.id,
        version: 1,
      },
    });
    ticketId = created.id;
  });

  test.afterAll(async () => {
    const prisma = getPrisma();
    try {
      await prisma.actionTaken.deleteMany({ where: { ticketId } });
      await prisma.ticket.delete({ where: { id: ticketId } });
    } catch {}
  });

  test("Requester marks Problem Appears Resolved (advisory); IT Staff records Action Taken and resolves ticket", async ({
    page,
  }) => {
    // 1. Login as Requester
    await page.goto("/login");
    await page.fill('input[type="email"]', "jennifer.anderson@example.com");
    await page.fill('input[type="password"]', "InitialPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/my-tickets");

    // 2. Open Ticket Detail and click "Problem Appears Resolved"
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.locator("h1.ticket-number")).toHaveText(ticketNumber);

    const appearsResolvedBtn = page.getByTestId("problem-appears-resolved-btn");
    await expect(appearsResolvedBtn).toBeVisible();
    await appearsResolvedBtn.click();

    await page.getByRole("button", { name: /confirm resolution/i }).click();

    // Verify advisory banner appears while status remains In Progress
    await expect(page.locator("body")).toContainText("You indicated this problem appeared resolved");
    await expect(page.locator(".badge-zen").filter({ hasText: "In Progress" }).first()).toBeVisible();

    // 3. Log out and log in as IT Staff
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL("**/login");

    await page.fill('input[type="email"]', "staff.alice@example.com");
    await page.fill('input[type="password"]', "InitialPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/staff/tickets");

    // 4. Open Staff Ticket Detail
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.locator("body")).toContainText("Requester Indication:");

    // Selecting RESOLVED with 0 actions shows resolution gate notice (Decision D2)
    const statusSelect = page.getByTestId("status-transition-select");
    await statusSelect.selectOption("RESOLVED");
    await expect(page.getByTestId("resolution-gate-notice")).toBeVisible();

    // 5. Record an Action Taken first
    await page.getByTestId("record-action-btn").click();
    await page.fill("#action-description-input", "Verified service health and confirmed fix with requester.");
    await page.fill("#action-result-input", "Issue is completely resolved.");
    await page.getByTestId("save-action-btn").click();
    await expect(page.getByTestId("action-item")).toHaveCount(1);

    // Resolution gate warning disappears once >= 1 Action Taken exists
    await expect(page.getByTestId("resolution-gate-notice")).toHaveCount(0);

    // 6. Transition ticket status to RESOLVED
    await page.getByTestId("submit-status-btn").click();
    await page.getByTestId("confirm-status-btn").click();

    await expect(page.locator(".badge-zen").filter({ hasText: "Resolved" }).first()).toBeVisible();
    // Actions Taken section is now locked because ticket is RESOLVED (Decision D5)
    await expect(page.getByTestId("actions-locked-notice")).toBeVisible();
  });
});

