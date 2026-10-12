# TokTickIT — Lab 4 Engineering Specification

- **Version:** 1.0-draft
- **Date:** 2026-10-12
- **Status:** Planned (Spec DD Stage)
- **Baseline Commit:** `1f2e3abe7b3ac0f6784f281c9fb7e808def488ce` (Lab 3 Release on `main`)

---

## 1. Sprint Goal

Deliver the final product increment for TokTickIT by implementing a structured **Actions Taken** work-log under each Ticket, enforcing the authoritative **Ticket Lifecycle & Resolution Rules**, providing **Role-Appropriate Dashboards** for Requesters, IT Staff, and Administrators with authoritative server metrics and drill-down navigation, while maintaining the **Zen Green design language**, ensuring accessibility and responsive layout across desktop, tablet, and mobile, and guaranteeing zero regression across all Lab 1–3 capabilities.

---

## 2. Stakeholder Request Interpretation

The stakeholder requires the service desk to transition from simple communication to actual tracking and coordination of technical work:
1. **Actions Taken:** IT Staff members need to log discrete work actions under each ticket (Parent-Child relationship). While a ticket has a single designated Ticket Owner for overall coordination, multiple IT Staff members can perform work and record actions. Each action entry records the date/time, action description, result, the performer (auto-detected from session), whether follow-up is required (and mandatory follow-up notes if so), and attachment notes.
2. **Resolution Authority:** Requesters may signal that an issue appears resolved (advisory only), but only IT Staff/Administrators can formally evaluate the work and transition the ticket to `RESOLVED` status.
3. **Operational Dashboards:** Both Requesters and IT Staff need concise, role-tailored dashboards that summarize operational data from authoritative backend calculations and link directly to detailed queues/tickets without duplicating full tables.
4. **Product Polish & Hardening:** The entire system must be consistent, secure, responsive, accessible, and resilient against concurrency conflicts.

---

## 3. Scope

