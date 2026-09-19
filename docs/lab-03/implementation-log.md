# TokTickIT Lab 3 — Implementation Log

## 2026-09-17 — Phase F1 (P00–P02) Baseline, Contracts & Harness Isolation

- **Date / Contributor / Model**: 2026-09-17 | yuminnini (b4ymin) | Claude / Gemini
- **Phase & Work Packages**: F1 (P00–P02) | Issue #26 | Branch: `codex/lab3-p01-baseline-harness` | Base: `lab3-staging` (from `origin/main` @ `10c9305c40eb3790aefaba75b7fb1b42b6c144df`)
- **Requirements & ACs**: AC-54, AC-55, HARNESS-01
- **Files Changed**:
  - `.gitignore`: Updated to ignore `.env*` while preserving `.env.example` and `.env.test.example`.
  - `server/.env.test.example`: Updated to point to isolated `toktickit_test` database and test port 3103.
  - `server/vitest.config.ts`: Removed fallback to dev `.env` to guarantee test isolation.
  - `server/src/harness-guard.ts`: Implemented HARNESS-01 validation logic (database URL isolation, upload directory guard, port availability, deterministic cleanup registry, pre-flight safety check).
  - `server/tests/lab-03/harness.unit.test.ts`: Created comprehensive unit test suite (17 passing tests).
  - `playwright.config.ts`: Updated configuration to use dedicated test ports (API 3103, client 5174), `reuseExistingServer: false`, and explicit test environment variables.
- **Peer Review Iteration 1**:
  - Reviewer feedback:
    1. `ensureTestHarnessReady()` only called in unit tests; not enforced before real test runs.
    2. E2E specs hardcoded to `http://localhost:3000` while backend test port was configured to 3103.
    3. `validateUploadDir` accepted nested dev directories (e.g. `server/uploads/attachments`) and workspace root; didn't set `UPLOAD_DIR` env variable for attachment storage.
    4. Database name validation used substring `.includes("test")` which permitted names like `contest` on remote hosts.
    5. `TestHarnessRegistry` not used in real test suites; responsive tests overwrote historical screenshots in `artifacts/lab-02/screenshots/`.
  - Fixes applied:
    1. Created `server/tests/setup-harness.ts` and registered it in Vitest `setupFiles: ["tests/setup-harness.ts"]` to enforce guard before any test file runs.
    2. Created `e2e/global-setup.ts` and registered it in Playwright `globalSetup` to run `ensureTestHarnessReady()` before test webservers start.
    3. Replaced all hardcoded `http://localhost:3000` with dynamic `API_BASE_URL` (defaulting to 3103) in `e2e/lab-02/requester-ticket-flow.spec.ts` and `e2e/lab-02/responsive.spec.ts`.
    4. Enhanced `validateUploadDir` to block any directory inside `uploads` or `server/uploads` using relative path comparison, block workspace root, and set `process.env.UPLOAD_DIR`.
    5. Enhanced `validateDatabaseUrl` to enforce authorized local hostnames and strict `_test`/`test_` naming patterns (rejecting `contest`, `fastest`).
    6. Integrated `globalHarnessRegistry` in `attachments.api.test.ts` and `setup-harness.ts`; redirected responsive test screenshots to `artifacts/test-runs/screenshots/` to preserve historical Lab 2 screenshots.
