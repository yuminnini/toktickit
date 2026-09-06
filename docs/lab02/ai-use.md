# Lab 2 — AI Use and Reflection

**LLM/agent used:** Antigravity AI (powered by Google DeepMind Gemini & Anthropic Claude models), integrated with VS Code / Antigravity IDE.

---

## Selected Key Prompts (10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Analyze Lab 2 labsheet and specification; decompose the project into 8 incremental development phases with TDD test plan and architecture contracts. | Obtained a clear 8-phase execution roadmap, API contract specification, UI design specs, and requirement traceability matrix mapping all ACs to test IDs. |
| 2 | Design the Prisma schema for `RequesterUser`, `RelatedSystem`, `Ticket`, and `Attachment` with unique constraints, and write an idempotent seed script. | Verified schema migrations, generated Prisma client, and confirmed seed script safely upserts categories, systems, and active/inactive requesters without duplicates. |
| 3 | Implement Requester Context, RouteGuard, and AppShell navbar with an interactive modal to switch active requesters. | Secured all ticket routes to require an active requester, persisted selection in `sessionStorage`, and enabled instant requester switching for multi-user testing. |
| 4 | Implement `POST /api/tickets` and `CreateTicket.tsx` form with auto-generated ticket numbers (`TKT-YYYY-NNNNNN`), multi-file attachments, and binary magic byte validation. | Established dual-phase ticket creation with Multer file storage, MIME/magic byte content sniffing (PNG, JPEG, PDF, WEBP), and 5-active attachment quota enforcement. |
| 5 | Build the My Tickets portal with search, category/priority/status filters, sortable column headers with carets, and numbered pagination. | Implemented responsive ticket listing with server-side sorting, debounce search, and dynamic `Showing 1 to X of Y tickets` pagination matching Zen Green theme. |
| 6 | Create Ticket Detail read-only inspection and Attachment Section supporting file downloads and soft-removal with mandatory reason. | Implemented read-only detail view with badge indicators, in-app download error handling, and a modal requiring a 1–500 character reason for soft removal. |
| 7 | Refactor UI to Zen Green design system with responsive layout switching (cards on mobile <992px vs table on desktop/tablet ≥992px) and accessibility attributes. | Created unified `theme.css` tokens, accessible ARIA labels/live-regions, keyboard modal dismissals, and verified multi-breakpoint rendering across viewports. |
| 8 | Address peer review feedback: enforce BR-12 empty vs no-results distinction, in-app 404 download alerts, category load retry, and table replacement on error. | Updated `MyTickets.tsx` and `AttachmentSection.tsx` so empty state shows only when 0 total tickets exist, and network/404 errors render clean inline alerts instead of raw JSON tabs. |
| 9 | Configure Playwright test runner and automate capturing 9 responsive screenshots across mobile (375px), tablet (1024px), and desktop (1280px). | Set up dual webServer orchestration for backend and frontend in `playwright.config.ts`, automated visual evidence capture, and validated screenshot directory outputs. |
| 10 | Harden E2E tests for real download byte verification, multi-layer ownership isolation, and update README for reproducible fresh-machine execution. | Added browser download event interception with byte matching against fixture, multi-endpoint 404 ownership checks, and rewrote `README.md` with install → migrate → seed → build → test. |

---

## My Reflection

Using AI as a pair programming assistant accelerated full-stack development, particularly when scaffolding repetitive API routes, setting up Playwright webServer configurations, and writing comprehensive test suites across Vitest and Supertest.

The most effective technique was providing strict acceptance criteria and pasting actual error logs or test traces rather than high-level descriptions. When given specific business rules (such as the BR-10 non-disclosure rule requiring `404 NOT_FOUND` instead of `403 FORBIDDEN`), the AI accurately enforced security boundaries across both backend controllers and frontend RouteGuards.

However, active developer oversight and pushback remained essential throughout the process:
1. **Preventing superficial test passes**: Initial E2E tests only checked if download links or pages existed in the DOM ("หน้าเปิดได้"). I had to direct the AI to intercept the actual browser `download` event, verify byte equality against the fixture file, and assert that foreign requesters receive 404 at the API level so tests fail when real behaviors break.
2. **Business rule edge cases**: In the My Tickets view, the AI initially treated 0 filtered tickets as an empty state. I directed it to adhere strictly to BR-12, keeping the empty state ("No tickets yet" CTA) strictly separate from the no-results state ("Clear Filters" CTA) based on total lifetime tickets.
3. **Responsive selector accuracy**: Automated responsive checks initially used broad table row selectors that passed regardless of data rendering. Guiding the AI to assert specific interactive elements (`#ticket-search-input`, `.ticket-card-item`, form controls) ensured the screenshots captured fully loaded, functional interfaces across all 3 viewports.