### In-Scope
- **Data Model & Migration:** Add `ActionTaken` model with relations to `Ticket` (1:N) and `User` (N:1, `performedBy`), additive migration preserving all existing data, and idempotent seed scripts with 0, 1, and multi-action tickets.
- **Actions Taken Workflow & REST APIs:** Create, list, and update Actions Taken records; automatic session-based actor assignment; validation rules for follow-up notes; role enforcement (Requester read-only for owned tickets, IT Staff/Admin read-write).
- **Ticket Workflow & Resolution Gate:** Strict backend transition matrix for all 8 statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`); resolution gated to IT Staff/Admin; optimistic concurrency control (`version` check, HTTP 409).
- **Authoritative Dashboards:** Backend endpoints for Requester and IT Staff/Admin dashboards; calculated metric counts; recent ticket lists; drill-down query navigation; loading, empty, and safe error states.
- **Frontend Extensions:** Actions Taken list and form on Ticket Detail; permitted status transition controls; IT Staff/Admin Dashboard page; Requester Dashboard page; Zen Green theme consistency.
- **Quality & Non-Functional:** Responsive layouts (375px, 768px, 1280px+); accessibility compliance (keyboard navigation, visible focus rings, ARIA labels, non-color cues); automated test suites (API, UI, E2E, Regression); peer review and traceability.

### Explicitly Excluded (Out of Scope per Section 4.2)
- ❌ Automatic SLA clocks, escalation engines, on-call scheduling, and breach notifications.
- ❌ Email, SMS, LINE, Push, or external notification webhooks.
- ❌ Inventory consumption, spare-parts management, purchasing, or cost accounting.
- ❌ Time-sheet billing, payroll, or detailed labor-cost calculations.
- ❌ Multi-level approval workflows and electronic signatures.
- ❌ Advanced business-intelligence tools, custom report builders, or export warehouses.
- ❌ Multi-tenant organizations and cloud deployment configurations.
- ❌ Unapproved new product features not covered in this specification.

---

## 4. Functional Requirements (FR)

| FR ID | Requirement Statement | Mapped ACs |
|---|---|---|
| **FR-01** | **Actions Taken Data Management:** The system shall record multiple Actions Taken lines under a ticket with action date/time, description, result, performer, follow-up flag, follow-up note, and attachment notes. | AC-01, AC-02, AC-03 |
| **FR-02** | **Actions Taken Authorization:** Only authenticated IT Staff and Administrators shall create and update Actions Taken records. Authenticated Requesters may only view Actions Taken for tickets they own. Unauthorized access must yield HTTP 403 or 404 (for foreign tickets). | AC-04, AC-05, AC-06 |
| **FR-03** | **Actions Taken Validation:** The system shall validate that `actionDateTime`, `description`, and `result` are provided and non-empty. If `followUpRequired` is `true`, `followUpNote` is strictly mandatory. The performer must be an active IT Staff or Administrator. | AC-07, AC-08, AC-09 |
| **FR-04** | **Ticket Resolution Gate:** The system shall strictly enforce that transitioning a ticket to `RESOLVED` can only be performed by authenticated IT Staff or Administrators. Requester "appears resolved" indications remain purely advisory and shall not change ticket status. | AC-10, AC-11 |
| **FR-05** | **Ticket Status Transition Matrix:** The backend shall enforce permitted state transitions among the 8 statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`). Disallowed transitions must be rejected with HTTP 400/422. | AC-12, AC-13 |
| **FR-06** | **Optimistic Concurrency Control:** Ticket mutations (status, owner, priority) shall require an `expectedVersion` check. If the ticket has been modified by another concurrent transaction, the update must fail with HTTP 409 Conflict. | AC-14, AC-15 |
| **FR-07** | **Requester Dashboard API & UI:** The system shall provide an authoritative dashboard for Requesters summarizing their own tickets: Total Open, Waiting for Requester, Recently Updated, Recently Resolved, with quick actions and clickable drill-down filters. | AC-16, AC-17, AC-18 |
| **FR-08** | **IT Staff Dashboard API & UI:** The system shall provide an authoritative dashboard for IT Staff summarizing queue metrics: Unassigned, My Assigned, by Status, by IT Priority, Recently Updated, with quick actions and clickable drill-down filters. | AC-19, AC-20, AC-21 |
| **FR-09** | **Administrator Dashboard Extension:** The system shall allow Administrators to view IT Staff operational metrics plus concise user account statistics (total users, active staff, inactive users). | AC-22 |
| **FR-10** | **Zen Green Responsive UI & Accessibility:** All Lab 4 screens shall adhere to Zen Green styling, support Mobile (375px), Tablet (768px), and Desktop (1280px+), maintain visible focus, non-color cues, and avoid layout clipping/horizontal overflow. | AC-23, AC-24, AC-25 |
| **FR-11** | **Regression Preservation & Idempotent Seed:** All previous capabilities (Auth, Attachments, Comments, Notes, Admin User Management) must remain fully operational. Seed data must be safe to execute repeatedly without duplicating records. | AC-26, AC-27, AC-28 |

---

## 5. Business Rules (BR)

### Actions Taken Rules
- **BR-01:** An Action Taken record belongs to exactly one Ticket (Parent-Child relationship). Deleting or archiving a ticket cascades or preserves action history.
- **BR-02:** The Ticket Owner coordinates the ticket as a whole, but an Action Taken may be recorded by any active IT Staff or Administrator member (not restricted to the Ticket Owner).
- **BR-03:** The `performedBy` actor is automatically populated from the authenticated session user. Client requests cannot spoof or supply an arbitrary performer ID.
- **BR-04:** Inactive IT Staff or Administrator users cannot record or edit Actions Taken. If a user account is deactivated, existing Actions Taken preserve the original author history.
- **BR-05:** `followUpRequired` is a boolean flag. When `followUpRequired` is `true`, `followUpNote` is mandatory (non-empty string, min 3 characters). When `false`, `followUpNote` is optional or cleared.
- **BR-06:** Actions Taken are listed in deterministic chronological order (ascending by `actionDateTime` then `id`).
- **BR-07:** Requesters have read-only access to Actions Taken on tickets they own. Requesters cannot create, update, or delete Actions Taken. Any write attempt returns HTTP 403 Forbidden.