- **Peer Review Iteration 2**:
  - Reviewer feedback:
    1. `[P1]` `API_BASE_URL` out of scope in `requester-ticket-flow.spec.ts` (declared inside test 1, used in test 2).
    2. `[P1]` Playwright environment timing: `webServer.env` evaluated before `globalSetup`; `.env.test` loaded after server launch.
    3. `[P1]` Upload guard bypassed by NTFS directory junctions/symlinks pointing to `server/uploads/attachments`.
    4. `[P2]` Vitest `setup-harness.ts` used `beforeAll` callback which ran after `attachments.api.test.ts` module top-level code.
    5. `[P2]` Cleanup failure only logged `console.error` rather than throwing to fail test run.
  - Fixes applied:
    1. Moved `API_PORT` and `API_BASE_URL` to module top level in `e2e/lab-02/requester-ticket-flow.spec.ts`.
    2. Updated `playwright.config.ts` to load `server/.env.test` synchronously and execute `ensureTestHarnessReady()` before creating config, passing identical validated env to `webServer.env`.
    3. Enhanced `validateUploadDir` in `server/src/harness-guard.ts` to resolve canonical real paths (`fs.realpathSync.native`), strictly checking lexical and real path containment for junctions/symlinks; added test coverage.
    4. Converted `server/tests/setup-harness.ts` to top-level `await ensureTestHarnessReady()`, executing before test module imports.
    5. Updated `afterAll` in `server/tests/setup-harness.ts` to throw descriptive error on cleanup failure, failing test run.
- **Peer Review Iteration 3**:
  - Reviewer feedback:
    1. `[P2]` DB fallback value not passed to `globalSetup` when `DATABASE_URL` is unset in env.
    2. `[P2]` Upload guard accepted parent directories enclosing dev uploads (e.g. `server/`).
    3. `[P2]` E2E tests lacked teardown/cleanup for created tickets and uploaded files.
    4. `[P2]` Screenshots overwritten between runs; lacked `<run-id>` isolation.
  - Fixes applied:
    1. Synchronized `process.env.DATABASE_URL` and `process.env.UPLOAD_DIR` in `playwright.config.ts` so `globalSetup`, `webServer`, and worker processes share identical configuration.
    2. Enhanced `validateUploadDir` with `hasPathOverlap` (bidirectional containment check) and explicit protection for project directories (`server`, `client`, `e2e`, etc.), rejecting `server/`; added unit test coverage (now 25 unit tests).
    3. Added full `test.afterAll` teardown in `e2e/lab-02/requester-ticket-flow.spec.ts` and `e2e/lab-02/responsive.spec.ts`, tracking created ticket and attachment IDs, deleting database records via Prisma, and unlinking physical files from `UPLOAD_DIR`.
    4. Added `RUN_ID` to screenshot directory paths in `e2e/lab-02/responsive.spec.ts` (`artifacts/lab-03/screenshots/<run-id>/...`) and moved `fs.mkdirSync` from module import to `test.beforeAll`.
- **Peer Review Iteration 4**:
  - Reviewer feedback:
    1. `[P2]` Cleanup failure swallowed in E2E suites: `catch {}` and `console.warn` swallowed errors in both suites (`requester-ticket-flow.spec.ts` line 40, `responsive.spec.ts` line 84). If physical file unlinking failed, teardown still continued deleting DB records, leaving orphaned files without failing the test run.
    2. `[P2]` If `submitBtn.click()` fails/times out after ticket creation, no ID is captured for cleanup: Reading response and recording ID after `await submitBtn.click()` caused IDs to be lost if click failed.
    3. Status note: Keep P02 as "In progress" and add regression tests for both cases before closing.
  - Fixes applied:
    1. Refactored teardown in both `e2e/lab-02/requester-ticket-flow.spec.ts` and `e2e/lab-02/responsive.spec.ts` to collect all errors in `cleanupErrors` and orphaned resources in `uncleanedResources`. If any cleanup operation fails, teardown throws an explicit Error detailing all failed operations and uncleaned resources to fail the test run. Prisma `$disconnect()` is reliably invoked in `finally`.
    2. In `requester-ticket-flow.spec.ts`, attached `page.on("response")` in `test.beforeEach` using strict URL pathname checks (`/api/tickets` vs `/attachments`) to capture created ticket and attachment IDs immediately upon receiving the response from the backend, independent of whether `submitBtn.click()` succeeds. Stored all asynchronous registrations in `pendingRegistrations` and awaited `Promise.allSettled(pendingRegistrations)` at the beginning of `afterAll` before teardown executes.
    3. Updated `TestHarnessRegistry` in `server/src/harness-guard.ts` to track `uncleanedResources` and exported `assertCleanupSucceeded()` helper.
    4. Added 2 regression tests in `server/tests/lab-03/harness.unit.test.ts`:
       - `assertCleanupSucceeded` throws and lists uncleaned resources when file unlinking/handler fails.
       - Asynchronous response listener captures created IDs even if subsequent UI action throws.
  - Fixes verification:
    - Checked `afterAll` in both specs; confirmed safe idempotent deletion (`findUnique` prior to `delete`) and strict URL pathname matching prevents attachment POSTs from being mistaken for tickets.
