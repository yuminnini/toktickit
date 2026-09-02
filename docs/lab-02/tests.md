# Lab 2 Test Plan and Results

## 1. Test Strategy
Tests are written before implementation (TDD): each planned test below is created failing
first, then the smallest correct code is written to make it pass. Every row maps to at
least one Acceptance Criterion from `specification.md` §9, and every AC has at least one
row here — no AC is left untested, and no test exists that doesn't trace back to an AC or
a Business Rule.

## 2. Planned Tests

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator produces `TKT-<year>-<id padded 6>` | Format matches regex exactly | `server/tests/lab-02/ticket-number.unit.test.ts` | Planned |
| UNIT-02 | Unit | §5.3 (seed) | Running the Lab 2 seed twice | No duplicate Requesters/Related Systems created | `server/tests/lab-02/seed.unit.test.ts` | Planned |
| UNIT-03 | Unit | §5 (data model) | `RequesterUser.email` unique constraint | Creating a second Requester with a duplicate email is rejected by Prisma/PostgreSQL | `server/tests/lab-02/requester-constraint.unit.test.ts` | Planned |
| API-01 | API | AC-01 | `POST /api/tickets` with valid body | 201, response includes generated `ticketNumber` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-02 | API | AC-03, BR-13 | `GET /api/tickets/:id` with a `requesterId` that doesn't own it | 404, no Ticket data leaked | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-03 | API | AC-04, BR-08 | `POST /api/tickets` with empty `summary` | 400, `fields.summary` message present | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-04 | API | BR-08 | `POST /api/tickets` with `summary` at 151 chars (boundary) | 400 validation error | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-05 | API | AC-09 | `GET /api/tickets` with `page=2&pageSize=10` on 15 seeded tickets | 200, returns tickets 11-15, correct `totalPages` | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-06 | API | BR-07 | `GET /api/tickets` with invalid `sort=xyz` | 200, silently falls back to `createdAt desc` (no 400) | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-07 | API | AC-11 | `POST /api/tickets/:id/attachments` with a valid 1 MB PNG | 201, attachment metadata returned | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-08 | API | AC-13 | Uploading a 6th attachment when 5 active already exist | 409 `ATTACHMENT_LIMIT` | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-09 | API | AC-14 | `DELETE /api/attachments/:id` with a reason | 200, `removedAt`/`removalReason` set | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-10 | API | AC-15 | `GET /api/attachments/:id/download` on a removed attachment | 404 (not 200, not distinguishable from non-existent) | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-11 | API | BR-11 | `GET /api/requesters` | 200, inactive seeded Requester is absent from the list | `server/tests/lab-02/requesters.api.test.ts` | Planned |
| API-12 | API | AC-03, BR-13 | `GET /api/attachments/:id` (metadata) where the attachment belongs to a different requester | 404, no metadata leaked | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-13 | API | AC-03, BR-13 | `GET /api/attachments/:id/download` where the attachment belongs to a different requester | 404 | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-14 | API | AC-03, BR-13 | `DELETE /api/attachments/:id` where the attachment belongs to a different requester | 404, attachment is not modified/removed | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-15 | API | BR-11 | `POST /api/tickets` with `requesterId` belonging to a seeded **inactive** Requester | 400, bad-requester error (not 201) | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-16 | API | AC-19 | `GET /api/tickets?search=laptop` on a mix of matching/non-matching seeded tickets | 200, only tickets with "laptop" in summary/ticketNumber returned | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-17 | API | AC-20 | `GET /api/tickets?categoryId=<id>&requestedPriority=HIGH` | 200, only tickets matching **both** filters returned | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-18 | API | AC-21 | `GET /api/tickets?sort=ticketNumber&order=asc` | 200, results ordered ascending by ticketNumber | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| UI-01 | UI | AC-02 | Navigating to My Tickets with no Requester selected | Redirected to Requester Selection screen | `client/tests/lab-02/RouteGuard.test.tsx` | Planned |
| UI-02 | UI | AC-04 | Submitting Create Ticket with empty Summary | Field-level message shown; `checkSystem`/create API not called | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-03 | UI | AC-05 | Clicking Submit twice quickly | Button disabled after first click; only one API call fires | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-04 | UI | AC-06 | Submitting a valid form when the create API rejects (mocked) | Error message shown; all field values still present in inputs | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| UI-05 | UI | AC-07 | Requester with 0 tickets opens My Tickets (mocked empty response) | "Empty" state with Create Ticket CTA, not "No results" | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-06 | UI | AC-08 | Requester with tickets applies a filter matching none (mocked) | "No results" state with Clear Filters CTA | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-07 | UI | AC-10 | Mocked Requester switch while My Tickets is open | Old list cleared, new Requester's tickets fetched and shown | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| UI-08 | UI | AC-12 | Selecting a `.exe` file in the attachment picker | Rejected client-side with message; no upload request sent | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| UI-09 | UI | AC-16 | Requester Selection screen with 0 active requesters (mocked) | Safe empty state, not a blank/broken dropdown | `client/tests/lab-02/RequesterSelection.test.tsx` | Planned |
| UI-10 | UI | AC-17 | Requester Selection screen when `GET /api/requesters` fails (mocked) | Safe error state, not a crash or infinite spinner | `client/tests/lab-02/RequesterSelection.test.tsx` | Planned |
| UI-11 | UI | AC-09 | Clicking "Next" on My Tickets pagination (mocked page-1 API response) | UI calls list API with `page=2`; displays the returned second-page tickets, "Previous" becomes enabled | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| STYLE-01 | UI Style | §8.3, §8.8 | Required-field asterisk and validation message placement on Create Ticket | Asterisk present on required labels; error renders directly below its field | `client/tests/lab-02/CreateTicket.style.test.tsx` | Planned |
| STYLE-02 | UI Style | §8.8 | Badge component renders for each `requestedPriority`/`currentStatus` value | Correct color token class applied per value, no reliance on color alone (text label present) | `client/tests/lab-02/Badge.style.test.tsx` | Planned |
| STYLE-03 | UI Style | AC-22 | Submit Create Ticket with Summary empty | Summary input's `aria-describedby` attribute references the rendered error message's `id` | `client/tests/lab-02/CreateTicket.style.test.tsx` | Planned |
| API-19 | API | BR-08 | `POST /api/tickets` with empty `description` (after trim) | 400, `fields.description` message present | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-20 | API | BR-08 | `POST /api/tickets` with `description` at 2001 chars (boundary, over the 2000 limit) | 400 validation error | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| RESP-01 | Responsive | AC-18, §8.7 | Playwright screenshot of Create Ticket, My Tickets, Ticket Detail at 375px | No horizontal scroll, no clipped/overlapping elements (manual checklist §4 below) | `e2e/lab-02/responsive.spec.ts` | Planned |
| RESP-02 | Responsive | §8.7 | Same 3 screens at 1024px (tablet) and 1280px (desktop) | Layout matches `ui-spec.md` breakpoint rules | `e2e/lab-02/responsive.spec.ts` | Planned |
| E2E-01 | E2E | AC-01, AC-11 | Select Requester → Create Ticket with 1 attachment → see success | Ticket Number shown; ticket appears in My Tickets after navigating there | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-03, AC-10 | Create ticket as Requester A → switch to Requester B → open My Tickets | Requester A's ticket is not visible to Requester B | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