### Ticket Status & Resolution Rules
- **BR-08:** The 8 ticket statuses are:
  - `NEW`: Ticket created, unassigned.
  - `OPEN`: Assigned or acknowledged, work pending.
  - `IN_PROGRESS`: Actively being worked on by IT Staff.
  - `WAITING_FOR_REQUESTER`: Pending additional information or confirmation from Requester.
  - `RESOLVED`: Technical work completed and verified by IT Staff.
  - `CLOSED`: Formally closed (by IT Staff/Admin or Requester confirmation).
  - `REOPENED`: Previously resolved/closed ticket reopened due to recurring issue.
  - `CANCELLED`: Ticket invalidated or withdrawn.
- **BR-09 (Resolution Gate):** Only IT Staff and Administrators can transition a ticket to `RESOLVED`. A Requester signaling `appearsResolved` is strictly an advisory timestamp and note; it does NOT change the ticket status.
- **BR-10 (Permitted Transitions):**
  - From `NEW`: -> `OPEN`, `IN_PROGRESS`, `CANCELLED`
  - From `OPEN`: -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - From `IN_PROGRESS`: -> `WAITING_FOR_REQUESTER`, `RESOLVED`, `OPEN`, `CANCELLED`
  - From `WAITING_FOR_REQUESTER`: -> `IN_PROGRESS`, `OPEN`, `RESOLVED`, `CANCELLED`
  - From `RESOLVED`: -> `CLOSED`, `REOPENED`
  - From `CLOSED`: -> `REOPENED`
  - From `REOPENED`: -> `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - From `CANCELLED`: Terminal state (no further transitions permitted except Admin override).
- **BR-11 (Concurrency Control):** All ticket updates (status, owner, priority) must verify the ticket `version`. If the client submits `expectedVersion` that does not match the database version, the update is rejected with HTTP 409 Conflict.

### Dashboard Calculation Rules
- **BR-12 (Requester Dashboard Calculations):**
  - `totalOpen`: Count of tickets where `requesterId = currentUser.id` and `currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`.
  - `waitingForRequester`: Count of tickets where `requesterId = currentUser.id` and `currentStatus = 'WAITING_FOR_REQUESTER'`.
  - `recentlyUpdated`: Up to 5 most recently updated tickets where `requesterId = currentUser.id`, ordered by `updatedAt DESC`.
  - `recentlyResolved`: Count of tickets where `requesterId = currentUser.id` and `currentStatus = 'RESOLVED'` within the last 30 days.
  - Empty behavior: When no tickets exist, metric cards display `0` and list views display friendly empty state with a "Create Ticket" action button.
- **BR-13 (IT Staff Dashboard Calculations):**
  - `unassigned`: Count of tickets where `ticketOwnerId IS NULL` and `currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`.
  - `myAssigned`: Count of tickets where `ticketOwnerId = currentUser.id` and `currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`.
  - `byStatus`: Count of active tickets grouped by each of the active statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`).
  - `byPriority`: Count of active tickets grouped by `itPriority` (`HIGH`, `MEDIUM`, `LOW`).
  - `recentQueue`: Up to 5 most recently updated active tickets ordered by `updatedAt DESC`.
  - Empty behavior: When no tickets match, metric displays `0` and list displays "No tickets in queue".
- **BR-14 (Administrator Dashboard Extension):**
  - Reuses all IT Staff metrics plus:
  - `userStats`: `{ totalUsers: number, activeStaff: number, inactiveUsers: number }`.

---

## 6. UI Specification Summary

