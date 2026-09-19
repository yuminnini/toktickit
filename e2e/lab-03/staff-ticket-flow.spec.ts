import "../test-env.js";
import { test, expect } from "@playwright/test";
import { getPrisma } from "../../server/src/prisma.js";

test.describe("IT Staff Ticket Flow E2E (T39 / AC-39)", () => {
  test.describe.configure({ mode: "serial" });

  let ticketId: number;
  const ticketNumber = `TKT-E2E-${Date.now()}`;
  const ticketSummary = `E2E Staff Test Ticket ${Date.now()}`;

  test.beforeAll(async () => {
    const prisma = getPrisma();
    const { hashPassword } = await import("../../server/src/services/password.js");
    const testHash = await hashPassword("InitialPass123!");

    // Ensure staff Alice exists and has mustChangePassword: false
    await prisma.user.upsert({
      where: { email: "staff.alice@example.com" },
      update: {
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

    // Ensure a requester exists
    let reqUser = await prisma.user.findFirst({ where: { email: "jennifer.anderson@example.com" } });
    if (!reqUser) {
      reqUser = await prisma.user.create({
        data: {
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
          role: "REQUESTER",
          active: true,
          passwordHash: testHash,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    }

    // Get a category and related system
    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst();

    // Create unassigned ticket in OPEN status
    const createdTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary: ticketSummary,
        description: "Staff E2E test ticket description for triage and resolution flow.",
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "OPEN",
        requesterId: reqUser.id,
        ticketOwnerId: null, // unassigned
        version: 1,
      },
    });
    ticketId = createdTicket.id;
  });

  test.afterAll(async () => {
    const prisma = getPrisma();
    try {
      await prisma.publicComment.deleteMany({ where: { ticketId } });
      await prisma.internalNote.deleteMany({ where: { ticketId } });
      await prisma.ticket.delete({ where: { id: ticketId } });
    } catch {}
  });

  test("completes end-to-end staff flow: login -> triage queue -> claim -> prioritize -> comment -> resolve", async ({
    page,
  }) => {
    // 1. Login as IT Staff
    await page.goto("/login");
    await page.fill('input[type="email"]', "staff.alice@example.com");
    await page.fill('input[type="password"]', "InitialPass123!");
    await page.click('button[type="submit"]');

    // Should redirect to staff tickets queue
    await page.waitForURL("**/staff/tickets");
    await expect(page.locator("h1")).toContainText("IT Staff Ticket Queue");

    // 2. Triage: Search for our created ticket
    const searchInput = page.locator("#staff-search-input");
    await searchInput.fill(ticketNumber);

    // Verify ticket appears in queue table
    const ticketRow = page.locator(`tr:has-text("${ticketNumber}")`);
    await expect(ticketRow).toBeVisible();
    await expect(ticketRow).toContainText(ticketSummary);
    await expect(ticketRow).toContainText("Unassigned");

    // 3. Open Ticket Detail
    const openBtn = ticketRow.locator('button:has-text("Open")');
    await openBtn.click();
    await page.waitForURL(`**/staff/tickets/${ticketId}`);
    await expect(page.locator("h1")).toContainText(ticketNumber);

    // 4. Claim Ticket
    const claimBtn = page.locator('[data-testid="claim-ticket-btn"]');
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();

    // Verify claimed state
    await expect(page.locator("text=👤 Alice IT Support").first()).toBeVisible();
    await expect(claimBtn).not.toBeVisible();

    // 5. Prioritize Ticket: Change IT Priority to HIGH
    const itPrioritySelect = page.locator('[data-testid="it-priority-select"]');
    await itPrioritySelect.selectOption("HIGH");

    // Requested Priority remains Low (immutable)
    await expect(page.locator(".zen-card, .card").filter({ hasText: "Requested Priority" })).toContainText("Low");

    // 6. Communication: Post Public Comment
    const commentInput = page.locator("#comment-input");
    await commentInput.fill("We have identified the root cause and applied the patch.");
    await page.click('button:has-text("Post Comment")');

    await expect(
      page.locator(".comments-list").locator("text=We have identified the root cause and applied the patch.")
    ).toBeVisible();

    // Communication: Post Internal Note
    const noteInput = page.locator("#internal-note-input");
    await noteInput.fill("Internal note: Server restarted after configuration update.");
    await page.click('button:has-text("Post Internal Note")');

    await expect(
      page.locator(".notes-list").locator("text=Internal note: Server restarted after configuration update.")
    ).toBeVisible();

    // 7. Transition to IN_PROGRESS
    const statusSelect = page.locator('[data-testid="status-transition-select"]');
    await statusSelect.selectOption("IN_PROGRESS");

    const updateStatusBtn = page.locator('[data-testid="submit-status-btn"]');
    await updateStatusBtn.click();

    // Confirmation modal appears
    await expect(page.locator(".modal-title")).toContainText("Confirm Status Transition");
    const confirmBtn = page.locator('[data-testid="confirm-status-btn"]');
    await confirmBtn.click();

    // Modal closes and status badge updates to IN_PROGRESS
    await expect(page.locator(".modal")).not.toBeVisible();
    await expect(page.locator(".badge-zen").filter({ hasText: "In Progress" }).first()).toBeVisible();

    // 8. Resolve Ticket from IN_PROGRESS
    await statusSelect.selectOption("RESOLVED");
    await updateStatusBtn.click();

    await expect(page.locator(".modal-title")).toContainText("Confirm Status Transition");
    await confirmBtn.click();

    // Modal closes and status badge updates to RESOLVED
    await expect(page.locator(".modal")).not.toBeVisible();
    await expect(page.locator(".badge-zen").filter({ hasText: "Resolved" }).first()).toBeVisible();
  });
});
