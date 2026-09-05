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

    // Verify card layout is active on mobile (<992px), table is hidden
    await expect(page.locator(".ticket-cards")).toBeVisible();
    await expect(page.locator(".ticket-table-container")).toBeHidden();

    // Save screenshot
    await page.screenshot({
      path: path.join(screenshotBaseDir, "my-tickets/mobile.png"),
      fullPage: true,
    });

    // 2. Create Ticket (Mobile)
    await page.goto("/tickets/new");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);

    await page.screenshot({
      path: path.join(screenshotBaseDir, "create-ticket/mobile.png"),
      fullPage: true,
    });

    // 3. Ticket Detail (Mobile)
    await page.goto(`/tickets/${sampleTicketId}`);
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);

    await page.screenshot({
      path: path.join(screenshotBaseDir, "ticket-detail/mobile.png"),
      fullPage: true,
    });
  });

  test("RESP-02: Tablet (1024px) & Desktop (1280px) Viewports", async ({ page }) => {
    // --- Tablet Viewport (1024px) ---
    await page.setViewportSize({ width: 1024, height: 768 });

    // My Tickets (Tablet: ≥992px -> Desktop Table layout)
    await page.goto("/my-tickets");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);
    await expect(page.locator(".ticket-table-container")).toBeVisible();
    await expect(page.locator(".ticket-cards")).toBeHidden();

    await page.screenshot({
      path: path.join(screenshotBaseDir, "my-tickets/tablet.png"),
      fullPage: true,
    });

    // Create Ticket (Tablet)
    await page.goto("/tickets/new");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);

    await page.screenshot({
      path: path.join(screenshotBaseDir, "create-ticket/tablet.png"),
      fullPage: true,
    });

    // Ticket Detail (Tablet)
    await page.goto(`/tickets/${sampleTicketId}`);
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);

    await page.screenshot({
      path: path.join(screenshotBaseDir, "ticket-detail/tablet.png"),
      fullPage: true,
    });

    // --- Desktop Viewport (1280px) ---
    await page.setViewportSize({ width: 1280, height: 720 });

    // My Tickets (Desktop: Table view)
    await page.goto("/my-tickets");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);
    await expect(page.locator(".ticket-table-container")).toBeVisible();
    await expect(page.locator(".ticket-cards")).toBeHidden();

    await page.screenshot({
      path: path.join(screenshotBaseDir, "my-tickets/desktop.png"),
      fullPage: true,
    });

    // Create Ticket (Desktop)
    await page.goto("/tickets/new");
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);

    await page.screenshot({
      path: path.join(screenshotBaseDir, "create-ticket/desktop.png"),
      fullPage: true,
    });

    // Ticket Detail (Desktop)
    await page.goto(`/tickets/${sampleTicketId}`);
    await page.waitForLoadState("networkidle");
    await assertNoHorizontalScroll(page);

    await page.screenshot({
      path: path.join(screenshotBaseDir, "ticket-detail/desktop.png"),
      fullPage: true,
    });
  });
});
