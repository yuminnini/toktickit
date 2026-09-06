import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test.describe("Requester Ticket Flow E2E (E2E-01, E2E-02, AC-01, AC-03, AC-10, AC-11, AC-13, AC-14, AC-15)", () => {
  test.describe.configure({ mode: "serial" });

  let createdTicketNumber = "";
  let createdTicketUrl = "";
  let createdTicketId = "";
  let createdAttachmentId = "";

  test("E2E-01: Select Requester -> Create Ticket with attachment -> My Tickets -> Ticket Detail, Real Download & Soft Remove", async ({
    page,
  }) => {
    // 1. Navigate to Requester Selection page
    await page.goto("/requester-selection");
    await expect(page).toHaveTitle(/TokTickIT/);

    // 2. Select Requester A (Jennifer Anderson - ID: 1)
    const requesterSelect = page.locator("#requester-select");
    await expect(requesterSelect).toBeVisible();
    await requesterSelect.selectOption({ label: "Jennifer Anderson" });

    // 3. Submit and arrive at My Tickets
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await continueBtn.click();
    await expect(page).toHaveURL(/.*my-tickets/);
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();

    // 4. Click "+ Create Ticket" button
    const createBtn = page.getByRole("button", { name: /\+ Create Ticket/i });
    await createBtn.click();
    await expect(page).toHaveURL(/.*tickets\/new/);

    // 5. Fill Create Ticket form
    await page.locator("#categoryId").selectOption({ label: "Hardware" });
    await page.locator("#relatedSystemId").selectOption({ label: "Corporate Laptop" });
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

    // 7. Submit ticket
    const submitBtn = page.getByRole("button", { name: /submit ticket/i });
    await submitBtn.click();

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
    createdTicketId = idMatch ? idMatch[1] : "";
    expect(createdTicketId).not.toBe("");

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
      `http://localhost:3000/api/attachments/${createdAttachmentId}/download?requesterId=1`
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

    // 1. Start as Requester A (Jennifer Anderson)
    await page.goto("/requester-selection");
    const requesterSelect = page.locator("#requester-select");
    await requesterSelect.selectOption({ label: "Jennifer Anderson" });
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/.*my-tickets/);
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();

    // 2. Click "Change" requester in the navbar
    const changeBtn = page.getByRole("button", { name: /change requester/i });
    await changeBtn.click();
    await expect(page).toHaveURL(/.*requester-selection/);

    // 3. Select Requester B (Michael Brown - ID: 2)
    await requesterSelect.selectOption({ label: "Michael Brown" });
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await continueBtn.click();

    // 4. Arrive at My Tickets as Michael Brown
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
    // Attempting to fetch Ticket A details as Requester B (ID: 2) returns 404
    const ticketApiRes = await request.get(`http://localhost:3000/api/tickets/${createdTicketId}?requesterId=2`);
    expect(ticketApiRes.status()).toBe(404);

    // Attempting to fetch Ticket A attachment metadata as Requester B returns 404
    const attMetaRes = await request.get(`http://localhost:3000/api/attachments/${createdAttachmentId}?requesterId=2`);
    expect(attMetaRes.status()).toBe(404);

    // Attempting to download Ticket A attachment as Requester B returns 404
    const attDownloadRes = await request.get(
      `http://localhost:3000/api/attachments/${createdAttachmentId}/download?requesterId=2`
    );
    expect(attDownloadRes.status()).toBe(404);

    // Attempting to soft-remove Ticket A attachment as Requester B returns 404
    const attDeleteRes = await request.delete(
      `http://localhost:3000/api/attachments/${createdAttachmentId}?requesterId=2`,
      { data: { reason: "Unauthorized delete attempt" } }
    );
    expect(attDeleteRes.status()).toBe(404);

    // Verify Requester B's ticket list API payload does not contain Ticket A
    const listRes = await request.get("http://localhost:3000/api/tickets?requesterId=2");
    expect(listRes.status()).toBe(200);
    const listBody = await listRes.json();
    const containsTicketA = listBody.data?.some((t: any) => t.ticketNumber === createdTicketNumber);
    expect(containsTicketA).toBe(false);
  });
});
