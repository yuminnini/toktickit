# Lab 2 Implementation Log

## 2026-09-02 - Phase 2: Reference APIs and Development Requester context

- Branch: `feature/lab2-3-requester-context`
- Commit/PR: `Pending PR to lab2-staging`
- Scope completed: Reference APIs (`GET /api/requesters`, `GET /api/related-systems`, `GET /api/categories`), RequesterContext with `sessionStorage` persistence, RequesterSelection screen with loading/empty/error/ready/retry states, RequesterRouteGuard, and AppShell header with requester switcher.
- Requirements: `FR-08`, `FR-09`, `FR-10`, `BR-03`, `BR-05`, `BR-11`, `AC-02`, `AC-16`, `AC-17`

### Files changed
- `client/src/styles/theme.css`: Zen Green CSS tokens moved to client bundle.
- `server/src/app.ts`: Added `GET /api/related-systems` and `GET /api/requesters` with active filters and safe error handling.
- `server/tests/lab-02/requesters.api.test.ts`: Integration test verifying active requester filtering.
- `server/tests/lab-02/reference-data.api.test.ts`: Integration test verifying active related systems and category retrieval.
- `client/src/api.ts`: Added `fetchRelatedSystems`, `fetchCategories`, `fetchRequesters` API helpers and types.
- `client/src/context/RequesterContext.tsx`: React context for active development requester with `sessionStorage` backing.
- `client/src/pages/RequesterSelection.tsx`: Screen allowing selection of active requesters, with error retry and empty states.
- `client/src/components/RequesterRouteGuard.tsx`: Route guard enforcing requester selection before accessing ticket pages.
- `client/src/components/AppShell.tsx`: Navigation header with brand, nav links, requester badge, and "Change" action.
- `client/src/App.tsx`: React Router configuration with guarded ticket routes and AppShell layout.
- `client/tests/lab-02/RouteGuard.test.tsx`: UI test (UI-01 / AC-02) for unselected redirect and authenticated access.
- `client/tests/lab-02/RequesterSelection.test.tsx`: UI tests (UI-09, UI-10 / AC-16, AC-17) for empty, error retry, and selection.
- `docs/lab-02/tests.md`: Updated test paths from placeholders to actual test files.

### Database/dependencies
- Migration: None (reused Phase 1 schema and migrations)
- Dependency changes: None

### Verification run
- `cd client && npm test -- --run` -> Pass; 3 test files, 8 tests passed
- `cd client && npm run build` -> Pass; TypeScript and Vite build succeeded
- `cd server && npm test -- --run` -> Pass; 6 test files, 6 tests passed
- `cd server && npm run build` -> Pass; TypeScript build succeeded

### Evidence
- Screenshot/artifact paths: None (E2E / screenshots scheduled for Phase 7)
- Red test before implementation: `RouteGuard.test.tsx` failed before guard wiring, `RequesterSelection.test.tsx` retry assertion failed before retry button addition.
- Green test after implementation: All 8 client tests and 6 server tests pass cleanly.

### Known risks / not completed
- Ticket Creation form (Phase 3), My Tickets listing & Detail (Phase 4), and Attachments (Phase 5) use placeholder pages until their respective feature phases.

### Next safe task
- Merge `feature/lab2-3-requester-context` to `lab2-staging` and begin **Phase 3: Ticket creation API and Create Ticket UI (`feature/lab2-ticket-creation`)**.

## 2026-09-02 - Phase 3: Ticket creation API and Create Ticket UI

- Branch: `feature/lab2-ticket-creation`
- Commit/PR: Pending
- Scope completed: Phase 2 Bugfixes and complete Phase 3 Ticket Creation flow including POST /api/tickets, TKT ticket number generation, and CreateTicket.tsx UI with validation. Removed accidentally included Phase 4 endpoints to maintain PR scope.
- Requirements: FR-01, FR-02, BR-01, BR-02, BR-08, BR-09, AC-01, AC-04, AC-05, AC-06, AC-22

