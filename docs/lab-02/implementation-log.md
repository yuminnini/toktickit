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