- **Peer Review Iteration 5**:
  - Reviewer feedback:
    1. `[P2]` Reading response body failed and swallowed error: `requester-ticket-flow.spec.ts` (lines 40 & 52) used `catch {}`. If `response.json()` failed (e.g. page/context closed while reading body), no ID was recorded and teardown reported success without cleaning tickets or reporting errors.
    2. Must collect ID registration errors and report them as teardown failures.
    3. Must await registration in `afterEach` before the page fixture is closed.
    4. Must add regression tests invoking the actual listener/helper (not a hand-rolled `trackedIds.push()` mock).
    5. Status remains: `In progress — P02`.
  - Fixes applied:
    1. Extracted `ResponseRegistrationTracker` class into `server/src/harness-guard.ts` to manage network response registration and track all body parsing errors into `registrationErrors`.
    2. Integrated `ResponseRegistrationTracker` in `e2e/lab-02/requester-ticket-flow.spec.ts`.
    3. Added `test.afterEach` in `requester-ticket-flow.spec.ts` awaiting `responseTracker.waitForRegistrations()` before the Playwright `page` fixture is torn down.
    4. Updated teardown (`test.afterAll`) to initialize `cleanupErrors` with `...responseTracker.registrationErrors`, ensuring that if response body reading fails, teardown throws and fails the test run with detailed diagnostics.
    5. Added regression test in `server/tests/lab-03/harness.unit.test.ts` exercising the real `ResponseRegistrationTracker` with simulated `response.json()` failure (page closed error), verifying that errors are captured and teardown fails.
    6. Guarded category and system select dropdowns in `requester-ticket-flow.spec.ts` to await `not.toBeDisabled()` before selecting options.
- **Test Results (Post-Fixes)**:
  - `server/tests/lab-03/harness.unit.test.ts`: 28 passed (exit code 0).
  - `server` baseline suite: 12 test files, 88 passed (exit code 0).
  - `client` baseline suite: 10 test files, 53 passed (exit code 0).
  - `playwright` E2E suite: 2 test files, 4 passed (exit code 0, duration 19.1s).
- **Exit Gate Status**: Completed / Passed — Phase F1 (P00–P02 Baseline, Contracts & Harness Isolation) approved by peer reviewer; PR #38 merged into `lab3-staging` at commit `33624d0`.

## 2026-09-18 — Phase F2 (P03–P06) Migration, Authentication, Authorization & Auth UI

