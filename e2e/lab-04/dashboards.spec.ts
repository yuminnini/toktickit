import "../test-env.js";
import { test, expect } from "@playwright/test";
import { getPrisma } from "../../server/src/prisma.js";

test.describe("Lab 4 Role-Tailored Dashboards & Drill-Down E2E (AC-17–AC-21)", () => {
  test.describe.configure({ mode: "serial" });

  let createdTicketId: number;
  const ticketNumber = `TKT-L4-DSH-${Date.now()}`;
  const ticketSummary = `Lab 4 Dashboard Drill-Down Ticket ${Date.now()}`;

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

    await prisma.user.upsert({
      where: { email: "sarah.admin@example.com" },
      update: {
        name: "Sarah Admin",
        active: true,
        role: "ADMINISTRATOR",
        passwordHash: testHash,
        mustChangePassword: false,
      },
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
        description: "Dashboard E2E verification ticket assigned to Alice in IN_PROGRESS status.",
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        requesterId: reqUser.id,
        ticketOwnerId: staffUser.id,
        version: 1,
      },
    });
    createdTicketId = created.id;
  });

  test.afterAll(async () => {
    const prisma = getPrisma();
    try {
      await prisma.ticket.delete({ where: { id: createdTicketId } });
    } catch {}
  });

  test("1. Requester Dashboard displays authoritative metrics and drills down to filtered My Tickets (AC-17, AC-18)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "jennifer.anderson@example.com");
    await page.fill('input[type="password"]', "InitialPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/my-tickets");

    // Navigate to Dashboard via Navbar
    await page.getByRole("link", { name: /^Dashboard$/i }).click();
    await page.waitForURL("**/dashboard");

    await expect(page.getByTestId("requester-dashboard")).toBeVisible();
    await expect(page.getByTestId("req-metric-open")).toBeVisible();
    await expect(page.getByTestId("req-metric-in-progress")).toBeVisible();

    // Click "In Progress" card -> drills down to /my-tickets?status=IN_PROGRESS
    await page.getByTestId("req-metric-in-progress").click();
    await page.waitForURL("**/my-tickets?status=IN_PROGRESS");
    await expect(page.locator("#ticket-status-filter")).toHaveValue("IN_PROGRESS");
  });

  test("2. IT Staff Dashboard displays queue metrics and drills down to My Assigned queue (AC-19, AC-20)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "staff.alice@example.com");
    await page.fill('input[type="password"]', "InitialPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/staff/tickets");

    await page.getByRole("link", { name: /^Dashboard$/i }).click();
    await page.waitForURL("**/dashboard");

    await expect(page.getByTestId("staff-dashboard")).toBeVisible();
    await expect(page.getByTestId("metric-card-my-assigned")).toBeVisible();
    await expect(page.getByTestId("admin-user-stats-section")).toHaveCount(0);

    // Click "My Assigned" card -> drills down to /staff/tickets?owner=mine
    await page.getByTestId("metric-card-my-assigned").click();
    await page.waitForURL("**/staff/tickets?owner=mine");
    await expect(page.locator("h1")).toContainText("IT Staff Ticket Queue");
  });

  test("3. Administrator Dashboard displays queue metrics plus System User Accounts summary (AC-21)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "sarah.admin@example.com");
    await page.fill('input[type="password"]', "InitialPass123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/users");

    await page.getByRole("link", { name: /^Dashboard$/i }).click();
    await page.waitForURL("**/dashboard");

    await expect(page.getByTestId("staff-dashboard")).toBeVisible();
    await expect(page.getByTestId("admin-user-stats-section")).toBeVisible();
    await expect(page.getByTestId("stat-total-users")).toBeVisible();

    // Click "Manage Users ->" button -> navigates to /admin/users
    await page.getByTestId("manage-users-link").click();
    await page.waitForURL("**/admin/users");
  });
});