- **Design Language:** Zen Green theme (`--zen-primary: #198754`, `--zen-bg: #f8faf8`, `--zen-surface: #ffffff`, clean borders, subtle shadows).
- **Navigation:** Top navigation bar indicates active page clearly (`Dashboard`, `My Tickets` / `Staff Queue`, `Create Ticket`, `Profile / Logout`).
- **Actions Taken UI (on Ticket Detail):**
  - Section placed beneath ticket details and before comments/notes.
  - Table or card list showing: Date/Time, Description, Result, Performed By badge, Follow-up indicator, Attachment notes.
  - Create Action Form (for IT Staff/Admin): Date/time picker (default now), description textarea, result textarea, follow-up toggle switch, follow-up note input (conditional validation), attachment notes text input.
  - Edit Action Form: Pre-filled modal or inline edit for existing actions.
  - Requester View: Read-only presentation; create/edit buttons are hidden and write endpoints protected.
- **Ticket Workflow Controls:**
  - Status transition dropdown or action buttons displaying only permitted next statuses.
  - Instant UI feedback with alert toast on success.
  - Stale update warning (HTTP 409) displaying a "Reload Latest Data" prompt.
- **Dashboard UI (Requester & Staff):**
  - Header: Welcome message with user name and date.
  - Metrics Grid: 4–5 cards showing key operational numbers with distinct icons and label captions.
  - Drill-down: Clicking any card navigates to the list view pre-filtered by that metric.
  - Recent Tickets Table: Compact table with Ticket Number, Summary, Status Badge, Updated Date, and View link.
  - Quick Actions Sidebar/Card: Direct shortcuts to `Create Ticket`, `Search`, `My Queue`.
- **Responsive Layouts:**
  - Desktop (≥1024px): Multi-column grid (4-col metrics, 2-col main/sidebar).
  - Tablet (768px–1023px): 2-column metrics grid, stacked recent tickets & quick actions.
  - Mobile (375px–767px): 1-column stacked cards, full-width buttons, horizontal scroll prevention on tables via scrollable wrappers.

---

## 7. Data Changes & Database Design Decisions

### 7.1 Prisma Schema Increment
```prisma
model ActionTaken {
  id                Int      @id @default(autoincrement())
  ticketId          Int
  ticket            Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  actionDateTime    DateTime @default(now())
  description       String
  result            String
  performedById     Int
  performedBy       User     @relation(fields: [performedById], references: [id])
  followUpRequired  Boolean  @default(false)
  followUpNote      String?
  attachmentNotes   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([ticketId, actionDateTime])
  @@index([performedById])
}
```

### 7.2 Justification of Database Design Decisions
1. **Decision 1: Separate `actionDateTime` from `createdAt`**
   - *Rationale:* IT Staff often record actions performed earlier in the day or after completing physical maintenance. Allowing an explicit `actionDateTime` (defaulting to `now()`) records the actual real-world occurrence of the technical action, while `createdAt` and `updatedAt` preserve the immutable audit trail of when the database row was inserted/modified.
2. **Decision 2: Compound Index on `[ticketId, actionDateTime]`**
   - *Rationale:* The most frequent access pattern for Actions Taken is fetching all actions for a specific ticket ordered chronologically. A compound B-tree index on `(ticketId, actionDateTime)` allows PostgreSQL to perform an index-only or index scan directly matching the parent ticket and delivering pre-sorted actions without requiring an expensive runtime in-memory sort.
3. **Decision 3: Non-destructive Additive Migration with Cascading Delete on Ticket**
   - *Rationale:* Existing tickets from Labs 1–3 contain zero actions taken. Adding `ActionTaken` as a separate table leaves legacy `Ticket`, `User`, `Attachment`, and `PublicComment` rows intact with zero column modifications required on `Ticket`. If a ticket is deleted in test environments, cascading delete cleans up child actions cleanly.

---

## 8. API Contract Summary (Reference to `api-spec.md`)

