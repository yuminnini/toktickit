# Lab 3 — UI specification based on main

Draft; use client/src/components and styles/theme.css already supplied

## Theme and reuse

Primary `--color-primary #006B3C`, secondary `--color-secondary #0B7A46`, background `--color-bg #F5F7F6`,
surface `--color-surface #FFFFFF`, text `--color-text #1F2E27`, error `--color-error #B3261E`.
Editable field `--color-editable-bg #FFFFFF` / border `--color-editable-border #C9D3CE`;
readonly `--color-readonly-bg #F1F0E8`. Preserve existing `--badge-prio-*`, `--badge-status-*` pairs.
Reuse AppShell, Badge, Pagination, AttachmentSection, TicketCard/TicketTable where compatible.
Extend Badge and API status union for WAITING_FOR_REQUESTER, REOPENED, CANCELLED.
New status pairs reuse existing palette: waiting → in-progress pair; reopened → open pair;
cancelled → closed pair. Always show readable text to distinguish same-color states.
Role badges use existing green/slate pairs with explicit role names, not colors alone.
No token namespace replacement or second theme.

## Routes, screens and modes

| Route | Role/mode | Controls and behavior |
|---|---|---|
| /login | public | email/password, show/hide, submit, generic invalid credentials, 429 retry timing |
| /change-password | session (mandatory when flagged) | current/new/confirm, policy helper, validation, submit |
| /my-tickets | Requester view | preserve list search/filter/sort/paging and empty/no-results distinction |
| /tickets/new | Requester create | original create fields/attachment UX; requester readonly from session |
| /tickets/:id | own Requester view; Staff/Admin read view | preserved detail + comments; own Requester indication; Admin read-only notes |
| /staff/tickets | Staff view | queue controls and detail links |
| /staff/tickets/:id | Staff view/edit operational fields | grouped info, claim/reassign/priority/status, public/private communication |
| /admin/users | Admin view/create/edit/reset | simple list, search, one optional role filter, modal or drawer |
| /check-system | public | health only before login; do not fetch protected category data while anonymous |

`/` redirects by role: REQUESTER→/my-tickets, IT_STAFF→/staff/tickets, ADMINISTRATOR→/admin/users.
Login redirect first honors mustChangePassword; safe return path restricted to permitted local routes.
Remove /requester-selection and Change Requester action; clear `lab2-selected-requester` sessionStorage.
Deep links enforce route guard and server permission; never flash protected content during /me loading.
Logout clears caches/pending responses/user state and returns login. Abort/ignore old-user in-flight fetches.
Expired session clears auth, redirects login once; role 403 uses forbidden feedback rather than login loop.
Forced-change user sees only Change Password/Logout, not business navigation.

## Staff Queue

Desktop columns: Ticket Number/Summary, Category, Requested Priority, IT Priority, Status, Owner,
Updated, Open action. Created time/requester shown in detail to avoid an unreadable wide grid.
Search ticket number/summary; category/status/requested/IT priority and owner filters; sort and 10/20/50 paging.
Reset page=1 when search/filter/page size changes. Stable server order, cancel stale requests.
Mobile stacked cards with labels and prominent Open; table only where all columns fit.
Show total/unfiltered counts; separate loading skeleton, empty queue, no matches, failure+Retry, forbidden.

## Staff Detail and communication

Readonly original ticket fields and Requested Priority; editable operations panel only for Staff.
Unassigned owner shows “Unassigned” and Claim; assigned shows owner + Reassign eligible-owner selector.
IT Priority separate from Requested Priority. Status selector offers only valid matrix targets.
Confirm reassign and status changes, showing old/new value. Disabled saving controls prevent double submits.
409 prompts Refresh; do not silently overwrite local changes or auto-retry a stale mutation.
Public Comments and Internal Notes have separate titled panels/composers; private label always visible.
No note tab/count/content loaded for Requester. Plain-text content; no HTML rendering.
Show author and localized timestamp. No edit/delete controls for entries.
Requester indication asks confirmation, then shows recorded timestamp without moving status badge.
Already indicated state shows success/read-only; reopening clears indication after reload.
Attachment download continuity uses session cookie; Staff/Admin do not see upload/remove controls.

## User Management

Columns Name, Email, Role, Status, Edit. Search name/email; one optional role filter; no mandatory pagination.
Create mode: name/email/role(single select)/active/initial password. Edit: only name/email/role/active.
Reset password is separate action with confirmation and one initial password field.
Never prefill or echo stored passwords; input may have reveal toggle and must clear after success/close.
Self-deactivate disabled with reason; last-admin error appears inline from API. API enforces both independently.
Deactivation/reclassification confirmation mentions affected tickets; success shows unassignedTicketCount.
Admin self role-change invalidates session and routes to login; stale permissions never remain cached.

## Feedback, responsive and accessibility

Every screen covers meaningful loading/saving/success/validation/empty/no-results/403/404/409/500 states.
Field errors immediately under associated input; summary for non-field errors; aria-live status messages.
Focus invalid first field; dialogs have focus trap/Escape/return focus. Keyboard path completes all flows.
Mobile minimum 44px touch targets, visible focus, associated labels and meaningful button names.
Test widths 375,768,1024,1280; no clipped text/overlap/horizontal overflow. Do not treat CSS
overflow-x:hidden as proof: measure content bounds and inspect rendered screenshots.
Preserve existing Lab 2 screenshot files. Capture new runs under artifacts/lab-03/screenshots/<run-id>/
with authentication, requester, staff-queue, staff-ticket-detail and user-management groups.
Inspect screenshots visually; PNG header/size alone does not prove a correct layout.