- **Date / Contributor / Model**: 2026-09-18 | yuminnini (b4ymin) | Antigravity (Gemini 3.8 Flash)
- **Phase & Work Packages**: F2 (P03–P06) | Issue #41 | Branch: `codex/lab3-p03-p06-auth-roles` | Base: `lab3-staging`
- **Requirements & ACs**: AC-01–02, AC-05–18, BR-01–03, BR-05, BR-10–13, HARNESS-01
- **Implementations**:
  - **P03 (Schema Migration & Idempotent Seed)**:
    - Extended Prisma schema: `Role` enum (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), `TicketStatus` enum extensions (`WAITING_FOR_REQUESTER`, `REOPENED`, `CANCELLED`), `User @@map("RequesterUser")`, `Session`, `PublicComment`, `InternalNote`, ticket operational fields (`itPriority`, `ticketOwnerId`, `version`, `appearsResolvedAt`, `appearsResolvedById`).
    - Deployed idempotent forward migration SQL with `IF NOT EXISTS` guards (`server/prisma/migrations/20260918000000_lab3_auth_roles_ticketing/migration.sql`).
    - Implemented idempotent seed script (`server/prisma/seed.ts`) provisioning 4 active + 1 inactive requesters, 3 active + 1 inactive IT staff, 1 administrator, and 24 tickets across all 8 statuses/priorities with sample notes and comments.
    - Added Prisma `$use` middleware and strongly typed `requesterUser` alias on `ExtendedPrismaClient` in `server/src/prisma.ts`.
  - **P04 (Authentication Backend API)**:
    - Password hashing service (`server/src/services/password.ts`) with Argon2id (`@node-rs/argon2`, memory: 19456 KiB, iterations: 2, parallelism: 1) and policy validation (12–128 characters, whitespace preserved, confirm check, new != old).
    - Rolling window rate limiter (`server/src/services/rateLimiter.ts`) enforcing 5 failed attempts per 15-minute window per email+IP, triggering 429 with `Retry-After` on the 6th attempt.
    - Stateful session service (`server/src/services/session.ts`) generating 32-byte crypto tokens, storing SHA-256 token hash in DB, 8-hour lifetime, CSRF token, and setting `toktickit_session` HttpOnly cookie.
    - CSRF protection middleware (`server/src/middleware/csrf.ts`) verifying Origin on mutations and `X-CSRF-Token` header for active sessions.
    - Auth routes (`server/src/routes/auth.ts`) mounted at `/api/auth` (`/login`, `/me`, `/csrf`, `/change-password`, `/logout`).
  - **P05 (Server Authorization & Session Identity)**:
    - Auth middleware (`server/src/middleware/auth.ts`): `authenticateSession`, `requireAuth`, `requirePasswordChanged` (enforces 403 `PASSWORD_CHANGE_REQUIRED`), `requireRole`.
    - Decommissioned `/api/requesters` returning 404.
    - Business routes updated in `server/src/app.ts` to derive identity strictly from session, ignoring spoofed `X-Requester-Id`.
    - Foreign resource 404 non-disclosure and internal notes 403 isolation enforced.
    - Adapted legacy test suites to authenticate via session cookies and send CSRF tokens on mutations.
  - **P06 (Frontend Authentication UI & Route Guards)**:
    - Created `client/src/context/AuthContext.tsx` managing `user`, `isLoading`, `login`, `logout`, `changePassword`, `refreshUser`, and clearing legacy `lab2-selected-requester` sessionStorage.
    - Updated `client/src/api.ts` with `credentials: "include"`, CSRF token caching, and auth methods.
    - Created `client/src/pages/LoginPage.tsx` with email/password inputs, reveal toggle, busy state, and 429 countdown.
    - Created `client/src/pages/ChangePasswordPage.tsx` with policy validation, forced-change banner, and error feedback.
    - Updated `client/src/components/AppShell.tsx` with user badge, role badge, logout button, and complete removal of development requester switcher.
    - Created `client/src/components/RouteGuard.tsx` enforcing session, forced password change redirect, and RBAC.
    - Updated `client/src/components/Badge.tsx` supporting new statuses and role badges.
    - Updated `client/src/App.tsx` routing `/login`, `/change-password`, `RoleRedirect`, and route guards.
    - Created comprehensive unit/component tests in `client/tests/lab-03/Login.test.tsx` (T12) and `client/tests/lab-03/AuthShell.test.tsx` (T13).
- **Test Results**:
  - `server`: 17 test files passed, 113 tests passed (0 failures, 100% pass rate).
  - `client`: 12 test files passed, 65 tests passed (0 failures, 100% pass rate).
  - `server build` (`tsc`): 0 errors, build clean.
  - `client build` (`tsc && vite build`): 0 errors, build clean.
