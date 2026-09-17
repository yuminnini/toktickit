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
- **Exit Gate Status**: In progress — P02 (Peer review Round 5 changes implemented & verified, real ResponseRegistrationTracker regression tests added, full suites 88/53/4 passed, awaiting reviewer re-inspection).


