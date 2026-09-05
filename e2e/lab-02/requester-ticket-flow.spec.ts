import { test, expect } from "@playwright/test";
import path from "node:path";

test.describe("Requester Ticket Flow E2E (E2E-01, E2E-02, AC-01, AC-03, AC-10, AC-11)", () => {
  test.describe.configure({ mode: "serial" });

  let createdTicketNumber = "";
  let createdTicketUrl = "";

  test("E2E-01: Select Requester -> Create Ticket with attachment -> My Tickets -> Ticket Detail & Soft Remove", async ({
    page,
  }) => {
    // 1. Navigate to Requester Selection page
    await page.goto("/requester-selection");
    await expect(page).toHaveTitle(/TokTickIT/);

    // 2. Select Requester A (Jennifer Anderson)
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

    // Verify read-only ticket details
    await expect(page.locator("h1.ticket-number")).toHaveText(createdTicketNumber);
    await expect(page.getByText("E2E Test Laptop Screen Glitch")).toBeVisible();
    await expect(page.getByText("Hardware")).toBeVisible();
    await expect(page.getByText("Corporate Laptop")).toBeVisible();

    // Verify active attachment is present
    await expect(page.getByText("sample-attachment.png")).toBeVisible();
    const downloadBtn = page.getByRole("link", { name: /download sample-attachment\.png/i });
    await expect(downloadBtn).toBeVisible();

    // 11. Perform Soft-Removal
    const removeBtn = page.getByRole("button", { name: /remove sample-attachment\.png/i });
    await removeBtn.click();

    // Modal opens - focus should be inside reason textarea
    const reasonTextarea = page.locator("#removal-reason-input");
    await expect(reasonTextarea).toBeVisible();
    await reasonTextarea.fill("Replaced with clearer diagnostics");

    const confirmRemovalBtn = page.getByRole("button", { name: /confirm removal/i });
    await confirmRemovalBtn.click();

    // Verify attachment is updated to removed state
    await expect(page.getByText("Removed")).toBeVisible();
    await expect(page.getByText(/Reason: Replaced with clearer diagnostics/i)).toBeVisible();
    // Download and remove buttons should no longer exist for this attachment
    await expect(downloadBtn).not.toBeVisible();
  });

  test("E2E-02: Requester Isolation: Switch to Requester B -> Ticket A hidden, direct URL rejected", async ({
    page,
  }) => {
    expect(createdTicketNumber).not.toBe("");
    expect(createdTicketUrl).not.toBe("");

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

    // 3. Select Requester B (Michael Brown)
    await requesterSelect.selectOption({ label: "Michael Brown" });
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await continueBtn.click();

    // 4. Arrive at My Tickets as Michael Brown
    await expect(page).toHaveURL(/.*my-tickets/);
    await expect(page.getByText("Michael Brown")).toBeVisible();

    // 5. Verify Requester A's ticket does not appear in Michael Brown's ticket list
    await expect(page.locator(`.ticket-number-link:has-text("${createdTicketNumber}")`)).toHaveCount(0);

    // 6. Direct URL access to Ticket A should be rejected with 404 / Ticket Not Found
    await page.goto(createdTicketUrl);
    await expect(page.getByText(/ticket not found/i)).toBeVisible();
    await expect(
      page.getByText(/the ticket you requested does not exist, or you do not have permission to view it/i)
    ).toBeVisible();
  });
});