### Files changed
- `client/src/context/RequesterContext.tsx`: Added robust type checking for session validation.
- `client/src/pages/RequesterSelection.tsx`: Added missing Cancel button.
- `client/tests/lab-02/RouteGuard.test.tsx`: Implemented Change Requester session clear test.
- `server/src/services/ticketNumber.ts`: New service to format ID to TKT-YYYY-00000X.
- `server/src/app.ts`: Implemented POST /api/tickets with validations and transaction for ticket number generation. Removed Phase 4 endpoints.
- `client/src/api.ts`: Added createTicket API integration. Fixed TicketItem types and removed Phase 4 fetchers.
- `client/src/pages/CreateTicket.tsx`: Implemented UI form with useState validation (instead of React Hook Form per previous log error), added loading/error states for reference data with Retry button.
- `server/tests/lab-02/create-ticket.api.test.ts`: Integration tests for valid and invalid ticket creation.
- `server/tests/lab-02/ticket-number.unit.test.ts`: Unit test for ticket number formatting.
- `client/tests/lab-02/CreateTicket.test.tsx`: UI tests checking field validation and duplicate click prevention.
- `client/tests/lab-02/CreateTicket.style.test.tsx`: UI tests checking aria-describedby accessibility.

### Database/dependencies
- Migration: None
- Dependency changes: None

### Verification run
- `cd client && npm test -- --run` -> Pass; 5 test files, 16 tests passed
- `cd server && npm test -- --run` -> Pass; 8 test files, 14 tests passed

### Evidence
- Screenshot/artifact paths: None
- Red test before implementation: API creation failed lacking route, UI submit failed lacking input fields.
- Green test after implementation: All tests pass safely without uniqueness collision for multiple tickets.

### Known risks / not completed
- Attachments are not handled yet (deferred to Phase 5).
- Phase 4 (My Tickets and Detail) is not started yet.

### Next safe task
- Merge feature/lab2-ticket-creation to lab2-staging and begin Phase 4: My Tickets and owned Ticket Detail.

## 2026-09-04 - Phase 4: My Tickets and owned Ticket Detail

- Branch: `feature/lab2-phase4`
- Commit/PR: Pending PR to lab2-staging
- Scope completed: Implemented My Tickets list API (`GET /api/tickets`) with ownership scope, case-insensitive substring search across `ticketNumber` and `summary`, category/priority/status filters, deterministic primary and secondary (`id`) sorting, pagination with clamping, `unfilteredTotal` count, and inactive requester rejection. Implemented owned Ticket Detail API (`GET /api/tickets/:id`) returning full ticket metadata with 404 for unowned or non-existent tickets. On client, implemented `MyTickets.tsx` with responsive table (desktop/tablet) and cards (mobile), empty vs no-results distinction, stale data prevention on requester switch, and `Pagination.tsx`. Implemented read-only `TicketDetail.tsx` with 404 guard and routing in `App.tsx`. Resolved all 10 peer review points.
- Requirements: `FR-03`, `FR-04`, `FR-05`, `FR-06`, `FR-10`, `BR-05`, `BR-07`, `BR-12`, `BR-13`, `AC-03`, `AC-07`, `AC-08`, `AC-09`, `AC-10`, `AC-19`, `AC-20`, `AC-21`

### Files changed
- `server/src/app.ts`: Implemented `GET /api/tickets` and `GET /api/tickets/:id` with ownership query filtering, active requester validation, deterministic sort, and pagination.
- `server/tests/lab-02/my-tickets.api.test.ts`: Integration tests verifying ownership scoping, search, filters, sort, pagination, clamping, and error responses.
- `server/tests/lab-02/ticket-detail.api.test.ts`: Integration tests verifying owner detail access (200), cross-owner access (404), missing/inactive requester (400).
- `client/src/api.ts`: Added `TicketListItem`, `TicketListResponse`, `TicketDetail`, `AttachmentItem`, `fetchTickets`, and `fetchTicketDetail`.
- `client/src/context/RequesterContext.tsx`: Exported `RequesterContext` for direct testing/provider use.
- `client/src/components/TicketTable.tsx`: Reusable desktop/tablet table component using string `ticket.category` and `Badge`.
- `client/src/components/TicketCard.tsx`: Reusable mobile card component for tickets.
- `client/src/components/Pagination.tsx`: Reusable pagination controls with previous/next buttons and page counters.
- `client/src/pages/MyTickets.tsx`: Complete My Tickets screen with search, filters, sort, pagination, empty state (with `/tickets/new` CTA), no-results state, and `AbortController` cancellation to prevent stale data.
- `client/src/pages/TicketDetail.tsx`: Read-only ticket detail screen with not-found state and back navigation.
- `client/src/App.tsx`: Added `/tickets/:id` route under guarded `AppShell`.
- `client/tests/lab-02/MyTickets.test.tsx`: UI tests for empty state (UI-05), no-results state (UI-06), requester switch (UI-07), and pagination (UI-11).
- `client/tests/lab-02/RequesterTicketDetail.test.tsx`: UI tests for ticket detail display and 404 state.
- `client/tests/lab-02/Badge.style.test.tsx`: UI style tests verifying badge CSS classes and labels (STYLE-02).
- `docs/lab-02/tests.md`: Updated Pass statuses for API-02, API-05, API-06, API-16, API-17, API-18, UI-05, UI-06, UI-07, UI-11, STYLE-02.

