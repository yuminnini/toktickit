import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Ensure screenshot directories exist per ui-spec.md §14
const screenshotBaseDir = path.resolve(process.cwd(), "artifacts/lab-02/screenshots");
for (const sub of ["create-ticket", "my-tickets", "ticket-detail"]) {
  const dir = path.join(screenshotBaseDir, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Assert that a captured screenshot exists, is non-empty (>10KB), and is a valid PNG
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

test.describe("Responsive Layout & Visual Inspection (RESP-01, RESP-02, AC-18, §8.7, §8.8)", () => {
  let sampleTicketId = 1;

  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get("http://localhost:3000/api/tickets?requesterId=1&pageSize=1");
      let ticketId: number | null = null;
      if (res.ok()) {
        const body = await res.json();
        if (body.data && body.data.length > 0) {
          ticketId = body.data[0].id;
        }
      }
      if (!ticketId) {
        const createRes = await request.post("http://localhost:3000/api/tickets", {
          data: {
            requesterId: 1,
            categoryId: 1,
            relatedSystemId: 1,
            summary: "Sample Ticket for Responsive Evidence",
            description: "Responsive test verification ticket for mobile, tablet, and desktop viewports.",
            requestedPriority: "HIGH",
          },
        });
        if (createRes.ok()) {
          const newTicket = await createRes.json();
          ticketId = newTicket.id;
        }
      }
      sampleTicketId = ticketId || 1;
    } catch {
      sampleTicketId = 1;
    }
  });

  // Pre-seed sessionStorage with active requester before each test
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        "lab2-selected-requester",
        JSON.stringify({ id: 1, name: "Jennifer Anderson" })
      );
    });
  });

  // Helper to check horizontal overflow (AC-18)
  async function assertNoHorizontalScroll(page: any) {
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBe(false);
  }

  test("RESP-01: Mobile Viewport (375px) - Create Ticket, My Tickets, Ticket Detail", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // 1. My Tickets (Mobile)
    await page.goto("/my-tickets");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);

    // Verify key UI elements are rendered
    await expect(page.getByRole("heading", { level: 1, name: /my tickets/i })).toBeVisible();
    await expect(page.locator("#ticket-search-input")).toBeVisible();
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();

    // Verify card layout is active on mobile (<992px), table is hidden
    await expect(page.locator(".ticket-cards")).toBeVisible();
    await expect(page.locator(".ticket-card-item").first()).toBeVisible();
    await expect(page.locator(".ticket-table-container")).toBeHidden();

    // Save and verify screenshot
    const myTicketsMobilePath = path.join(screenshotBaseDir, "my-tickets/mobile.png");
    await page.screenshot({ path: myTicketsMobilePath, fullPage: true });
    assertValidScreenshot(myTicketsMobilePath);

    // 2. Create Ticket (Mobile)
    await page.goto("/tickets/new");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);

    // Verify all form fields and controls are rendered
    await expect(page.getByRole("heading", { level: 1, name: /^create ticket$/i })).toBeVisible();
    await expect(page.locator("#categoryId")).toBeVisible();
    await expect(page.locator("#relatedSystemId")).toBeVisible();
    await expect(page.locator("#summary")).toBeVisible();
    await expect(page.locator("#description")).toBeVisible();
    await expect(page.locator("#requestedPriority")).toBeVisible();
    await expect(page.locator("#attachment-input")).toBeAttached();
    await expect(page.getByRole("button", { name: /submit ticket/i })).toBeVisible();

    const createMobilePath = path.join(screenshotBaseDir, "create-ticket/mobile.png");
    await page.screenshot({ path: createMobilePath, fullPage: true });
    assertValidScreenshot(createMobilePath);

    // 3. Ticket Detail (Mobile)
    await page.goto(`/tickets/${sampleTicketId}`);
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);

    // Verify read-only ticket elements and attachments section are rendered
    await expect(page.locator("h1.ticket-number")).toBeVisible();
    await expect(page.locator("h1.ticket-number")).toHaveText(/^TKT-\d{4}-\d{6}$/);
    await expect(page.locator(".badge").first()).toBeVisible();
    await expect(page.locator(".attachment-section")).toBeVisible();

    const detailMobilePath = path.join(screenshotBaseDir, "ticket-detail/mobile.png");
    await page.screenshot({ path: detailMobilePath, fullPage: true });
    assertValidScreenshot(detailMobilePath);
  });

  test("RESP-02: Tablet (1024px) & Desktop (1280px) Viewports", async ({ page }) => {
    // --- Tablet Viewport (1024px) ---
    await page.setViewportSize({ width: 1024, height: 768 });

    // My Tickets (Tablet: ≥992px -> Desktop Table layout)
    await page.goto("/my-tickets");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);
    await expect(page.getByRole("heading", { level: 1, name: /my tickets/i })).toBeVisible();
    await expect(page.locator(".ticket-table-container")).toBeVisible();
    await expect(page.locator(".ticket-table-container tbody tr").first()).toBeVisible();
    await expect(page.locator(".ticket-cards")).toBeHidden();

    const myTicketsTabletPath = path.join(screenshotBaseDir, "my-tickets/tablet.png");
    await page.screenshot({ path: myTicketsTabletPath, fullPage: true });
    assertValidScreenshot(myTicketsTabletPath);

    // Create Ticket (Tablet)
    await page.goto("/tickets/new");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);
    await expect(page.getByRole("heading", { level: 1, name: /^create ticket$/i })).toBeVisible();
    await expect(page.locator("#categoryId")).toBeVisible();
    await expect(page.locator("#summary")).toBeVisible();

    const createTabletPath = path.join(screenshotBaseDir, "create-ticket/tablet.png");
    await page.screenshot({ path: createTabletPath, fullPage: true });
    assertValidScreenshot(createTabletPath);

    // Ticket Detail (Tablet)
    await page.goto(`/tickets/${sampleTicketId}`);
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);
    await expect(page.locator("h1.ticket-number")).toBeVisible();
    await expect(page.locator("h1.ticket-number")).toHaveText(/^TKT-\d{4}-\d{6}$/);
    await expect(page.locator(".attachment-section")).toBeVisible();

    const detailTabletPath = path.join(screenshotBaseDir, "ticket-detail/tablet.png");
    await page.screenshot({ path: detailTabletPath, fullPage: true });
    assertValidScreenshot(detailTabletPath);

    // --- Desktop Viewport (1280px) ---
    await page.setViewportSize({ width: 1280, height: 720 });

    // My Tickets (Desktop: Table view)
    await page.goto("/my-tickets");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);
    await expect(page.getByRole("heading", { level: 1, name: /my tickets/i })).toBeVisible();
    await expect(page.locator(".ticket-table-container")).toBeVisible();
    await expect(page.locator(".ticket-table-container tbody tr").first()).toBeVisible();
    await expect(page.locator(".ticket-cards")).toBeHidden();

    const myTicketsDesktopPath = path.join(screenshotBaseDir, "my-tickets/desktop.png");
    await page.screenshot({ path: myTicketsDesktopPath, fullPage: true });
    assertValidScreenshot(myTicketsDesktopPath);

    // Create Ticket (Desktop)
    await page.goto("/tickets/new");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);
    await expect(page.getByRole("heading", { level: 1, name: /^create ticket$/i })).toBeVisible();
    await expect(page.locator("#categoryId")).toBeVisible();
    await expect(page.locator("#summary")).toBeVisible();

    const createDesktopPath = path.join(screenshotBaseDir, "create-ticket/desktop.png");
    await page.screenshot({ path: createDesktopPath, fullPage: true });
    assertValidScreenshot(createDesktopPath);

    // Ticket Detail (Desktop)
    await page.goto(`/tickets/${sampleTicketId}`);
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);
    await expect(page.locator("h1.ticket-number")).toBeVisible();
    await expect(page.locator("h1.ticket-number")).toHaveText(/^TKT-\d{4}-\d{6}$/);
    await expect(page.locator(".attachment-section")).toBeVisible();

    const detailDesktopPath = path.join(screenshotBaseDir, "ticket-detail/desktop.png");
    await page.screenshot({ path: detailDesktopPath, fullPage: true });
    assertValidScreenshot(detailDesktopPath);
  });
});
