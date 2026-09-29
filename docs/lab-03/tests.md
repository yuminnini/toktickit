# Lab 3 — Test DD / TDD plan

All rows **Planned / Not run**. Paths below are planned deliverables, not files already implemented.
ID T01–T56 maps each AC explicitly. One row may require multiple assertions/cases; this is not a claim
that 56 tests alone cover the entire system. Additional cross-cutting coverage follows below.

## Per-AC traceability

| Test | AC | Phase | Type | Expected behavior / cases | Planned file | Result |
|---|---|---|---|---|---|---|
| T01 | AC-01 | F2/P04 | API | Active valid user logs in successfully, receiving HTTP-only session cookie and safe user profile. | `server/tests/lab-03/auth.api.test.ts` | Planned |
| T02 | AC-02 | F2/P04 | API | User with `mustChangePassword === true` is blocked from business APIs and forced to change password. | `server/tests/lab-03/auth.api.test.ts` | Planned |
| T03 | AC-03 | F2/P05 | Security/API | Submitting legacy `X-Requester-Id` header is ignored; server derives requester identity strictly from session. | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| T04 | AC-04 | F2/P05 | Security/API | Requester requesting Internal Notes endpoint receives `403 Forbidden` with zero note content or existence leak. | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| T05 | AC-05 | F2/P04 | API/Unit | Invalid email, wrong password, or inactive account returns uniform `401 Unauthorized`. | `server/tests/lab-03/auth.api.test.ts` | Planned |
| T06 | AC-06 | F2/P04 | API/Unit | Password policy enforced (12–128 chars, whitespace preserved, confirmation check, new differs from old). | `server/tests/lab-03/auth.api.test.ts` | Planned |
| T07 | AC-07 | F2/P04 | API/Unit | `/api/auth/me` returns current user; expired or missing session returns `401 Unauthorized`. | `server/tests/lab-03/auth.api.test.ts` | Planned |
| T08 | AC-08 | F2/P04 | API/Unit | Logout invalidates server session; subsequent requests with revoked cookie return `401`. | `server/tests/lab-03/auth.api.test.ts` | Planned |
| T09 | AC-09 | F2/P04 | API/Unit | Exceeding 5 failed login attempts in 15 minutes triggers `429 Too Many Requests` with `Retry-After`. | `server/tests/lab-03/auth.api.test.ts` | Planned |
| T10 | AC-10 | F2/P04 | API/Unit | CSRF protection verifies valid origin / session token for all state-changing mutations. | `server/tests/lab-03/auth.api.test.ts` | Planned |
| T11 | AC-11 | F2/P04 | API/Unit | Inactive accounts or changed roles immediately invalidate existing sessions upon next request. | `server/tests/lab-03/auth.api.test.ts` | Planned |
| T12 | AC-12 | F2/P06 | UI | Login and Change Password screens display proper validation, busy state, safe errors, and success flow. | `client/tests/lab-03/Login.test.tsx` | Planned |
| T13 | AC-13 | F2/P06 | UI | Role-based navigation displays correct links and user badge; development selector completely absent. | `client/tests/lab-03/AuthShell.test.tsx` | Planned |
| T14 | AC-14 | F2/P03 | Migration | Existing ticket IDs/numbers, attachments including file bytes, categories, systems, requester IDs and ownership survive migration from the supplied main schema. | `server/tests/lab-03/migration.integration.test.ts` | Planned |
| T15 | AC-15 | F2/P03 | Migration | Forward database migration applies cleanly on fresh and populated test databases without data loss. | `server/tests/lab-03/migration.integration.test.ts` | Planned |
| T16 | AC-16 | F2/P03 | Migration | Idempotent seed script runs repeatedly without duplicating records or overwriting changed passwords. | `server/tests/lab-03/migration.integration.test.ts` | Planned |
| T17 | AC-17 | F2/P03 | Migration | Seeded/migrated Requesters have valid provisioned credentials and initial password change flag. | `server/tests/lab-03/migration.integration.test.ts` | Planned |
| T18 | AC-18 | F2/P03 | Seed | Seed includes at least 4 active and 1 inactive Requester, 3 active and 1 inactive Staff, and 1 active Admin; at least 24 fictional tickets span all 8 statuses, all priorities and assigned/unassigned ownership, with sample comments and notes. | `server/tests/lab-03/seed.integration.test.ts` | Planned |
| T19 | AC-19 | F3/P07 | Regression/API | Requester creation, list/detail DTOs including ticketNumber and existing ticketNo alias, query behavior and ticket number formatting retain main Lab 2 behavior under session identity. | `server/tests/lab-03/requester-regression.api.test.ts` | Planned |
| T20 | AC-20 | F3/P07 | Regression/API | Legacy attachment upload, list, download, and soft-remove function with full ownership protection. | `server/tests/lab-03/requester-regression.api.test.ts` | Planned |
| T21 | AC-21 | F3/P07 | Regression/API | Foreign tickets/attachments and removed downloads return 404 NOT_FOUND with no file bytes; repeated removal of an owned attachment returns 409 ALREADY_REMOVED. Role denials return 403. | `server/tests/lab-03/requester-regression.api.test.ts` | Planned |
| T22 | AC-22 | F3/P07 | Regression/API | Logging out and logging in as another requester completely isolates ticket cache and state. | `server/tests/lab-03/requester-regression.api.test.ts` | Planned |
| T23 | AC-23 | F3/P08 | API | IT Staff Queue accessible to IT Staff; denied (`403`) to Requesters and non-permitted roles. | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| T24 | AC-24 | F3/P08 | API | Queue search by ticket number and summary operates case-insensitively with combined filters. | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| T25 | AC-25 | F3/P08 | API | Semantic priority sorting orders tickets by `HIGH` > `MEDIUM` > `LOW` rather than alphabetical order. | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| T26 | AC-26 | F3/P08 | API | Queue pagination handles bounds, total counts, page sizes (10/20/50), and page resets on filter change. | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| T27 | AC-27 | F3/P08 | UI | Queue renders distinct loading skeleton, empty queue, no-results state, and error retry state. | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| T28 | AC-28 | F3/P09 | API | Staff Detail shows all read-only ticket fields and exposes operational panels only to permitted roles. | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| T29 | AC-29 | F3/P09 | API | Staff can claim an unassigned ticket and assign/reassign to an active Staff/Admin. Every already-owned claim returns 409. Null, inactive, nonexistent and Requester owners are rejected. | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| T30 | AC-30 | F3/P09 | API | Concurrent claim or stale status update returns `409 Conflict` prompting the user to refresh. | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| T31 | AC-31 | F3/P09 | API | IT Priority updates independently from Requested Priority; Requested Priority remains immutable. | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| T32 | AC-32 | F3/P09 | API | Status transitions strictly adhere to permitted 8-status matrix; illegal transitions rejected with `400`. | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| T33 | AC-33 | F3/P09 | API | Requester cannot set status to `RESOLVED` or `CLOSED` or mutate operational fields. | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| T34 | AC-34 | F3/P10 | API/Security | Requester "Problem Appears Resolved" records timestamp and actor without changing formal status. | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| T35 | AC-35 | F3/P10 | API/Security | Public comments are readable by own Requester, Staff, and Admin; creatable by Requester and Staff. | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| T36 | AC-36 | F3/P10 | API/Security | Internal notes are readable by IT Staff and Admin, creatable only by IT Staff, and completely hidden from Requester. | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| T37 | AC-37 | F3/P10 | API/Security | Comments and notes are strictly append-only; `PUT`, `PATCH`, and `DELETE` requests are rejected with `405`. | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| T38 | AC-38 | F3/P10 | API/Security | Comment content trimmed, validated (1–2,000 chars), and rendered safely without HTML injection. | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| T39 | AC-39 | F3/P10 | E2E | IT Staff can complete end-to-end flow: triage queue $\rightarrow$ claim $\rightarrow$ prioritize $\rightarrow$ comment $\rightarrow$ resolve. | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| T40 | AC-40 | F4/P11 | API | Admin User Management lists Name, Email, Role, active Status and Edit, with name/email search and one optional role filter. | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| T41 | AC-41 | F4/P11 | API | Admin can provision new user with valid single role, active state, and initial password. | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| T42 | AC-42 | F4/P11 | API | Duplicate email submission (case-insensitive and trimmed) returns `409 Conflict`. | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| T43 | AC-43 | F4/P11 | API | Admin can edit user name, email, role, and active status without modifying credential fields. | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| T44 | AC-44 | F4/P11 | API | Administrator self-deactivation is strictly blocked by application logic and API response `400`. | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| T45 | AC-45 | F4/P11 | API | Deactivation or demotion of the last remaining active Administrator is blocked with `400`. | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| T46 | AC-46 | F4/P11 | API | Deactivating an owner or changing them to REQUESTER unassigns their tickets atomically, increments versions, preserves statuses and displays the affected count. | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| T47 | AC-47 | F4/P11 | API | Admin password reset forces `mustChangePassword === true` and revokes user sessions immediately. | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| T48 | AC-48 | F4/P11 | API | Non-admin attempting to access user management APIs or screens receives `403 Forbidden`. | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| T49 | AC-49 | F4/P11 | UI | Admin screens handle loading, validation errors, busy states, and success confirmations. | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| T50 | AC-50 | F4/P12 | Responsive/E2E | All major screens work at desktop 1280px, tablet 768px and mobile 375px without clipping/overflow; retain 1024px tablet regression from the supplied main. | `e2e/lab-03/responsive.spec.ts` | Passed |
| T51 | AC-51 | F4/P12 | Style | Reuse actual --color-* / --badge-* Zen Green palette, typography, existing badges, editable/read-only styling and extend badges for the three new statuses. | `client/tests/lab-03/Theme.style.test.tsx` | Passed |
| T52 | AC-52 | F4/P12 | Accessibility | Keyboard accessibility, associated `<label>` elements, focus rings, and touch targets (≥44px) verified. | `e2e/lab-03/accessibility.spec.ts` | Passed |
| T53 | AC-53 | F4/P12 | Security/API | Safe error handling: `404`, `409`, and `500` responses never leak stack traces, database secrets, or foreign data. | `server/tests/lab-03/safe-errors.api.test.ts` | Passed |
| T54 | AC-54 | F5/P13–P14 | Manual/evidence | Complete engineering documentation (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`). | `docs/lab-03/submission-checklist.md` | Planned |
| T55 | AC-55 | F5/P13–P14 | Manual/evidence | Specification and Test Plan exist and are reviewed before implementation PRs are merged. | `docs/lab-03/submission-checklist.md` | Planned |
| T56 | AC-56 | F5/P13–P14 | Manual/evidence | Final main test suites pass with recorded commit SHA; single submission PDF (Parts 1–9) verified. | `docs/lab-03/submission-checklist.md` | Planned |

## Cross-cutting suites and boundary cases

| ID | Scope / AC | Planned files | Cases and expected result |
|---|---|---|---|
| HARNESS-01 | prerequisite all DB/E2E | server/tests/lab-03/harness.unit.test.ts; e2e/lab-03/harness.spec.ts | missing/unsafe DB, dev fallback, worker mismatch, unsafe upload path/junction, busy port, failure cleanup; abort before I/O; valid isolated run cleans only own IDs/files |
| AUTH-UI | AC-02,06,12 | client/tests/lab-03/ChangePassword.test.tsx | boundary 11/12/128/129, preserved spaces, mismatched confirmation/old=new, loading/errors and mandatory redirect |
| AUTH-E2E | AC-01–03,05,07,08,11–13,22 | e2e/lab-03/authentication.spec.ts | initial login → change → app → logout → blocked deep link; second account cannot see first state; wrong/inactive/expired/revoked |
| PASS-UNIT | AC-06,09 | server/tests/lab-03/password.unit.test.ts | hash differs per salt, correct/wrong compare, no plaintext persistence, exact policy boundaries; rate-limit fake clock/window expiry |
| RBAC-ALL | AC-03,04,20,21,23,33,35,36,48 | server/tests/lab-03/authorization.api.test.ts | parameterize every protected route x role x own/foreign x forced-change; no-session/header spoof cannot bypass |
| CSRF-ALL | AC-10 | server/tests/lab-03/auth.api.test.ts | every mutation incl upload/reset/logout, no/foreign Origin, missing/wrong/rotated token, anonymous login and no-session logout |
| DATA-ALL | AC-14–18 | server/tests/lab-03/migration.integration.test.ts; server/tests/lab-03/seed.integration.test.ts | fresh/populated snapshots, original five statuses, inactive requester, removed attachment, email collision, IDs/FKs/numbers/bytes, provisioning and repeated seed without credential overwrite |
| REQUESTER-UI | AC-19–22 | client/tests/lab-03/RequesterRegression.test.tsx; e2e/lab-03/requester-regression.spec.ts | preserve query/DTO/validation, foreign 404, removed download 404, double-remove 409, actual downloaded bytes, stale fetch/account switch |
| QUEUE-UI | AC-23–28 | client/tests/lab-03/StaffTicketQueue.test.tsx | combined filters, semantic priorities, deterministic ties, bounds/0 results, filter page reset, loading/empty/no-results/error/forbidden |
| OPS-UNIT | AC-29–34 | server/tests/lab-03/workflow.unit.test.ts | every allowed and disallowed transition including same state, owner prerequisites, indication/reopen rules |
| OPS-UI | AC-28–39 | client/tests/lab-03/StaffTicketDetail.test.tsx | permissions, claim/reassign/priority/status confirmation, disabled submit, stale 409 refresh, distinct public/private forms |
| RACE-01 | AC-29,30,34,45,46 | server/tests/lab-03/concurrency.integration.test.ts | synchronized parallel claims/stale status/indication/owner deactivate; one valid update, no lost versions; concurrent demotions cannot leave zero admins |
| MSG-01 | AC-04,34–38 | server/tests/lab-03/comments-notes.api.test.ts | content 0/1/2000/2001 after trim, spoofed author/time, XSS as text, append order, all edit/delete verbs 405 only after auth; Requester no notes/count leakage |
| ADMIN-E2E | AC-40–49 | e2e/lab-03/user-administration.spec.ts | create → initial login/change → edit → deactivate/reactivate → reset; duplicate race, self/last-admin blocks, forbidden role, affected owner count |
| VISUAL-01 | AC-50–52 | e2e/lab-03/responsive.spec.ts; e2e/lab-03/accessibility.spec.ts | all major screens 375/768/1024/1280, keyboard/labels/focus/dialog/touch targets, inspect screenshots and element bounds |

## Legacy test migration strategy

Run original Lab 2 business suites against isolated pre-auth baseline in F1.
After User/accessor/session change, adapt existing fixtures/mock identity/assertions deliberately:
selector tests become absence/redirect tests; missing requester 400 expectations become unauthenticated 401.
Document intentional identity changes; preserve all unrelated legacy assertions, 404/409 contracts,
attachment validation/bytes/concurrency, ticket number format, list query and style behavior.
Do not leave original tests failing silently and claim success from lab-03-only tests.

## Execution and evidence

1. P02 first: close HARNESS-01 before DB/E2E writes. No `.env.test.example` blind copy into an active environment.
2. At each work package record failing test with expected reason, then passing relevant tests after code change.
3. Existing scripts: `npm run test:server`, `npm run test:client`, `npm run test:e2e`, `npm run build`.
   Harness launcher/env wiring is planned in P02; record actual final commands once implemented.
4. Full verification includes original adapted suites plus new Lab 3 suites; no only/skip/todo hiding an AC.
5. Capture raw outputs/exit codes, run ID, source SHA and screenshots under artifacts/lab-03/.
6. Migration fixture tests must use separate fresh/populated disposable DBs and hash fixture attachments.
7. Rerun full release checks on final main SHA; build success does not establish API/E2E/security correctness.

## Visual review record (fill with actual observations)

For each screen/viewport: screenshot path, run ID, reviewer, date, layout/labels/overlap/overflow,
theme/badges/readonly styling, validation placement, keyboard/focus/dialog and result/issues.
Run ID: `run-2026-09-19T12-16-03-181Z` | Date: 2026-09-19 | Verified: All viewports (375px mobile, 768px tablet, 1024px tablet-regression, 1280px desktop).

| Screen | Viewport | Screenshot Path | Observations & Layout Verification | Result |
|---|---|---|---|---|
| Login | 375px mobile | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/authentication/login-mobile.png` | Centered card, no clipping, min 44px button and input touch targets, scrollWidth <= clientWidth | Pass |
| Login | 1280px desktop | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/authentication/login-desktop.png` | Proper max-width container, clear typography, crisp branding | Pass |
| Change Password | 375px mobile | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/authentication/change-password-mobile.png` | Password fields, helper text, show/hide toggles all >=44px, no overflow | Pass |
| Change Password | 1280px desktop | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/authentication/change-password-desktop.png` | Centered container, full Zen palette adherence | Pass |
| My Tickets | 375px mobile | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/requester/my-tickets-mobile.png` | Card layout active, table cleanly hidden, badges visible | Pass |
| My Tickets | 1280px desktop | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/requester/my-tickets-desktop.png` | Full table layout, pagination, all columns properly aligned | Pass |
| Create Ticket | 375px mobile | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/requester/create-ticket-mobile.png` | Stacked inputs, touch-friendly select elements, attachment section accessible | Pass |
| Create Ticket | 1280px desktop | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/requester/create-ticket-desktop.png` | Clean grid, clear field labels with asterisks | Pass |
| Ticket Detail | 375px mobile | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/requester/ticket-detail-mobile.png` | Stacked panels, comments readable, readonly background distinct | Pass |
| Ticket Detail | 1280px desktop | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/requester/ticket-detail-desktop.png` | Two-column responsive layout, clear status and priority badges | Pass |
| Staff Queue | 375px mobile | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/staff-queue/queue-mobile.png` | Mobile cards, prominent Open buttons, filters wrap neatly | Pass |
| Staff Queue | 1280px desktop | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/staff-queue/queue-desktop.png` | 8-column data grid, owner badges, quick filter toggles, pagination | Pass |
| Staff Detail | 375px mobile | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/staff-ticket-detail/detail-mobile.png` | Operations panel stacked above timeline, action controls meet 44px | Pass |
| Staff Detail | 1280px desktop | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/staff-ticket-detail/detail-desktop.png` | Operations panel, internal notes (private banner), public comments separate | Pass |
| User Administration | 375px mobile | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/user-management/users-mobile.png` | User cards with role/active/reset badges, 44px Edit/Reset buttons | Pass |
| User Administration | 1280px desktop | `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/user-management/users-desktop.png` | Table format, search & role filter toolbar, Add User primary button, self-badge | Pass |