| Method | Endpoint | Authorized Roles | Purpose | Key Responses |
|---|---|---|---|---|
| `GET` | `/api/tickets/:id/actions` | Owner Requester, IT Staff, Admin | Get all Actions Taken for ticket | 200 OK, 401 Unauth, 403 Forbidden, 404 Not Found |
| `POST` | `/api/tickets/:id/actions` | IT Staff, Admin | Create a new Action Taken line | 201 Created, 400 Bad Request, 403 Forbidden, 404 Not Found |
| `PATCH` | `/api/actions/:id` | IT Staff, Admin | Update an existing Action Taken line | 200 OK, 400 Bad Request, 403 Forbidden, 404 Not Found |
| `GET` | `/api/dashboard/requester` | Requester | Authoritative Requester metrics & recent tickets | 200 OK, 401 Unauth, 403 Forbidden |
| `GET` | `/api/dashboard/staff` | IT Staff, Admin | Authoritative IT Staff & Admin metrics & queue | 200 OK, 401 Unauth, 403 Forbidden |
| `PATCH` | `/api/tickets/:id/status` | IT Staff, Admin (and limited transitions) | Update ticket status with resolution gate & OCC | 200 OK, 400 Invalid transition, 409 Concurrency Conflict |

---

## 9. Acceptance Criteria (AC)

- **AC-01:** Given an authenticated IT Staff member and valid action details (description, result, date), when `POST /api/tickets/:id/actions` is called, an Action Taken record is created with `performedById` set to the authenticated staff's user ID.
- **AC-02:** Given an authenticated IT Staff member creating an action with `followUpRequired=true`, when `followUpNote` is empty or omitted, the system returns HTTP 400 with a validation error requiring `followUpNote`.
- **AC-03:** Given an authenticated IT Staff member creating an action with `followUpRequired=false`, when `followUpNote` is omitted, the action is created successfully with `followUpRequired=false` and null/empty note.
- **AC-04:** Given an authenticated Requester viewing their own ticket, when `GET /api/tickets/:id/actions` is called, all Actions Taken records for that ticket are returned with complete descriptions, results, and performer details.
- **AC-05:** Given an authenticated Requester, when `POST /api/tickets/:id/actions` or `PATCH /api/actions/:id` is attempted, the system rejects the request with HTTP 403 Forbidden.
- **AC-06:** Given an authenticated Requester attempting to fetch actions for a ticket owned by another user, the system responds with HTTP 404 Not Found (preserving foreign resource privacy).
- **AC-07:** Given an authenticated IT Staff member updating an existing Action Taken via `PATCH /api/actions/:id`, valid edits to description, result, follow-up, or attachment notes are persisted and `updatedAt` is refreshed.
- **AC-08:** Given an inactive IT Staff member's session, when an Action Taken creation or update is attempted, the system rejects the operation with HTTP 403 Forbidden.
- **AC-09:** Given multiple Actions Taken on a single ticket, when retrieved via API or UI, they are consistently returned in chronological order by `actionDateTime`.
- **AC-10:** Given an authenticated Requester, when attempting to change ticket status to `RESOLVED` directly via API or UI, the request is rejected with HTTP 403 Forbidden (resolution gate).
- **AC-11:** Given an authenticated Requester marking a ticket as "appears resolved", the ticket's `appearsResolvedAt` and `appearsResolvedById` are set, but `currentStatus` remains unchanged until an IT Staff member reviews and formally resolves it.
- **AC-12:** Given an authenticated IT Staff member, when transitioning a ticket through permitted statuses (`NEW` -> `OPEN` -> `IN_PROGRESS` -> `WAITING_FOR_REQUESTER` -> `RESOLVED`), the status changes and is logged.
- **AC-13:** Given an attempt to perform an illegal transition (e.g. `NEW` directly to `RESOLVED` or modifying a `CANCELLED` ticket), the backend rejects the change with HTTP 400 Bad Request.
- **AC-14:** Given a ticket update request with `expectedVersion` matching the current version, the update succeeds and increments `version` by 1.
- **AC-15:** Given two concurrent users updating the same ticket, when the second user submits an outdated `expectedVersion`, the backend returns HTTP 409 Conflict without overwriting the first user's changes.
- **AC-16:** Given an authenticated Requester requesting `GET /api/dashboard/requester`, the response returns accurate counts for `totalOpen`, `waitingForRequester`, `recentlyResolved`, and up to 5 `recentlyUpdated` tickets belonging exclusively to that requester.
- **AC-17:** Given a newly registered Requester with zero tickets, the Requester Dashboard returns zero for all counts and an empty array for recent tickets, displaying friendly empty states in the UI.
- **AC-18:** Given a Requester clicking a dashboard metric card (e.g. "Waiting for Requester"), the UI navigates to `/my-tickets` pre-filtered by status `WAITING_FOR_REQUESTER`.
- **AC-19:** Given an authenticated IT Staff member requesting `GET /api/dashboard/staff`, the response returns accurate counts for `unassigned`, `myAssigned`, counts by status, counts by priority, and recent tickets in the queue.
- **AC-20:** Given an IT Staff member clicking the "My Assigned" card, the UI navigates to `/staff/queue` pre-filtered by assigned to current user.
- **AC-21:** Given an authenticated Administrator requesting `GET /api/dashboard/staff`, the response includes all IT Staff operational metrics plus `userStats` (total users, active staff, inactive users).
- **AC-22:** Given an unauthenticated user requesting any dashboard or Actions Taken endpoint, the request is rejected with HTTP 401 Unauthorized.
- **AC-23:** Given any screen in Lab 4 (Dashboards, Actions Taken on Ticket Detail), the UI renders properly with readable text, accessible contrast, and no horizontal overflow at 1280px, 768px, and 375px viewports.
- **AC-24:** Given keyboard-only navigation on the dashboard and ticket detail, all interactive cards, buttons, and form inputs receive visible focus and can be activated via Enter/Space.
- **AC-25:** All ticket status badges and indicators use distinct text labels and icons in addition to color hues to ensure non-color accessibility.
- **AC-26:** Running idempotent database seeds repeatedly (`npm run db:seed`) creates valid sample tickets with 0, 1, and multiple Actions Taken without throwing unique constraint violations or corrupting counts.
- **AC-27:** All existing regression test suites for Lab 1, Lab 2, and Lab 3 pass 100% without modification or failure.
- **AC-28:** All test suites in `server/tests/lab-04/`, `client/tests/lab-04/`, and `e2e/lab-04/` execute and pass with genuine assertions.