- **Exit Gate Status**: Phase F2 (P03–P06) implementation completed and fully verified against contracts. Opened [PR #42](https://github.com/yuminnini/toktickit/pull/42) (`codex/lab3-p03-p06-auth-roles` → `lab3-staging`) for Issue #41. Ready for peer review.

### 2026-09-18 (Evening): Phase F2 (P03–P06) Peer Review Round 1 Resolution
- **Peer Review Feedback Addressed (7 items)**:
  1. `[P1 Fixed]` **Seed Ticket Overwrite**: Isolated fixture ticket numbers into dedicated range `TKT-2026-900001`–`900024` and configured `update: {}` on upsert in `server/prisma/seed.ts` so re-seeding never overwrites existing tickets. Added integration test verifying non-overwrite.
  2. `[P1 Fixed]` **Seed Account Status & Role Preservation**: Updated `seed.ts` to preserve existing user roles, active status, and names, filling in only missing credentials (`passwordHash`). Added integration test verifying account preservation.
  3. `[P2 Fixed]` **Rate Limit Header Spoofing**: Configured safe `trust proxy` setting in `server/src/app.ts` and updated `getClientIp` in `server/src/routes/auth.ts` to use Express's validated `req.ip` rather than trusting unverified `X-Forwarded-For` headers. Added test verifying rotated `X-Forwarded-For` cannot bypass rate limiting.
  4. `[P2 Fixed]` **Legacy Account Credential Provisioning**: Added routine in `seed.ts` to find and provision all users lacking credentials with initial password and `mustChangePassword: true`, ensuring zero orphaned unprovisioned accounts. Added integration test.
  5. `[P2 Fixed]` **Atomic Password Change & Concurrency Control**: Wrapped password update, session revocation, and `createSession` inside a single Prisma `$transaction` in `server/src/routes/auth.ts`, supporting transaction client in `server/src/services/session.ts`. Added optimistic `sessionVersion` concurrency check returning 409 `CONCURRENT_MODIFICATION` on race condition.
  6. `[P2 Fixed]` **Logout DB Error Propagation**: Modified `revokeSessionByHash` in `session.ts` to only ignore `P2025` (RecordNotFound) and rethrow any database connection/query failures. Updated `/api/auth/logout` to return 500 `INTERNAL_ERROR` upon failure. Added regression test.
  7. `[P2 Fixed]` **E2E Test Authentication & Session Integration**: Updated `e2e/lab-02/requester-ticket-flow.spec.ts` to use real login (`/login`), real session cookies, CSRF tokens on mutating requests, verified ownership isolation 404, and verified logout flow. Added session authentication in `e2e/lab-02/responsive.spec.ts` and `{ credentials: "include" }` to `AttachmentSection.tsx` download fetch.
- **Latest Real Verification Results**:
  - `server`: 17 test files passed, 119 tests passed (0 failures, 100% pass rate).
  - `client`: 12 test files passed, 65 tests passed (0 failures, 100% pass rate).
  - `playwright`: 4 E2E tests passed (15.3s, 0 failures, 100% pass rate).
  - `server build` (`tsc`): 0 errors, build clean.
  - `client build` (`tsc && vite build`): 0 errors, build clean.
- **Status**: Round 1 feedback fully resolved and tested.

### 2026-09-18 (Night): Phase F2 (P03–P06) Peer Review Round 2 Resolution
- **Peer Review Feedback Addressed (2 items)**:
  1. `[P2 Fixed]` **Main Seed Enforces Forced Password Change**: Updated `server/prisma/seed.ts` so that all seed accounts (`USERS`), including Jennifer Anderson and Michael Brown, have `mustChangePassword: true` per specification. Bypassing forced password change for automated browser flows is strictly isolated to E2E fixture preparation in `e2e/lab-02/requester-ticket-flow.spec.ts` (`test.beforeAll`). Added regression test in `server/tests/lab-03/seed.integration.test.ts`.
  2. `[P2 Fixed]` **Differentiate Session Not Found from DB Read Failure**: Updated `server/src/middleware/auth.ts` (`authenticateSession`) so that database read or revocation errors in the catch block immediately return 500 `INTERNAL_ERROR` rather than swallowing the error and calling `next()`. This prevents `/api/auth/logout` from falsely returning 204 when the session was not revoked due to a database outage. Additionally hardened `/api/auth/logout` in `server/src/routes/auth.ts` to revoke tokens directly from session cookies when `req.session` is unpopulated, propagating DB errors as 500. Added regression test in `server/tests/lab-03/auth.api.test.ts`.
- **Latest Real Verification Results**:
  - `server`: 17 test files passed, 121 tests passed (0 failures, 100% pass rate).
  - `client`: 12 test files passed, 65 tests passed (0 failures, 100% pass rate).
  - `playwright`: 4 E2E tests passed (22.2s, 0 failures, 100% pass rate).
  - `server build` (`tsc`): 0 errors, build clean.
  - `client build` (`tsc && vite build`): 0 errors, build clean.
- **Exit Gate Status**: Completed / Passed — Phase F2 (P03–P06) approved by peer reviewer; PR #42 merged into `lab3-staging` at commit `edd8b16`. Ready for Phase F3 (P07–P10).

## 2026-09-18 — Phase F3 (P07–P10) Requester Regression, Staff Queue, Operations & Communications

- **Date / Contributor / Model**: 2026-09-18 | yuminnini (b4ymin) | Antigravity (Gemini 3.8 Flash)
- **Phase & Work Packages**: F3 (P07–P10: Requester Regression, Staff Queue, Operations & Communications) | Issue #43 | Branch: `codex/lab3-p07-p10-staff-workflow` | Base: `lab3-staging` (from `edd8b16`)
- **Requirements & ACs**: AC-19–39 (T19–T39), BR-04, BR-06–09, BR-14, BR-16, MSG-01, QUEUE-UI, HARNESS-01
- **Implementations**:
  - **P07 (Requester Regression & Session Adaptation)**:
    - Verified requester ticket creation (`POST /api/tickets`), listing (`GET /api/tickets`), and detail (`GET /api/tickets/:id`) derive `requesterId` strictly from authenticated session (`req.user.id`).
    - Preserved all response DTO contracts: `ticketNumber` and `ticketNo` alias, `active` flags, and attachment metadata fields (`originalName`, `storedFilename`, `sizeBytes`, `uploadedAt`).
    - Verified requester isolation with foreign resource 404 non-disclosure, removed-download 404, and repeat-removal 409.
    - Verified test suite: `server/tests/lab-03/requester-regression.api.test.ts` (4/4 passed).
  - **P08 (Staff Queue Backend & UI)**:
    - Implemented `GET /api/staff/tickets` in `server/src/routes/staff.ts` supporting pagination (`page`, `pageSize` default 25, max 100), full-text search across `summary`, `description`, `ticketNumber`, requester name/email, and multi-field filtering (`status`, `itPriority`, `categoryId`, `unassignedOnly`, `assignedToMe`).
    - Implemented `GET /api/staff/eligible-owners` returning active `IT_STAFF` users sorted by name.
    - Built responsive frontend queue (`client/src/pages/StaffQueuePage.tsx`): desktop table, mobile card layout, loading skeleton, filter toolbar, pagination controls, search input with reset, and empty/no-results states.
    - Added tests: `client/tests/lab-03/StaffTicketQueue.test.tsx` (5/5 passed) and `server/tests/lab-03/staff-queue.api.test.ts` (5/5 passed).
  - **P09 (Staff Ticket Operations & Concurrency Control)**:
    - Implemented `GET /api/staff/tickets/:id` returning ticket detail with requester profile and assigned staff info.
    - Implemented `POST /api/staff/tickets/:id/claim`: allows active staff to claim unassigned ticket; rejects already-claimed tickets with 409 `TICKET_ALREADY_ASSIGNED`.
    - Implemented `PATCH /api/staff/tickets/:id/owner`: allows reassigning ticket to active staff; rejects inactive/non-staff with 400.
    - Implemented `PATCH /api/staff/tickets/:id/priority`: allows staff to set `itPriority`; strictly enforces `requestedPriority` immutability.
    - Implemented `PATCH /api/staff/tickets/:id/status`: enforces exact 8-status transition matrix (`specification.md`), rejecting disallowed transitions with 400 `INVALID_STATUS_TRANSITION`.
    - Implemented optimistic concurrency control across all mutations: requires `currentVersion` in body; rejects version mismatches with 409 `VERSION_CONFLICT` returning latest version and ticket state.
    - Guaranteed all database mutations commit before sending HTTP responses.
    - Built staff detail page (`client/src/pages/StaffTicketDetailPage.tsx`): operational action panel (Claim, Reassign, Change IT Priority, Update Status), transition modal, concurrency conflict banner, public comments feed, and internal notes feed.
    - Verified test suite: `server/tests/lab-03/staff-ticket-detail.api.test.ts` (6/6 passed).
  - **P10 (Communications, Internal Notes & Requester Indication)**:
    - Implemented `POST /api/tickets/:id/appears-resolved` in `server/src/routes/communications.ts`: allows ticket requester to mark issue resolved without altering formal status; sets `appearsResolvedAt` and `appearsResolvedById`; idempotent on duplicate calls.
    - Implemented `GET` and `POST /api/tickets/:id/comments`: public comments creatable by own requester and staff, readable by own requester, staff, and admin.
    - Implemented `GET` and `POST /api/tickets/:id/internal-notes`: private internal notes creatable and readable only by staff and admin; completely hidden from requesters (returns 403 / 404).
    - Enforced append-only communications: `PUT`, `PATCH`, `DELETE` return 405 `METHOD_NOT_ALLOWED` with `Allow: GET, POST` header.
    - Content validation and sanitization: 1–2000 characters, trimmed, rejects spoofed author or timestamps, safely displayed as raw text without execution.
    - Integrated `PublicCommentsSection.tsx` and `InternalNotesSection.tsx` into client pages, and added "Problem Appears Resolved" banner and modal in `TicketDetail.tsx`.
    - Created test suite: `server/tests/lab-03/comments-notes.api.test.ts` (6/6 passed).
  - **Concurrency & Reliability Hardening**:
    - Atomic conditional updates (`tx.ticket.updateMany`) for `POST /claim`, `PATCH /owner`, `PATCH /priority`, and `PATCH /status` to eliminate race conditions under concurrent requests.
    - Owner eligibility check in status transitions: requires assigned owner to be active and have `IT_STAFF` or `ADMINISTRATOR` role (400 `OWNER_REQUIRED`).
    - Error resilience in `loadTicketForAccess` returning 500 `INTERNAL_ERROR` on database failures instead of unhandled rejections.
    - Added unit and simulation suite: `server/tests/lab-03/staff-workflow.unit.test.ts` (4/4 passed).
  - **End-to-End Flow (T39 / AC-39)**:
    - Created `e2e/lab-03/staff-ticket-flow.spec.ts` executing complete staff flow: login -> triage queue -> search & filter -> claim ticket -> set IT priority -> post public comment & internal note -> transition status to IN_PROGRESS and RESOLVED.
- **Test Results**:
  - `server`: 22 test files passed, 148 tests passed (0 failures, 100% pass rate).
  - `client`: 13 test files passed, 70 tests passed (0 failures, 100% pass rate).
  - `playwright`: 3 test files passed, 5 tests passed (0 failures, 100% pass rate).
  - `server build` (`tsc`): 0 errors, build clean.
  - `client build` (`tsc && vite build`): 0 errors, build clean.
- **Exit Gate Status**: Completed / Passed — Phase F3 (P07–P10) approved by peer reviewer; PR #44 merged into `lab3-staging` at commit `f229400`. Ready for Phase F4 (P11–P12).

