import "../test-env.js";
import { test, expect } from "@playwright/test";
import { getPrisma } from "../../server/src/prisma.js";

test.describe("Lab 4 Actions Taken E2E Flow (T28 / AC-28, AC-01–AC-09)", () => {
  test.describe.configure({ mode: "serial" });

  let ticketId: number;
  const ticketNumber = `TKT-L4-ACT-${Date.now()}`;
  const ticketSummary = `Lab 4 E2E Actions Taken Ticket ${Date.now()}`;

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
        description: "E2E test ticket for recording, editing, and viewing Actions Taken.",
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
        requestedPriority: "MEDIUM",
        itPriority: "HIGH",
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

  test("T28: IT Staff records and edits Action Taken with follow-up validation; Requester views read-only", async ({
    page,
  }) => {
    // 1. Login as IT Staff (Alice)
    await page.goto("/login");
    await page.fill('input[type="email"]', "staff.alice@example.com");
    await page.fill('input[type="password"]', "InitialPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/staff/tickets");

    // 2. Navigate to Staff Ticket Detail
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.locator("h1")).toContainText(ticketNumber);
    await expect(page.getByTestId("actions-empty-state")).toBeVisible();

    // 3. Click "+ Record Action Taken"
    await page.getByTestId("record-action-btn").click();
    await expect(page.getByTestId("action-taken-form")).toBeVisible();

    // Verify auto-populated performer
    await expect(page.locator("#action-performer-input")).toHaveValue("Alice IT Support");

    // Fill description and result
    await page.fill(
      "#action-description-input",
      "Flushed DNS cache and reconfigured network adapter bindings."
    );
    await page.fill("#action-result-input", "Adapter reconnected with zero packet drops.");

    // Toggle Follow-Up Required ON without note -> verify validation error
    await page.check("#action-followup-toggle");
    await page.getByTestId("save-action-btn").click();
    await expect(page.getByTestId("action-form-error")).toContainText(
      "Follow-up note is required when follow-up is enabled"
    );

    // Provide follow-up note and attachment note, then save
    await page.fill(
      "#action-followup-note-input",
      "Verify stability with user after 24 hours of uptime."
    );
    await page.fill("#action-attachment-notes-input", "Refer to network_diag_log.txt");
    await page.getByTestId("save-action-btn").click();

    // 4. Verify Action Taken is rendered in chronological list
    await expect(page.getByTestId("action-taken-form")).not.toBeVisible();
    await expect(page.getByTestId("action-item")).toHaveCount(1);
    await expect(page.getByTestId("actions-count-badge")).toHaveText("1");
    await expect(page.getByTestId("followup-required-badge")).toBeVisible();
    await expect(page.getByTestId("action-followup-note")).toContainText(
      "Verify stability with user after 24 hours of uptime."
    );
    await expect(page.getByTestId("action-attachment-note")).toContainText(
      "Refer to network_diag_log.txt"
    );

    // 5. Edit the Action Taken
    const editBtn = page.locator('[data-testid^="edit-action-btn-"]').first();
    await editBtn.click();
    await expect(page.getByTestId("action-taken-form")).toBeVisible();

    await page.fill(
      "#action-result-input",
      "Adapter reconnected with zero packet drops; confirmed via ping test."
    );
    await page.getByTestId("save-action-btn").click();

    await expect(page.getByTestId("action-taken-form")).not.toBeVisible();
    await expect(page.getByTestId("action-item")).toContainText(
      "Adapter reconnected with zero packet drops; confirmed via ping test."
    );

    // 6. Log out and log in as Requester (Jennifer Anderson)
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL("**/login");

    await page.fill('input[type="email"]', "jennifer.anderson@example.com");
    await page.fill('input[type="password"]', "InitialPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/my-tickets");

    // 7. Open Requester Ticket Detail and verify read-only Actions Taken
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.locator("h1.ticket-number")).toHaveText(ticketNumber);
    await expect(page.getByTestId("action-item")).toHaveCount(1);
    await expect(page.getByTestId("action-item")).toContainText(
      "Flushed DNS cache and reconfigured network adapter bindings."
    );

    // Requester must NOT see "+ Record Action Taken" or "Edit" buttons
    await expect(page.getByTestId("record-action-btn")).toHaveCount(0);
    await expect(page.locator('[data-testid^="edit-action-btn-"]')).toHaveCount(0);
  });
});

