import "../test-env.js";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { getPrisma } from "../../server/src/prisma.js";

const RUN_ID = process.env.RUN_ID || `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const screenshotBaseDir = process.env.SCREENSHOT_DIR
  ? path.resolve(process.env.SCREENSHOT_DIR)
  : path.resolve(process.cwd(), "artifacts/lab-03/screenshots", RUN_ID);

function assertValidScreenshot(filePath: string) {
  expect(fs.existsSync(filePath), `Screenshot file ${filePath} must exist`).toBe(true);
  const stats = fs.statSync(filePath);
  expect(
    stats.size,
    `Screenshot file ${filePath} must be larger than 10KB to ensure complete visual rendering (got ${stats.size} bytes)`
  ).toBeGreaterThan(10000);
  const buffer = fs.readFileSync(filePath);
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(
    buffer.subarray(0, 8).equals(pngHeader),
    `Screenshot file ${filePath} must contain valid PNG header signature`
  ).toBe(true);
}

async function assertNoHorizontalScroll(page: any) {
  const isOverflowing = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(isOverflowing).toBe(false);
}

test.describe("Responsive Layout & Visual Inspection (T50 / AC-50 / VISUAL-01)", () => {
  let sampleTicketId: number;
  let adminSessionToken: string;
  let staffSessionToken: string;
  let requesterSessionToken: string;
  let mustChangeSessionToken: string;

  const viewports = [
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "tablet-regression", width: 1024, height: 768 },
    { name: "desktop", width: 1280, height: 800 },
  ];

  test.beforeAll(async () => {
    // Ensure screenshot group directories exist
    const groups = ["authentication", "requester", "staff-queue", "staff-ticket-detail", "user-management"];
    for (const grp of groups) {
      const dir = path.join(screenshotBaseDir, grp);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const prisma = getPrisma();
    const { hashPassword } = await import("../../server/src/services/password.js");
    const { createSession } = await import("../../server/src/services/session.js");
    const testHash = await hashPassword("InitialPass123!");

    // 1. Admin
    let admin = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR", active: true } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: "Sarah Admin",
          email: "sarah.admin.resp@example.com",
          role: "ADMINISTRATOR",
          active: true,
          passwordHash: testHash,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    }
    const adminSession = await createSession(admin.id, admin.sessionVersion);
    adminSessionToken = adminSession.rawToken;

    // 2. Staff
    let staff = await prisma.user.findFirst({ where: { role: "IT_STAFF", active: true } });
    if (!staff) {
      staff = await prisma.user.create({
        data: {
          name: "Alice Staff",
          email: "alice.staff.resp@example.com",
          role: "IT_STAFF",
          active: true,
          passwordHash: testHash,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    }
    const staffSession = await createSession(staff.id, staff.sessionVersion);
    staffSessionToken = staffSession.rawToken;

    // 3. Requester
    let requester = await prisma.user.findFirst({ where: { role: "REQUESTER", active: true } });
    if (!requester) {
      requester = await prisma.user.create({
        data: {
          name: "Jennifer Requester",
          email: "jennifer.resp@example.com",
          role: "REQUESTER",
          active: true,
          passwordHash: testHash,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    }
    const reqSession = await createSession(requester.id, requester.sessionVersion);
    requesterSessionToken = reqSession.rawToken;

    // 4. User requiring password change
    let forcedUser = await prisma.user.findFirst({ where: { mustChangePassword: true, active: true } });
    if (!forcedUser) {
      forcedUser = await prisma.user.create({
        data: {
          name: "Forced User",
          email: "forced.resp@example.com",
          role: "REQUESTER",
          active: true,
          passwordHash: testHash,
          mustChangePassword: true,
          sessionVersion: 1,
        },
      });
    }
    const forcedSession = await createSession(forcedUser.id, forcedUser.sessionVersion);
    mustChangeSessionToken = forcedSession.rawToken;

    // Sample ticket
    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst();
    let ticket = await prisma.ticket.findFirst({ where: { requesterId: requester.id } });
    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-RESP-${Date.now()}`,
          summary: "Responsive Layout Verification Ticket",
          description: "Testing responsive layouts across 375px, 768px, 1024px, and 1280px viewports.",
          categoryId: cat!.id,
          relatedSystemId: sys!.id,
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          currentStatus: "IN_PROGRESS",
          requesterId: requester.id,
          ticketOwnerId: staff.id,
          version: 1,
        },
      });
    }
    sampleTicketId = ticket.id;
  });

  async function setCookieAndGo(page: any, token: string, url: string) {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "toktickit_session",
        value: token,
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto(url);
    await page.waitForLoadState("domcontentloaded");
  }

  for (const vp of viewports) {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`Authentication screens (${vp.name})`, async ({ page }) => {
        // Public Login
        await page.context().clearCookies();
        await page.goto("/login");
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator("h1")).toContainText("TokTickIT");
        await expect(page.locator("h2")).toContainText("Sign In");
        await assertNoHorizontalScroll(page);

        const loginShot = path.join(screenshotBaseDir, `authentication/login-${vp.name}.png`);
        await page.screenshot({ path: loginShot, fullPage: true });
        assertValidScreenshot(loginShot);

        // Forced Change Password
        await setCookieAndGo(page, mustChangeSessionToken, "/change-password");
        await expect(page.locator("h1")).toContainText("Change Password");
        await assertNoHorizontalScroll(page);

        const changePwdShot = path.join(screenshotBaseDir, `authentication/change-password-${vp.name}.png`);
        await page.screenshot({ path: changePwdShot, fullPage: true });
        assertValidScreenshot(changePwdShot);
      });

      test(`Requester screens (${vp.name})`, async ({ page }) => {
        // My Tickets
        await setCookieAndGo(page, requesterSessionToken, "/my-tickets");
        await expect(page.locator("h1")).toContainText("My Tickets");
        await assertNoHorizontalScroll(page);

        const myTicketsShot = path.join(screenshotBaseDir, `requester/my-tickets-${vp.name}.png`);
        await page.screenshot({ path: myTicketsShot, fullPage: true });
        assertValidScreenshot(myTicketsShot);

        // Create Ticket
        await page.goto("/tickets/new");
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator("h1")).toContainText("Create Ticket");
        await assertNoHorizontalScroll(page);

        const createShot = path.join(screenshotBaseDir, `requester/create-ticket-${vp.name}.png`);
        await page.screenshot({ path: createShot, fullPage: true });
        assertValidScreenshot(createShot);

        // Ticket Detail
        await page.goto(`/tickets/${sampleTicketId}`);
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator("h1, h2").first()).toBeVisible();
        await assertNoHorizontalScroll(page);

        const detailShot = path.join(screenshotBaseDir, `requester/ticket-detail-${vp.name}.png`);
        await page.screenshot({ path: detailShot, fullPage: true });
        assertValidScreenshot(detailShot);
      });

      test(`Staff Queue & Detail screens (${vp.name})`, async ({ page }) => {
        // Staff Queue
        await setCookieAndGo(page, staffSessionToken, "/staff/tickets");
        await expect(page.locator("h1")).toContainText("IT Staff Ticket Queue");
        await assertNoHorizontalScroll(page);

        const queueShot = path.join(screenshotBaseDir, `staff-queue/queue-${vp.name}.png`);
        await page.screenshot({ path: queueShot, fullPage: true });
        assertValidScreenshot(queueShot);

        // Staff Ticket Detail
        await page.goto(`/staff/tickets/${sampleTicketId}`);
        await page.waitForLoadState("domcontentloaded");
        await expect(page.locator("body")).toContainText("Operations Panel");
        await assertNoHorizontalScroll(page);

        const staffDetailShot = path.join(screenshotBaseDir, `staff-ticket-detail/detail-${vp.name}.png`);
        await page.screenshot({ path: staffDetailShot, fullPage: true });
        assertValidScreenshot(staffDetailShot);
      });

      test(`User Management screens (${vp.name})`, async ({ page }) => {
        // Admin Users
        await setCookieAndGo(page, adminSessionToken, "/admin/users");
        await expect(page.locator("h1")).toContainText("User Administration");
        await assertNoHorizontalScroll(page);

        const adminShot = path.join(screenshotBaseDir, `user-management/users-${vp.name}.png`);
        await page.screenshot({ path: adminShot, fullPage: true });
        assertValidScreenshot(adminShot);
      });
    });
  }
});
