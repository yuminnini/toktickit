import "../test-env.js";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { getPrisma } from "../../server/src/prisma.js";
import { ResponseRegistrationTracker } from "../../server/src/harness-guard.js";

const API_PORT = process.env.TEST_API_PORT || "3103";
const API_BASE_URL = process.env.API_URL || `http://localhost:${API_PORT}`;

test.describe("Requester Ticket Flow E2E (E2E-01, E2E-02, AC-01, AC-03, AC-10, AC-11, AC-13, AC-14, AC-15)", () => {
  test.describe.configure({ mode: "serial" });

  let createdTicketNumber = "";
  let createdTicketUrl = "";
  let createdTicketId = "";
  let createdAttachmentId = "";
  const createdTicketIds: number[] = [];
  const createdAttachmentIds: number[] = [];
  const responseTracker = new ResponseRegistrationTracker();

  test.beforeAll(async () => {
    const prisma = getPrisma();
    const { hashPassword } = await import("../../server/src/services/password.js");
    const testHash = await hashPassword("InitialPass123!");

    await prisma.user.upsert({
      where: { email: "jennifer.anderson@example.com" },
      update: {
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

    await prisma.user.upsert({
      where: { email: "michael.brown@example.com" },
      update: {
        active: true,
        passwordHash: testHash,
        mustChangePassword: false,
      },
      create: {
        name: "Michael Brown",
        email: "michael.brown@example.com",
        role: "REQUESTER",
        active: true,
        passwordHash: testHash,
        mustChangePassword: false,
        sessionVersion: 1,
      },
    });
  });

  // Register created resource IDs asynchronously immediately upon response reception,
  // ensuring IDs are captured even if submitBtn.click() times out or throws.
  test.beforeEach(async ({ page }) => {
    page.on("response", (response) => {
      responseTracker.handleResponse(response);
    });
  });

  // Ensure all pending response body parsing completes before Playwright closes the page fixture
  test.afterEach(async () => {
    await responseTracker.waitForRegistrations();
  });

  test.afterAll(async () => {
    // 1. Wait for all in-flight response ID registrations to resolve
    await responseTracker.waitForRegistrations();

    // Propagate any response registration/parsing errors so teardown fails explicitly
    const cleanupErrors: string[] = [...responseTracker.registrationErrors];
    const uncleanedResources: string[] = [];
    let prisma: any = null;

    try {
      prisma = getPrisma();
      const uploadDir = process.env.UPLOAD_DIR || "uploads_test";

      // 2. Discover and delete all tickets and associated attachments created during this test run
      const ticketIdSet = new Set<number>([...createdTicketIds, ...responseTracker.ticketIds]);
      const ticketNumbersToQuery = new Set<string>();
      if (createdTicketNumber) ticketNumbersToQuery.add(createdTicketNumber);
      for (const num of responseTracker.ticketNumbers) {
        ticketNumbersToQuery.add(num);
      }

      for (const num of ticketNumbersToQuery) {
        try {
          const t = await prisma.ticket.findUnique({
            where: { ticketNumber: num },
            select: { id: true },
          });
          if (t) ticketIdSet.add(t.id);
        } catch (err: any) {
          cleanupErrors.push(`Failed to query ticket by number '${num}': ${err.message}`);
        }
      }

      for (const tId of ticketIdSet) {
        let attachments: any[] = [];
        try {
          attachments = await prisma.attachment.findMany({ where: { ticketId: tId } });
        } catch (err: any) {
          cleanupErrors.push(`Failed to query attachments for ticket ${tId}: ${err.message}`);
          uncleanedResources.push(`Ticket ${tId}`);
          continue;
        }

        for (const att of attachments) {
          createdAttachmentIds.push(att.id);
          const fullPath = path.resolve(uploadDir, att.storedFilename);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (err: any) {
              cleanupErrors.push(`Failed to unlink storage file '${fullPath}': ${err.message}`);
              uncleanedResources.push(`Attachment file: ${fullPath} (Attachment ID: ${att.id})`);
            }
          }
        }

        try {
          await prisma.attachment.deleteMany({ where: { ticketId: tId } });
        } catch (err: any) {
          cleanupErrors.push(`Failed to delete attachments from DB for ticket ${tId}: ${err.message}`);
          uncleanedResources.push(`Attachments for ticket ${tId}`);
        }

        try {
          const existing = await prisma.ticket.findUnique({ where: { id: tId } });
          if (existing) {
            await prisma.ticket.delete({ where: { id: tId } });
          }
        } catch (err: any) {
          cleanupErrors.push(`Failed to delete ticket ${tId} from DB: ${err.message}`);
          uncleanedResources.push(`Ticket DB record (ID: ${tId})`);
        }
      }

      // 3. Clean any remaining standalone attachment records and physical files
      const attachmentIdSet = new Set<number>([...createdAttachmentIds, ...responseTracker.attachmentIds]);
      for (const attId of attachmentIdSet) {
        try {
          const att = await prisma.attachment.findUnique({ where: { id: attId } });
          if (att) {
            const fullPath = path.resolve(uploadDir, att.storedFilename);
            if (fs.existsSync(fullPath)) {
              try {
                fs.unlinkSync(fullPath);
              } catch (err: any) {
                cleanupErrors.push(`Failed to unlink storage file '${fullPath}': ${err.message}`);
                uncleanedResources.push(`Attachment file: ${fullPath}`);
              }
            }
            try {
              await prisma.attachment.delete({ where: { id: attId } });
            } catch (err: any) {
              cleanupErrors.push(`Failed to delete attachment record ${attId}: ${err.message}`);
              uncleanedResources.push(`Attachment DB record (ID: ${attId})`);
            }
          }
        } catch (err: any) {
          cleanupErrors.push(`Failed to process attachment ${attId}: ${err.message}`);
        }
      }
    } catch (err: any) {
      cleanupErrors.push(`Fatal error in teardown execution: ${err.message}`);
    } finally {
      if (prisma) {
        await prisma.$disconnect().catch(() => {});
      }
    }

    if (cleanupErrors.length > 0 || uncleanedResources.length > 0) {
      const details = [
        `[E2E CLEANUP FAILED] Encountered ${cleanupErrors.length} error(s) during teardown:`,
        ...cleanupErrors.map((e, idx) => `  ${idx + 1}. ${e}`),
        ...(uncleanedResources.length > 0
          ? [`Uncleaned resources:`, ...uncleanedResources.map((r) => `  - ${r}`)]
          : []),
      ].join("\n");
      throw new Error(details);
    }
  });

  test("E2E-01: Select Requester -> Create Ticket with attachment -> My Tickets -> Ticket Detail, Real Download & Soft Remove", async ({
    page,
  }) => {
    // 1. Navigate to Login page
    await page.goto("/login");
    await expect(page).toHaveTitle(/TokTickIT/);

    // 2. Log in as Requester A (Jennifer Anderson)
    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("InitialPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // 3. Arrive at My Tickets
    await expect(page).toHaveURL(/.*my-tickets/);
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();

    // 4. Click "+ Create Ticket" button
    const createBtn = page.getByRole("button", { name: /\+ Create Ticket/i });
    await createBtn.click();
    await expect(page).toHaveURL(/.*tickets\/new/);

    // 5. Fill Create Ticket form
    const categorySelect = page.locator("#categoryId");
    await expect(categorySelect).not.toBeDisabled();
    await categorySelect.selectOption({ label: "Hardware" });

    const systemSelect = page.locator("#relatedSystemId");
    await expect(systemSelect).not.toBeDisabled();
    await systemSelect.selectOption({ label: "Corporate Laptop" });
    await page.locator("#summary").fill("E2E Test Laptop Screen Glitch");
    await page
      .locator("#description")
      .fill("Screen flickers intermittently whenever moving the display hinge. Attaching diagnostics screenshot.");
    await page.locator("#requestedPriority").selectOption("HIGH");

    // 6. Attach file via file input
    const fixturePath = path.resolve(process.cwd(), "e2e/fixtures/sample-attachment.png");
    const fileInput = page.locator("#attachment-input");
    await fileInput.setInputFiles(fixturePath);

    // Verify file is staged in UI
    await expect(page.getByText("sample-attachment.png")).toBeVisible();

    // 7. Submit ticket - intercept network responses to track IDs immediately
    const submitBtn = page.getByRole("button", { name: /submit ticket/i });
    const ticketPromise = page.waitForResponse(
      (resp) => {
        try {
          const parsedUrl = new URL(resp.url());
          return parsedUrl.pathname === "/api/tickets" && resp.request().method() === "POST";
        } catch {
          return false;
        }
      },
      { timeout: 15000 }
    ).catch(() => null);

    await submitBtn.click();

    const ticketResp = await ticketPromise;
    if (ticketResp && ticketResp.ok()) {
      try {
        const body = await ticketResp.json();
        if (body.id) {
          createdTicketId = String(body.id);
          if (!createdTicketIds.includes(body.id)) {
            createdTicketIds.push(body.id);
          }
        }
        if (body.ticketNumber) {
          createdTicketNumber = body.ticketNumber;
        }
      } catch (err: any) {
        responseTracker.registrationErrors.push(
          `Failed to parse ticket response in test body: ${err?.message || String(err)}`
        );
      }
    }

    // 8. Verify Success Screen appears with Ticket Number
    await expect(page.getByText("Ticket Submitted Successfully!")).toBeVisible();
    const ticketNumberLocator = page.locator(".display-6.fw-bold.font-monospace");
    await expect(ticketNumberLocator).toBeVisible();
    createdTicketNumber = (await ticketNumberLocator.textContent())?.trim() || "";
    expect(createdTicketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);

    // 9. Navigate to My Tickets and verify newly created ticket is listed
    const viewMyTicketsLink = page.getByRole("link", { name: /view my tickets/i });
    await viewMyTicketsLink.click();
    await expect(page).toHaveURL(/.*my-tickets/);

    // 10. Click into Ticket Detail
    const ticketLink = page.locator(".ticket-number-link", { hasText: createdTicketNumber }).first();
    await expect(ticketLink).toBeVisible();
    await ticketLink.click();
    await expect(page).toHaveURL(/.*tickets\/\d+/);
    createdTicketUrl = page.url();

    const idMatch = createdTicketUrl.match(/tickets\/(\d+)/);
    createdTicketId = idMatch ? idMatch[1] : createdTicketId;
    expect(createdTicketId).not.toBe("");
    if (createdTicketId && !createdTicketIds.includes(Number(createdTicketId))) {
      createdTicketIds.push(Number(createdTicketId));
    }

    // Verify read-only ticket details
    await expect(page.locator("h1.ticket-number")).toHaveText(createdTicketNumber);
    await expect(page.getByText("E2E Test Laptop Screen Glitch")).toBeVisible();
    await expect(page.getByText("Hardware")).toBeVisible();
    await expect(page.getByText("Corporate Laptop")).toBeVisible();

    // Verify active attachment item and extract its attachment ID
    await expect(page.getByText("sample-attachment.png")).toBeVisible();
    const attachmentItem = page.locator("[data-testid^='attachment-item-']").first();
    await expect(attachmentItem).toBeVisible();
    const testId = await attachmentItem.getAttribute("data-testid");
    createdAttachmentId = testId?.replace("attachment-item-", "") || "";
    expect(createdAttachmentId).not.toBe("");
    if (createdAttachmentId && !createdAttachmentIds.includes(Number(createdAttachmentId))) {
      createdAttachmentIds.push(Number(createdAttachmentId));
    }

    // Real Download Verification: Trigger click, intercept download event, verify exact file content
    const downloadBtn = page.getByRole("link", { name: /download sample-attachment\.png/i });
    await expect(downloadBtn).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample-attachment.png");

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const downloadedContent = fs.readFileSync(downloadPath!);
    const originalFixtureContent = fs.readFileSync(fixturePath);
    expect(downloadedContent.length).toBe(originalFixtureContent.length);
    expect(downloadedContent.equals(originalFixtureContent)).toBe(true);

    // 11. Perform Soft-Removal
    const removeBtn = page.getByRole("button", { name: /remove sample-attachment\.png/i });
    await removeBtn.click();

    // Modal opens - focus should be inside reason textarea
    const reasonTextarea = page.locator("#removal-reason-input");
    await expect(reasonTextarea).toBeVisible();
    await reasonTextarea.fill("Replaced with clearer diagnostics");

    const confirmRemovalBtn = page.getByRole("button", { name: /confirm removal/i });
    await confirmRemovalBtn.click();

    // Verify attachment is updated to removed state in UI
    await expect(page.getByText("Removed")).toBeVisible();
    await expect(page.getByText(/Reason: Replaced with clearer diagnostics/i)).toBeVisible();
    // Download and remove buttons should no longer exist in UI for this attachment
    await expect(downloadBtn).not.toBeVisible();
    await expect(removeBtn).not.toBeVisible();

    // Verify backend rejects download of soft-removed attachment (404 NOT_FOUND per AC-15)
    const removedDownloadRes = await page.request.get(
      `${API_BASE_URL}/api/attachments/${createdAttachmentId}/download?requesterId=1`
    );
    expect(removedDownloadRes.status()).toBe(404);
  });

  test("E2E-02: Requester Isolation & Non-Disclosure: Switch to Requester B -> Ticket A hidden, direct URL rejected, API access denied", async ({
    page,
    request,
  }) => {
    expect(createdTicketNumber).not.toBe("");
    expect(createdTicketUrl).not.toBe("");
    expect(createdTicketId).not.toBe("");
    expect(createdAttachmentId).not.toBe("");

    // 1. Log in as Requester B (Michael Brown)
    await page.goto("/login");
    await page.locator("#email").fill("michael.brown@example.com");
    await page.locator("#password").fill("InitialPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // 2. Arrive at My Tickets as Michael Brown
    await expect(page).toHaveURL(/.*my-tickets/);
    await expect(page.getByText("Michael Brown")).toBeVisible();

    // 5. Verify Requester A's ticket does not appear in Michael Brown's ticket list
    await expect(page.locator(`.ticket-number-link:has-text("${createdTicketNumber}")`)).toHaveCount(0);

    // 6. Direct UI access to Ticket A should be rejected with 404 / Ticket Not Found
    await page.goto(createdTicketUrl);
    await expect(page.getByText(/ticket not found/i)).toBeVisible();
    await expect(
      page.getByText(/the ticket you requested does not exist, or you do not have permission to view it/i)
    ).toBeVisible();

    // 7. Enforce multi-layered API ownership isolation (BR-10 non-disclosure rule & AC-03)
    // Using page.request carries Requester B's authenticated session cookie
    // Attempting to fetch Ticket A details as Requester B returns 404
    const ticketApiRes = await page.request.get(`${API_BASE_URL}/api/tickets/${createdTicketId}`);
    expect(ticketApiRes.status()).toBe(404);

    // Attempting to fetch Ticket A attachment metadata as Requester B returns 404
    const attMetaRes = await page.request.get(`${API_BASE_URL}/api/attachments/${createdAttachmentId}`);
    expect(attMetaRes.status()).toBe(404);

    // Attempting to download Ticket A attachment as Requester B returns 404
    const attDownloadRes = await page.request.get(
      `${API_BASE_URL}/api/attachments/${createdAttachmentId}/download`
    );
    expect(attDownloadRes.status()).toBe(404);

    // Fetch CSRF token for Requester B to perform mutating requests
    const csrfRes = await page.request.get(`${API_BASE_URL}/api/auth/csrf`);
    const csrfToken = (await csrfRes.json()).csrfToken;

    // Attempting to soft-remove Ticket A attachment as Requester B returns 404
    const clientPort = process.env.TEST_CLIENT_PORT || "5174";
    const attDeleteRes = await page.request.delete(
      `${API_BASE_URL}/api/attachments/${createdAttachmentId}`,
      {
        headers: {
          "X-CSRF-Token": csrfToken,
          Origin: `http://localhost:${clientPort}`,
        },
        data: { reason: "Unauthorized delete attempt" },
      }
    );
    expect(attDeleteRes.status()).toBe(404);

    // Verify Requester B's ticket list API payload does not contain Ticket A
    const listRes = await page.request.get(`${API_BASE_URL}/api/tickets`);
    expect(listRes.status()).toBe(200);
    const listBody = await listRes.json();
    const containsTicketA = listBody.data?.some((t: any) => t.ticketNumber === createdTicketNumber);
    expect(containsTicketA).toBe(false);

    // 8. Verify Logout flow
    const logoutBtn = page.getByRole("button", { name: /logout/i });
    await logoutBtn.click();
    await expect(page).toHaveURL(/.*login/);
  });
});