### Database/dependencies
- Migration: None (reused Phase 1 schema)
- Dependency changes: None
- Database configuration: PostgreSQL Docker container `toktickit-db` on port 5233.

### Verification run
- `cd server && npm test` -> Pass; 10 test files, 28 tests passed
- `cd server && npm run build` -> Pass; TypeScript compilation succeeded
- `cd client && npm test` -> Pass; 8 test files, 30 tests passed
- `cd client && npm run build` -> Pass; TypeScript and Vite build succeeded

### Evidence
- Screenshot/artifact paths: None (E2E / screenshots scheduled for Phase 7)
- Red test before implementation: My Tickets and Ticket Detail routes returned 404/empty, client tests failed prior to page and component implementation.
- Green test after implementation: All 28 server tests and 30 client tests pass with 0 failures and 0 skipped.

### Known risks / not completed
- Attachment uploading, downloading, and soft-removal lifecycle endpoints and UI (deferred to Phase 5).
- End-to-end Playwright tests across multiple viewports (deferred to Phase 6 & 7).

### Next safe task
- Begin Phase 5: Attachment lifecycle end-to-end (`feature/lab2-attachments`).

## 2026-09-04 - Phase 5: Attachment lifecycle end-to-end

- Branch: `feature/lab2-attachments`
- Commit/PR: Pending PR to `lab2-staging`
- Scope completed: Implemented the complete attachment lifecycle for tickets.
  - Added server-side storage service (`server/src/services/attachmentStorage.ts`) with private storage directory, UUID-based file naming, extension and MIME type whitelist validation (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`), max 5 MB size limit, and compensation cleanup on database insertion failure.
  - Implemented 4 REST endpoints in `server/src/app.ts`:
    - `POST /api/tickets/:id/attachments`: multipart single-file upload, owned ticket check, concurrency-safe 5 active attachments limit (409 `ATTACHMENT_LIMIT`), stored filename kept private from response.
    - `GET /api/attachments/:id`: metadata retrieval, owned-only check via parent ticket, works for both active and soft-removed attachments.
    - `GET /api/attachments/:id/download`: active attachment download only (`removedAt: null`), owned-only check, RFC 5987 safe `Content-Disposition`, returns 404 for removed attachments (indistinguishable from non-existent).
    - `DELETE /api/attachments/:id`: soft-removal requiring trimmed reason (1-500 characters), sets `removedAt` and `removalReason` without physically deleting database row, returns 409 if already removed; soft-removed attachments free up quota toward the 5-file active limit.
  - Frontend integration:
    - Updated `client/src/api.ts` with `uploadAttachment`, `removeAttachment`, and `getAttachmentDownloadUrl`.
    - Created `AttachmentPicker.tsx` with client-side file validation (rejects `.exe` and files > 5 MB with inline error) and staged file management.
    - Created `AttachmentSection.tsx` displaying active and soft-removed attachments, download action, soft-remove confirmation modal with reason input, and single-file upload up to 5 active attachments limit.
    - Integrated `AttachmentPicker` into `CreateTicket.tsx` (staged upload after ticket creation with partial failure reporting).
    - Integrated `AttachmentSection` into `TicketDetail.tsx` replacing previous placeholder.
  - Automated tests:
    - Added `server/tests/lab-02/attachments.api.test.ts` (25 tests) covering API-07, API-08, API-09, API-10, API-12, API-13, API-14, concurrency-safe parallel upload race conditions (Promise.all), exact 5 MB boundary, 5 MB + 1 byte boundary, pre-validation without disk write, compensation on DB failure, path traversal blocking, and stream error handling.
    - Added `client/tests/lab-02/AttachmentSection.test.tsx` (8 tests) covering UI-08 (.exe rejection), file size rejection, rendering, download, removal modal, and quota limit.
    - Added `CreateTicket.test.tsx` partial upload warning test and `RequesterTicketDetail.test.tsx` requester switch stale data rejection test.
- Peer Review Resolutions:
  - 1. Concurrency-safe 5-attachment limit: wrapped upload in `prisma.$transaction` with `SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE` row lock. Added concurrent upload test with `Promise.all`.
  - 2 & 3. Path traversal protection: implemented `resolveSafeFilePath` using `path.resolve` and `path.relative` checking for `..` and absolute paths. Used in both deletion and download handler.
  - 4. Stale response prevention: refactored `loadTicket` in `TicketDetail.tsx` to manage its own `AbortController` and track current requester ID to discard stale responses.
  - 5. Pre-validation middleware: added `validateTicketForUpload` middleware checking params, requester, ticket ownership, and active attachments before Multer writes to disk.
  - 6. Download stream error handling: added `stream.on("error")` handler returning 404 or destroying response safely without crashing.
  - 7. Isolated temporary upload directory in tests: used `fs.mkdtempSync` and `process.env.UPLOAD_DIR` in `attachments.api.test.ts`, with cleanup in `afterAll`.
  - 8. Test database reproducibility: added `server/.env.test.example` and configured `server/vitest.config.ts` to auto-load `.env.test` or `.env`.
  - 9. Reproducibility documentation: updated `docs/lab-02/tests.md` with explicit database prerequisites and setup commands.
  - 10. Added missing edge case tests: concurrent upload, 5 MB boundaries, DB compensation, path traversal, download stream error, partial upload warning, requester switch abort.
  - 11. Test order independence: tests in `attachments.api.test.ts` create self-contained fixtures, runnable independently with `-t`.
  - 12. Dependency audit: resolved `qs` vulnerability via override in `server/package.json`. Documented that remaining devDependency reports are in vitest/esbuild.
- Requirements: `FR-07`, `BR-04`, `BR-06`, `BR-10`, `AC-11`, `AC-12`, `AC-13`, `AC-14`, `AC-15`

### Files changed
- `server/package.json`, `server/package-lock.json`: Added `multer` (v2.3.0), `@types/multer` (v2.2.0), and `qs` override.
- `server/.env.test.example`: Added test environment configuration example.
- `server/vitest.config.ts`: Added auto-loading of `.env.test` / `.env`.
- `.gitignore`: Added `uploads/` and `server/uploads/` to ignore stored attachment files.
- `server/src/services/attachmentStorage.ts`: Added `resolveSafeFilePath` path containment helper, UUID naming, and compensation deletion.
- `server/src/app.ts`: Implemented `validateTicketForUpload` middleware, concurrency-safe row-level lock transaction for uploads, safe download route with stream error handling, metadata, and soft-remove.
- `server/tests/lab-02/attachments.api.test.ts`: Self-contained, order-independent integration tests using temporary upload directory (25 tests).
- `client/src/api.ts`: Added attachment helper functions (`uploadAttachment`, `removeAttachment`, `getAttachmentDownloadUrl`).
- `client/src/components/AttachmentPicker.tsx`: Reusable picker component with client-side validation.
- `client/src/components/AttachmentSection.tsx`: Complete attachment management section for ticket details.
- `client/src/pages/CreateTicket.tsx`: Added staged attachments and sequential upload.
- `client/src/pages/TicketDetail.tsx`: Integrated `AttachmentSection` with self-managed `AbortController`.
- `client/tests/lab-02/AttachmentSection.test.tsx`: Client unit tests for attachment components and UI-08.
- `client/tests/lab-02/CreateTicket.test.tsx`: Added partial upload warning test.
- `client/tests/lab-02/RequesterTicketDetail.test.tsx`: Added requester switch abort test.
- `docs/lab-02/tests.md`: Marked API-07..10, API-12..14, and UI-08 as Pass; added reproduction steps.
- `docs/lab-02/implementation-log.md`: Appended Phase 5 implementation entry and review fixes.

### Database/dependencies
- Dependencies: `multer` and `@types/multer` installed in server.
- Database: Existing `Attachment` Prisma model utilized. Row-level locks (`SELECT ... FOR UPDATE`) used for concurrency safety.

### Verification run
- `cd server && npm test` -> Pass; 11 test files, 54 tests passed
- `cd server && npm run build` -> Pass; TypeScript compilation succeeded
- `cd client && npm test` -> Pass; 9 test files, 41 tests passed
- `cd client && npm run build` -> Pass; TypeScript and Vite build succeeded

### Evidence
- All planned tests for Phase 5 (API-07, API-08, API-09, API-10, API-12, API-13, API-14, UI-08) verified and passing.

### Next safe task
- Merge PR for `feature/lab2-attachments` into `lab2-staging` (Completed in PR #20).
- Proceed to **Phase 6: Zen Green reusable UI, accessibility, and responsive behavior (`feature/lab2-zen-green-responsive`)**.

---

## 2026-09-04 - Issue: Phase 6 - Zen Green Reusable UI, Accessibility & Responsive Behavior

- Branch: `feature/lab2-zen-green-responsive`
- Commit/PR: Pending PR into `lab2-staging`
- Scope completed:
  - Design Tokens & Theme Foundation:
    - Updated `client/src/styles/theme.css` with full Zen Green tokens (`--color-primary: #006B3C`, `--color-secondary: #0B7A46`, `--color-pale-green: #EAF6EF`, `--color-bg: #F5F7F6`, `--color-surface: #FFFFFF`, `--color-surface-border: #E2E8E5`, `--color-text: #1F2E27`, `--color-error: #B3261E`, `--color-warning: #B7791F`, `--color-editable-bg: #FFFFFF`, `--color-editable-border: #C9D3CE`, `--color-readonly-bg: #F1F0E8`).
    - Added badge tokens for all priority and status values.
    - Added button hierarchy classes: `.btn-zen-primary`, `.btn-zen-secondary`, `.btn-zen-tertiary`, `.btn-zen-destructive`.
    - Added form field states: `.form-control-zen`, `.form-control-readonly-zen`, `.zen-error-text`, `.required-marker`, and focus outline rings (2px `--color-secondary`).
    - Configured `client/src/main.tsx` to import `bootstrap.min.css` before `theme.css` so Zen Green design rules and custom tokens take precedence.
  - Screen & Component Refactoring:
    - `Badge.tsx`: Replaced hardcoded inline hex colors with CSS classes (`.badge-zen`, `.priority-low`, `.priority-medium`, `.priority-high`, `.status-new`, etc.) driven by CSS variables. Guaranteed visible text labels for all variants (color never sole indicator).
    - `AppShell.tsx`: Styled navbar with `--color-primary` background, active tab indicators, single DOM node for Requester info visible across desktop and mobile, and collapsible hamburger navigation toggler with `aria-label` and `aria-expanded`.
    - `RequesterSelection.tsx`: Refactored to eliminate inline hex colors, apply `.btn-zen-primary` / `.btn-zen-secondary`, use native `<select>` with `.form-control-zen`, and apply pale-green banner tokens.
    - `CreateTicket.tsx`: Implemented read-only context row with ivory background (`.form-control-readonly-zen`), responsive two-column classification, inline error icons (`⚠️`) with `.zen-error-text`, `aria-describedby` error linkage, and busy submitting button.
    - `MyTickets.tsx`: Standardized search & filter controls with theme tokens; aligned responsive breakpoint strictly with `ui-spec.md` §8 (Desktop ≥992px uses `TicketTable` via `.d-none.d-lg-block`; Mobile/Tablet <992px uses `TicketCard` via `.d-lg-none`); styled Empty and No Results states with `.zen-card`.
    - `TicketDetail.tsx`: Implemented read-only card styling (`.form-control-readonly-zen`), two-column layout on desktop, stacked on mobile/tablet, with standardized button hierarchy.
    - `AttachmentPicker.tsx` & `AttachmentSection.tsx`: Added long filename truncation (`.text-truncate-filename`) with full name in `title` attribute, accessible hint text, icon button `aria-label` + `title`, and theme-styled soft-removal modal.
  - Automated Tests:
    - Updated `client/tests/lab-02/Badge.style.test.tsx` (8 tests) to verify `.badge-zen` class and priority/status token adherence.
    - Created `client/tests/lab-02/ResponsiveLayout.test.tsx` (4 tests) covering desktop table vs mobile cards rendering, mobile navigation toggler `aria-expanded` interaction, filename truncation with title tooltip, and read-only field styling.
- Requirements: `FR-08`, `FR-09`, `BR-12`, `AC-18`, `AC-22`, `STYLE-01`, `STYLE-02`, `STYLE-03`, `RESP-UNIT`, `§8.7`, `§8.8`.

### Files changed
- `client/src/styles/theme.css`: Complete Zen Green tokens, button hierarchy, field states, badges, and responsive utilities.
- `client/src/main.tsx`: Reordered CSS imports (`bootstrap.min.css` followed by `theme.css`).
- `client/src/components/Badge.tsx`: Clean token-driven badge component.
- `client/src/components/AppShell.tsx`: Responsive navigation with accessible toggler and unified requester header element.
- `client/src/pages/RequesterSelection.tsx`: Refactored with Zen Green tokens and button classes.
- `client/src/pages/CreateTicket.tsx`: Refactored with token classes, ivory read-only fields, and responsive layout.
- `client/src/pages/MyTickets.tsx`: Token styling, responsive table (≥992px) vs cards (<992px).
- `client/src/pages/TicketDetail.tsx`: Ivory read-only styling, two-column desktop layout, and button hierarchy.
- `client/src/components/TicketTable.tsx`: Styled with Zen Green tokens and tooltip for truncated summaries.
- `client/src/components/TicketCard.tsx`: Styled with `.zen-card` and token links.
- `client/src/components/AttachmentPicker.tsx`: Accessible hint text, filename ellipsis truncation, and title tooltips.
- `client/src/components/AttachmentSection.tsx`: Token-styled attachment section, accessible actions, and soft-remove modal.
- `client/tests/lab-02/Badge.style.test.tsx`: Verified `.badge-zen` class on all variants.
- `client/tests/lab-02/ResponsiveLayout.test.tsx`: New responsive layout and accessibility test suite.
- `docs/lab-02/tests.md`: Added `RESP-UNIT` test row.
- `docs/lab-02/implementation-log.md`: Appended Phase 6 record.

### Verification run
- `cd server && npm test` -> Pass; 11 test files, 54 tests passed
- `cd server && npm run build` -> Pass; TypeScript build succeeded (0 errors)
- `cd client && npm test` -> Pass; 10 test files, 45 tests passed
- `cd client && npm run build` -> Pass; TypeScript and Vite production build succeeded (0 errors)

---

## 2026-09-05 - Review Fixes: Phase 6 Peer Review Feedback & Contract Compatibility

- Branch: `feature/lab2-zen-green-responsive`
- Scope completed:
  1. Attachment File Content Inspection (`server/src/services/attachmentStorage.ts` & `server/src/app.ts`):
     - Implemented `detectMimeFromBuffer` and `validateFileContent` inspecting magic bytes from uploaded file content directly on disk.
     - Supported signatures: PNG (`89 50 4E 47 0D 0A 1A 0A`), JPEG (`FF D8 FF`), PDF (`%PDF-`), and WEBP (`RIFF`...`WEBP`).
     - Any spoofed file extension/MIME whose content does not match its signature is rejected with 400 `UNSUPPORTED_TYPE` and unlinked from disk immediately.
  2. Create Ticket Post-Creation Failure Guidance (`client/src/pages/CreateTicket.tsx`):
     - Stored failed attachment names array `failedAttachments: string[]`.
     - Displayed specific failed filenames in success card warning.
     - Provided direct link `<Link to={"/tickets/" + createdTicket.id}>` for user to re-attach failed files in the ticket detail screen.
  3. My Tickets UX & Pagination (`client/src/pages/MyTickets.tsx`):
     - Added permanent "Clear Filters" button in filter toolbar so users can clear filters anytime (even when results are present).
     - Added Per Page selector (`pageSize`: 5, 10, 20, 50, default 10) resetting page to 1 on change.
     - Clarified Priority filter and supported backend query aliases (`priority`, `requestedPriority`, `itPriority`).
  4. Attachment Modal Keyboard Accessibility (`client/src/components/AttachmentSection.tsx`):
     - Moved focus into reason textarea automatically on modal open.
     - Added Escape key listener to close modal safely.
     - Saved and restored focus to previous active button (`lastActiveElementRef`) when modal closes.
  5. Dual API Contract Compatibility (`server/src/app.ts`):
     - Added `extractRequesterId(req)` supporting `X-Requester-Id` header across all endpoints alongside query/body parameter.
     - Exposed `ticketNo` alias alongside `ticketNumber` in ticket objects (`ticketNo: ticket.ticketNumber`).
     - Clarified contract comparison for 404 (BR-10 non-disclosure rule) vs 410.
  6. Test Suite Isolation & New Coverage:
     - Fixed `server/tests/lab-02/my-tickets.api.test.ts` test isolation with dedicated test requesters.
     - Added tests for magic byte inspection, spoofed file rejection, and header compatibility in `attachments.api.test.ts` and `my-tickets.api.test.ts`.
     - Added tests for failed file names and ticket detail link in `CreateTicket.test.tsx`.
     - Added tests for toolbar Clear button and page size selector in `MyTickets.test.tsx`.
     - Added tests for modal focus management and Escape key closing in `AttachmentSection.test.tsx`.

### Verification run
- `cd server && npm test` -> Pass; 11 test files, 60 tests passed
- `cd server && npm run build` -> Pass; TypeScript build succeeded (0 errors)
- `cd client && npm test` -> Pass; 10 test files, 48 tests passed
- `cd client && npm run build` -> Pass; TypeScript and Vite production build succeeded (0 errors)

### Next safe task
- Merged into `lab2-staging`. Proceeded to **Phase 7: E2E, screenshots, visual inspection, regression (`test/lab2-e2e-evidence`)**.

---

## 2026-09-05 - Issue: Phase 7 - E2E, Screenshots, Visual Inspection & Regression

- Branch: `test/lab2-e2e-evidence`
- Commit/PR: Pending PR into `lab2-staging`
- Scope completed:
  - Playwright Test Infrastructure:
    - Added root `package.json` with scripts (`npm run test:e2e`, `npm run test:e2e:ui`) and `@playwright/test` dependency.
    - Created `playwright.config.ts` configured for Chromium browser and automatic dual `webServer` orchestration (backend on port 3000, frontend on port 5173).
    - Added valid image test fixture `e2e/fixtures/sample-attachment.png` with authentic PNG magic header (`\x89PNG\r\n\x1a\n`).
  - E2E Tests:
    - Created `e2e/lab-02/requester-ticket-flow.spec.ts` covering:
      - `E2E-01`: Requester selection (Jennifer Anderson), form completion with classification and attachment, submission, success screen with ticket number pattern (`TKT-YYYY-NNNNNN`), My Tickets table navigation, Ticket Detail read-only inspection, and soft-removal modal with required reason.
      - `E2E-02`: Requester isolation; switching from Requester A (Jennifer Anderson) to Requester B (Michael Brown) via navbar Change button, confirming Ticket A is hidden in Requester B's ticket list, and confirming direct URL access to Ticket A returns 404 / Ticket Not Found.
  - Responsive & Visual Inspection:
    - Created `e2e/lab-02/responsive.spec.ts` capturing all 9 required screenshots per `ui-spec.md` §14:
      - `artifacts/lab-02/screenshots/create-ticket/` (`mobile.png`, `tablet.png`, `desktop.png`)
      - `artifacts/lab-02/screenshots/my-tickets/` (`mobile.png`, `tablet.png`, `desktop.png`)
      - `artifacts/lab-02/screenshots/ticket-detail/` (`mobile.png`, `tablet.png`, `desktop.png`)
    - Completed visual inspection checklist (§4 of `docs/lab-02/tests.md`): no clipped elements, no overlapping text, no horizontal scrolling on mobile (<768px), badges consistent, read-only vs editable fields visually distinct, filters and pagination usable across all viewports.
  - Full Regression Verification:
    - Server test suite: 60/60 tests passing across 11 test files.
    - Client test suite: 48/48 tests passing across 10 test files.
    - Playwright test suite: 4/4 tests passing across 2 test files.
    - Total tests: 112 passed, 0 failed, 0 skipped.
- Requirements: `RESP-01`, `RESP-02`, `E2E-01`, `E2E-02`, `AC-01`, `AC-03`, `AC-10`, `AC-11`, `AC-18`, `§8.7`, `§8.8`, `ui-spec.md` §14.

### Files changed
- `package.json`, `package-lock.json`: Added Playwright test runner and root scripts.
- `playwright.config.ts`: Playwright dual webServer test configuration.
- `e2e/fixtures/sample-attachment.png`: Test attachment fixture with valid PNG header.
- `e2e/lab-02/responsive.spec.ts`: Automated responsive testing and 9-screenshot capture suite.
- `e2e/lab-02/requester-ticket-flow.spec.ts`: Complete user journey and requester isolation E2E suite.
- `artifacts/lab-02/screenshots/**`: 9 visual evidence screenshot artifacts.
- `docs/lab-02/tests.md`: Updated `RESP-01`, `RESP-02`, `E2E-01`, `E2E-02` to Pass and marked visual checklist items complete.
- `docs/lab-02/implementation-log.md`: Appended Phase 7 completion entry.

### Verification run
- `npx playwright test` -> Pass; 2 test files, 4 tests passed (20.8s)
- `cd server && npm test` -> Pass; 11 test files, 60 tests passed (9.59s)
- `cd server && npm run build` -> Pass; TypeScript build succeeded (0 errors)
- `cd client && npm test` -> Pass; 10 test files, 48 tests passed (15.31s)
- `cd client && npm run build` -> Pass; TypeScript and Vite production build succeeded (0 errors)

### Next safe task
- Open Pull Request from `test/lab2-e2e-evidence` into `lab2-staging`.
- Provide Lab 2 handoff summary and review materials to the team.

---

## 2026-09-05 - Peer Review Fixes (Items 1-7): UX, Table, and Error Handling

- Branch: `test/lab2-e2e-evidence`
- Scope completed:
  1. **Numbered Pagination (`Pagination.tsx` & `theme.css`):**
     - Rendered dynamic Showing summary (`Showing 1 to X of Y tickets`) always when `total > 0`.
     - Replaced text with numbered page buttons `[ 1 ] [ 2 ] ...` calling `onPageChange(p)`, active page filled with Zen Green (`--color-primary`, `#006B3C`) and `aria-current="page"`.
     - Added `◄ Previous` and `Next ►` outline buttons with proper disabled states.
  2. **Last Updated Column in TicketTable (`TicketTable.tsx`, `client/src/api.ts`, `server/src/app.ts`):**
     - Returned `updatedAt: t.updatedAt.toISOString()` from `GET /api/tickets`.
     - Added `updatedAt: string` to `TicketListItem` interface.
     - Rendered `Last Updated` column in `TicketTable` with date formatting (`Sep 5, 2026`).
  3. **Current Status Sorting & Sortable Column Headers (`TicketTable.tsx`, `MyTickets.tsx`, `server/src/app.ts`):**
     - Added `currentStatus` and `updatedAt` to `validSorts` in backend.
     - Added `Status (A-Z)`, `Status (Z-A)`, `Recently Updated`, and `Oldest Updated` to Sort By dropdown.
     - Added clickable column headers (`Ticket #`, `Summary`, `Priority`, `Status`, `Created`, `Last Updated`) toggling sort direction with carets (`▲` / `▼` / `↕`).
  4. **Strict Empty vs No Results Separation per BR-12 (`MyTickets.tsx`):**
     - Empty state strictly conditioned on `unfilteredTotal === 0` (user has never submitted tickets) even if a filter was entered.
     - No results state strictly conditioned on `unfilteredTotal > 0 && total === 0` (tickets exist, but filters matched none).
  5. **Category Load Failure Alert & Retry (`MyTickets.tsx`):**
     - Tracked `categoryError` and rendered inline alert with `Retry` button on `fetchCategories` failure.
  6. **Error Replaces Table and Pagination (`MyTickets.tsx`):**
     - When ticket loading fails, hid previous table, card list, and pagination footer completely.
     - Rendered centered error card with `Unable to load your tickets` and `Retry` button replacing the table area.
  7. **In-App Handling for Download Failures (`AttachmentSection.tsx`):**
     - Intercepted download click with `fetch()`. If 404, rendered in-app alert `⚠️ This file is no longer available.` instead of opening a new tab displaying raw JSON.
  8. **Updated Unit Tests & Screenshots:**
     - Added 5 new tests in `client/tests/lab-02/MyTickets.test.tsx` and `AttachmentSection.test.tsx` (total client tests: 53/53 passed).
     - Server tests: 60/60 passed.
     - Playwright tests: 4/4 passed.
     - Total automated tests: 117/117 passed (100%).
     - Recaptured desktop, tablet, and mobile screenshots reflecting the new table column, sort carets, and pagination.

### Files changed
- `server/src/app.ts`: Added `updatedAt` and `summary` to `validSorts` and `updatedAt` to mapped ticket items.
- `client/src/api.ts`: Added `updatedAt: string` to `TicketListItem`.
- `client/src/components/TicketTable.tsx`: Added `Last Updated` column and clickable sortable headers with carets.
- `client/src/components/Pagination.tsx`: Numbered buttons and `Showing` summary matching labsheet mockup.
- `client/src/components/AttachmentSection.tsx`: In-app 404 download error handling.
- `client/src/pages/MyTickets.tsx`: Status sorting, BR-12 Empty/No results fix, category retry, error table replacement.
- `client/src/styles/theme.css`: Zen Green pagination button styles.
- `client/tests/lab-02/AttachmentSection.test.tsx`: Added download 404 error test.
- `client/tests/lab-02/MyTickets.test.tsx`: Added empty with filter, error replaces table, category retry, and sort header tests.
- `client/tests/lab-02/ResponsiveLayout.test.tsx`: Updated mock ticket items with `updatedAt`.
- `artifacts/lab-02/screenshots/**`: Updated screenshot evidence.
- `docs/lab-02/implementation-log.md`: Appended review fixes entry.

### Verification run
- `cd server && npm test` -> Pass; 11 test files, 60 tests passed
- `cd client && npm test` -> Pass; 10 test files, 53 tests passed
- `npx playwright test` -> Pass; 2 test files, 4 tests passed
- `npm run build --prefix server; npm run build --prefix client` -> Pass; 0 errors