---

## 10. Product Definition of Done (DoD)

- [ ] All 11 Functional Requirements (FR-01 to FR-11) and 14 Business Rules (BR-01 to BR-14) are implemented.
- [ ] Prisma schema migration is non-destructive and tested against fresh and populated databases.
- [ ] Idempotent seed data provides realistic scenarios with 0, 1, and multi-action tickets and non-zero/zero metrics.
- [ ] REST API endpoints follow HTTP standards, return proper error codes (400, 401, 403, 404, 409), and pass all automated API tests.
- [ ] UI is implemented with Zen Green aesthetics, responsive across 375px, 768px, and 1280px viewports, and passes accessibility checks.
- [ ] Automated test suites (API, UI component, E2E) pass 100% on the final commit of `main`.
- [ ] Peer review comments, approvals, and PR links are documented in `docs/lab-04/reviewer.md`.
- [ ] AI prompt history and reflection are documented in `docs/lab-04/ai-use.md`.
- [ ] Final submission PDF is assembled with all 9 parts (Answer Part 1 to Answer Part 9) with genuine evidence and screenshots.

---

## 11. Assumptions and Implementation Decisions

1. **Actions Taken Ordering:** Actions are ordered ascending by `actionDateTime` (oldest action first) so that team members can read the chronological work narrative from top to bottom.
2. **Follow-Up Handling:** Follow-up notes are required only if `followUpRequired` is checked `true`. If unchecked, the field is disabled or optional.
3. **Admin Role Capabilities:** Administrators possess full IT Staff capabilities plus access to user administration and expanded system user counts on the dashboard.
4. **Advisory Resolution vs Formal Resolution:** When a Requester clicks "Problem Appears Resolved", the system records `appearsResolvedAt` and notes, but leaves the ticket status as-is until IT Staff verifies the work and marks it `RESOLVED`.
