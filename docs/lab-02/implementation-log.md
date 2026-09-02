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