## 3. Acceptance-Criterion Traceability

| AC | Covered by |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | UI-01 |
| AC-03 | API-02, API-12, API-13, API-14, E2E-02 |
| AC-04 | API-03, UI-02 |
| AC-05 | UI-03 |
| AC-06 | UI-04 |
| AC-07 | UI-05 |
| AC-08 | UI-06 |
| AC-09 | API-05, UI-11 |
| AC-10 | UI-07, E2E-02 |
| AC-11 | API-07, E2E-01 |
| AC-12 | UI-08 |
| AC-13 | API-08 |
| AC-14 | API-09 |
| AC-15 | API-10 |
| AC-16 | UI-09 |
| AC-17 | UI-10 |
| AC-18 | RESP-01 |
| AC-19 | API-16 |
| AC-20 | API-17 |
| AC-21 | API-18 |
| AC-22 | STYLE-03 |

## 4. Responsive and Visual Checklist
(Applied when reviewing RESP-01/RESP-02 screenshots, per labsheet §8.8 — filled in during Phase 7)
- [ ] No clipped labels or buttons at any of the 3 viewport sizes
- [ ] No overlapping text or controls
- [ ] No unintended horizontal scrolling on mobile (<768px)
- [ ] Priority/Status badges visually consistent across all 3 screens
- [ ] Editable vs read-only fields visually distinguishable (Ticket Detail vs Create Ticket)
- [ ] Filters, pagination, and attachment controls remain usable at all 3 sizes
- [ ] Screenshots match `ui-spec.md` and the approved mockups (§8.1, §8.4, §8.5 of the labsheet), not personal memory
## 5. Test Commands
cd server && npx vitest run
cd client && npx vitest run
npx playwright test e2e/lab-02/
(Playwright is introduced starting Phase 4, once Create Ticket exists to test end-to-end; installed via `npm install -D @playwright/test` in a later phase.)

## 6. Final Results
To be filled in after implementation phases (Phase 2–7) are complete and all tests are run
against the final `main` branch — not before. Placeholder until then; no test is marked
"Pass" based on assumption.

## 7. Known Limitations or Deferred Tests
- E2E and responsive tests (E2E-01/02, RESP-01/02) require Create Ticket, My Tickets, and
  Ticket Detail all implemented — they can only be run starting Phase 6/7, not written as
  passing tests before then, though they are written failing/pending earlier per TDD.
- Attachment virus-scanning or content-sniffing beyond MIME-type/extension check is out of
  scope for Lab 2 (not requested by the stakeholder or labsheet).