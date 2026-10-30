import "../test-env.js";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { getPrisma } from "../../server/src/prisma.js";

const screenshotBaseDir = path.resolve(process.cwd(), "artifacts/lab-04/screenshots");

function assertValidScreenshot(filePath: string) {
  expect(fs.existsSync(filePath), `Screenshot file ${filePath} must exist`).toBe(true);
  const stats = fs.statSync(filePath);
  expect(
    stats.size,
    `Screenshot file ${filePath} must be larger than 10KB (got ${stats.size} bytes)`
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

test.describe("Lab 4 Responsive Layout, Accessibility & Screenshots (T23 / AC-23 / P13)", () => {
  let sampleTicketId: number;
  let adminSessionToken: string;
  let staffSessionToken: string;
  let requesterSessionToken: string;

  const viewports = [
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ];

  test.beforeAll(async () => {
    const groups = ["staff-dashboard", "requester-dashboard", "actions-taken"];
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

    const admin = await prisma.user.upsert({
      where: { email: "sarah.admin@example.com" },
      update: {
        name: "Sarah Admin",
        role: "ADMINISTRATOR",
        active: true,
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
    adminSessionToken = (await createSession(admin.id, admin.sessionVersion)).rawToken;

    const staff = await prisma.user.upsert({
      where: { email: "staff.alice@example.com" },
      update: {
        name: "Alice IT Support",
        role: "IT_STAFF",
        active: true,
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
    staffSessionToken = (await createSession(staff.id, staff.sessionVersion)).rawToken;

    const requester = await prisma.user.upsert({
      where: { email: "jennifer.anderson@example.com" },
      update: {
        name: "Jennifer Anderson",
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
    requesterSessionToken = (await createSession(requester.id, requester.sessionVersion)).rawToken;

    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-L4-RESP-${Date.now()}`,
        summary: "VPN Gateway Intermittent Disconnects in Building B",
        description: "Users on Floor 3 report VPN drops every 20 minutes during peak hours.",
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        requesterId: requester.id,
        ticketOwnerId: staff.id,
        version: 1,
      },
    });
    sampleTicketId = ticket.id;

    await prisma.actionTaken.createMany({
      data: [
        {
          ticketId: sampleTicketId,
          performedById: staff.id,
          actionDateTime: new Date(Date.now() - 3600000),
          description: "Inspected concentrator logs and identified MTU mismatch on VLAN 30.",
          result: "Adjusted tunnel MTU to 1400 bytes across Building B access points.",
          followUpRequired: true,
          followUpNote: "Monitor session drops over the next 4 hours and confirm with Floor 3 users.",
          attachmentNotes: "See concentrator_mtu_diff.log",
          version: 1,
        },
        {
          ticketId: sampleTicketId,
          performedById: staff.id,
          actionDateTime: new Date(Date.now() - 1800000),
          description: "Ran continuous ping and throughput test from Floor 3 test terminal.",
          result: "Zero packet loss observed over 30-minute window.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          version: 1,
        },
      ],
    });
  });

  test.afterAll(async () => {
    const prisma = getPrisma();
    try {
      await prisma.actionTaken.deleteMany({ where: { ticketId: sampleTicketId } });
      await prisma.ticket.delete({ where: { id: sampleTicketId } });
    } catch {}
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

      test(`IT Staff & Admin Dashboard screens (${vp.name})`, async ({ page }) => {
        await setCookieAndGo(page, staffSessionToken, "/dashboard");
        await expect(page.getByTestId("staff-dashboard")).toBeVisible();
        await assertNoHorizontalScroll(page);

        const staffShot = path.join(
          screenshotBaseDir,
          `staff-dashboard/staff-dashboard-${vp.name}.png`
        );
        await page.screenshot({ path: staffShot, fullPage: true });
        assertValidScreenshot(staffShot);

        // Admin view with userStats
        await setCookieAndGo(page, adminSessionToken, "/dashboard");
        await expect(page.getByTestId("admin-user-stats-section")).toBeVisible();
        await assertNoHorizontalScroll(page);

        const adminShot = path.join(
          screenshotBaseDir,
          `staff-dashboard/admin-dashboard-${vp.name}.png`
        );
        await page.screenshot({ path: adminShot, fullPage: true });
        assertValidScreenshot(adminShot);
      });

      test(`Requester Dashboard screen (${vp.name})`, async ({ page }) => {
        await setCookieAndGo(page, requesterSessionToken, "/dashboard");
        await expect(page.getByTestId("requester-dashboard")).toBeVisible();
        await assertNoHorizontalScroll(page);

        const reqShot = path.join(
          screenshotBaseDir,
          `requester-dashboard/requester-dashboard-${vp.name}.png`
        );
        await page.screenshot({ path: reqShot, fullPage: true });
        assertValidScreenshot(reqShot);
      });

      test(`Actions Taken on Staff & Requester Ticket Detail (${vp.name})`, async ({ page }) => {
        // Staff Ticket Detail with Actions Taken list + open form
        await setCookieAndGo(page, staffSessionToken, `/staff/tickets/${sampleTicketId}`);
        await expect(page.getByTestId("actions-taken-section")).toBeVisible();
        await expect(page.getByTestId("action-item")).toHaveCount(2);
        await page.getByTestId("record-action-btn").click();
        await expect(page.getByTestId("action-taken-form")).toBeVisible();
        await assertNoHorizontalScroll(page);

        const staffActionShot = path.join(
          screenshotBaseDir,
          `actions-taken/staff-actions-taken-${vp.name}.png`
        );
        await page.screenshot({ path: staffActionShot, fullPage: true });
        assertValidScreenshot(staffActionShot);

        // Requester Read-only Actions Taken view
        await setCookieAndGo(page, requesterSessionToken, `/tickets/${sampleTicketId}`);
        await expect(page.getByTestId("actions-taken-section")).toBeVisible();
        await expect(page.getByTestId("action-item")).toHaveCount(2);
        await assertNoHorizontalScroll(page);

        const reqActionShot = path.join(
          screenshotBaseDir,
          `actions-taken/requester-actions-readonly-${vp.name}.png`
        );
        await page.screenshot({ path: reqActionShot, fullPage: true });
        assertValidScreenshot(reqActionShot);
      });
    });
  }
});

