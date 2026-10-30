# TokTickIT — Lab 4 Test DD / TDD Plan & Traceability Matrix

- **Version:** 1.0-final
- **Date:** 2026-10-30
- **Status:** Completed & Verified (100% Pass Across Server, Client & E2E)
- **Baseline Commit:** `1f2e3abe7b3ac0f6784f281c9fb7e808def488ce`

---

## 1. Test Strategy & Structure

The test plan implements strict **Specification-Driven Development (Spec DD)** and **Test-Driven Development (TDD)**:
1. **Traceability:** Every Acceptance Criterion (AC-01 through AC-28) is mapped to one or more automated tests.
2. **Red-Green-Refactor:** Tests are written and executed to observe a meaningful failure (Red) before implementation, then verified green upon completion.
3. **Test Isolation (HARNESS-01):** Automated tests must execute against isolated test databases and scratch directories. Mutation tests never touch development data.
4. **Zero Regression:** All previous test suites (Lab 1, Lab 2, Lab 3) must continue to pass 100%.

---

## 2. Acceptance Criteria Traceability Matrix

| Test ID | AC ID | Phase | Test Type | What It Tests | Expected Result | Automated Test File | Status |
|---|---|---|---|---|---|---|---|
| **T01** | AC-01 | F2/P04 | API | Create valid Action Taken by IT Staff | Record created under correct ticket, `performedById` set to authenticated user ID (HTTP 201). | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **T02** | AC-02 | F2/P04 | API | Follow-up note required when `followUpRequired=true` | Request rejected with HTTP 400 and `VALIDATION_ERROR` when `followUpNote` is empty. | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **T03** | AC-03 | F2/P04 | API | Create Action Taken with `followUpRequired=false` | Record created with `followUpRequired=false` and null note without error (HTTP 201). | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **T04** | AC-04 | F2/P04 | API | Requester read-only view of Actions Taken on owned ticket | Returns all Actions Taken records with performer details (HTTP 200). | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **T05** | AC-05 | F2/P04 | API/Sec | Requester write attempt rejection | Requester calling `POST /api/tickets/:id/actions` or `PATCH /api/actions/:id` rejected with HTTP 403 Forbidden. | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **T06** | AC-06 | F2/P04 | API/Sec | Requester foreign ticket privacy | Requester calling `GET /api/tickets/:id/actions` for a ticket owned by another user returns HTTP 404 Not Found. | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **T07** | AC-07 | F2/P04 | API | Update existing Action Taken authorization & OCC | Author or Admin can edit (HTTP 200, version increments); non-author staff gets HTTP 403 `ACTION_EDIT_FORBIDDEN` (D4); locked ticket gets HTTP 400 `TICKET_LOCKED` (D5). | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **T08** | AC-08 | F2/P04 | API/Sec | Inactive staff user rejection | Inactive staff session attempting action mutation rejected with HTTP 403 Forbidden. | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **T09** | AC-09 | F2/P04 | API | Chronological ordering of Actions Taken | Multiple actions returned in deterministic chronological order by `actionDateTime ASC`. | `server/tests/lab-04/actions-taken.api.test.ts` | Passed |
| **T10** | AC-10 | F2/P05 | API/Sec | Resolution gate: Requester blocked from resolving ticket | Requester attempting `status: RESOLVED` rejected with HTTP 403 `RESOLUTION_RESTRICTED`. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **T11** | AC-11 | F2/P05 | API | Requester "appears resolved" advisory behavior | Sets `appearsResolvedAt` and actor without moving ticket `currentStatus`. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **T12** | AC-12 | F2/P05 | API | Permitted status transitions by IT Staff & Admin | Valid transitions with assigned owner succeed and increment version (D6); transitioning to `RESOLVED` requires $\ge 1$ Action Taken (D2). | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **T13** | AC-13 | F2/P05 | API | Disallowed status transitions rejection | Illegal transitions (e.g. `NEW`->`RESOLVED`, altering `CANCELLED`, or resolving with 0 Actions Taken returning 400 `ACTION_REQUIRED`) rejected. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **T14** | AC-14 | F2/P05 | API | Optimistic Concurrency Control matching version | Mutation with correct `expectedVersion` succeeds and increments `version` by 1. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **T15** | AC-15 | F2/P05 | API | Optimistic Concurrency Control stale conflict | Mutation with outdated `expectedVersion` rejected with HTTP 409 `VERSION_CONFLICT`. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed |
| **T16** | AC-16 | F3/P06 | API | Requester Dashboard authoritative metrics | Returns accurate `myOpenTickets`, `inProgress`, `resolved`, `closed`, `waitingForRequester`, and recent tickets for requester. | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed |
| **T17** | AC-17 | F3/P06 | API | Requester Dashboard zero/empty behavior | New user with no tickets receives all zeroes and empty recent tickets array. | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed |
| **T18** | AC-18 | F4/P11 | UI | Requester Dashboard drill-down navigation | Clicking "In Progress" card navigates to `/my-tickets?status=IN_PROGRESS` with status filter. | `client/tests/lab-04/RequesterDashboard.test.tsx` | Passed |
| **T19** | AC-19 | F3/P07 | API | IT Staff Dashboard authoritative metrics | Returns accurate `new`, `open`, `inProgress`, `waitingForRequester`, `myAssigned`, counts by status, priority, and recent queue. | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed |
| **T20** | AC-20 | F4/P10 | UI | IT Staff Dashboard drill-down navigation | Clicking "My Assigned" card navigates to queue pre-filtered by `owner=mine`. | `client/tests/lab-04/StaffDashboard.test.tsx` | Passed |
| **T21** | AC-21 | F3/P07 | API | Administrator Dashboard user statistics | Admin request to dashboard returns staff metrics plus `userStats` (total, active, inactive). | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed |
| **T22** | AC-22 | F2/P04, F3/P06–P07 | API/Sec | Unauthenticated dashboard and actions access | Unauthenticated requests receive HTTP 401 Unauthorized across all endpoints. | `server/tests/lab-04/actions-taken.api.test.ts`, `requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts` | Passed |
| **T23** | AC-23 | F5/P13 | E2E/Resp | Responsive UI across viewports | Renders without horizontal scroll or clipping at 1280px, 768px, and 375px. | `e2e/lab-04/responsive.spec.ts` | Passed |
| **T24** | AC-24 | F4/P08 | UI/A11y | Keyboard accessibility & visible focus | All interactive cards, buttons, and inputs navigable via keyboard with visible focus ring. | `client/tests/lab-04/ActionsTaken.test.tsx` | Passed |
| **T25** | AC-25 | F4/P09 | UI/A11y | Non-color status indicators | Status badges and cards include distinct text labels and icons, not color alone. | `client/tests/lab-04/TicketWorkflow.test.tsx` | Passed |
| **T26** | AC-26 | F2/P03 | Int/Seed | Idempotent seed data verification | Repeated `db:seed` execution succeeds safely; generates 0, 1, and multi-action tickets. | `server/tests/lab-04/seed.integration.test.ts` | Passed |
| **T27** | AC-27 | F5/P12 | Regr | Labs 1–3 full regression suite with D2/D6 alignment | Previous test suites pass 100%; tests resolving tickets in `staff-ticket-detail.api.test.ts` and `staff-ticket-flow.spec.ts` adapted to supply prerequisite Action Taken per D2/D6. | Full test runner (`npm test` & `npx playwright test`) | Passed |
| **T28** | AC-28 | F5/P12 | E2E | End-to-end complete workflow | Playwright E2E executes full lifecycle: create ticket -> dashboard -> actions -> resolve. | `e2e/lab-04/actions-taken-flow.spec.ts`, `ticket-resolution.spec.ts`, `dashboards.spec.ts` | Passed |

---

## 3. End-to-End (E2E) Test Plan

1. **`e2e/lab-04/actions-taken-flow.spec.ts`:**
   - Log in as IT Staff.
   - Open ticket from Queue.
   - Record an Action Taken with follow-up note and attachment note.
   - Verify action is displayed in chronological order.
   - Edit the action result and save.
   - Log out, log in as Ticket Requester.
   - Verify action is visible as read-only (no Add/Edit buttons).
2. **`e2e/lab-04/ticket-resolution.spec.ts`:**
   - Requester views ticket, clicks "Problem Appears Resolved" (advisory).
   - Verify ticket status remains unchanged.
   - IT Staff views ticket, reviews work, changes status to `RESOLVED`.
   - Verify status transitions and reflects in ticket details.
3. **`e2e/lab-04/dashboards.spec.ts`:**
   - Requester dashboard renders metric counts matching user's tickets.
   - Click metric card, verify drill-down to filtered My Tickets view.
   - IT Staff dashboard renders queue metrics.
   - Click "My Assigned", verify drill-down to Staff Queue.
