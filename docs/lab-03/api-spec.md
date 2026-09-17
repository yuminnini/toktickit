# Lab 3 — API contract for supplied main

Draft-main-1.0; endpoints ใหม่ทั้งหมด Planned. Existing route inventory: server/src/app.ts
JSON ใช้ camelCase; DateTime ส่ง ISO-8601 UTC; numeric IDs positive integers

## 1. Authentication, middleware and errors

Business route order: session → active/sessionVersion → forced-change → role → ownership → validation/mutation
Role denial 403 ก่อน query private note content; foreign Requester resource 404 เหมือน missing
New endpoints error shape: `{ "error": "CODE", "message": "Safe text", "fields": { "field": "reason" } }`
fields optional; legacy error codes/body shape คงไว้ตาม section 3. Unexpected 500 INTERNAL_ERROR ไม่มี stack/SQL/secrets

| HTTP | Use |
|---|---|
| 400 | VALIDATION_ERROR, INVALID_TRANSITION, INVALID_OWNER, OWNER_REQUIRED, admin safety |
| 401 | UNAUTHENTICATED / INVALID_CREDENTIALS |
| 403 | FORBIDDEN / PASSWORD_CHANGE_REQUIRED / CSRF_INVALID |
| 404 | NOT_FOUND: missing/foreign resources; removed download |
| 409 | VERSION_CONFLICT / ALREADY_CLAIMED / EMAIL_EXISTS / ALREADY_REMOVED / ATTACHMENT_LIMIT |
| 405 | METHOD_NOT_ALLOWED for editing/deleting comments/notes after access checks |
| 429 | TOO_MANY_ATTEMPTS and Retry-After seconds |
| 500 | INTERNAL_ERROR |

SafeUser = `{id,name,email,role,active,mustChangePassword}`; never passwordHash/sessionVersion/tokenHash
Cookie `toktickit_session`: HttpOnly, SameSite=Lax, Path=/, Max-Age=28800;
Secure on HTTPS deployment, off only local HTTP. Client fetch uses credentials:include.
CORS exact configured APP_ORIGIN with credentials; never wildcard credential origin.
Auth responses Cache-Control:no-store. Raw session token exists only in cookie, never JSON/logs/localStorage.

All state-changing browser requests require exact allowed Origin. Missing/foreign Origin = 403.
Login requires Origin + application/json (no CSRF token before session).
Other mutations require Origin + X-CSRF-Token matching current session, including multipart uploads.
No-session logout with allowed Origin returns 204 and clears cookie; valid-session logout requires CSRF.
GET /api/auth/csrf returns token only for active session, including forced-change state.
Rotate session+CSRF after login and password change; expired/revoked session never authenticates.
GET downloads use cookie naturally and have no mutation; never put requester/session identity in URL.

## 2. Auth routes

| Method/path | Request | Success | Important failures |
|---|---|---|---|
| POST /api/auth/login | {email,password} | 200 {user:SafeUser}, Set-Cookie | malformed 400; wrong/inactive/unknown 401 same response; rate limit 429 |
| GET /api/auth/me | — | 200 {user:SafeUser} | missing/expired/revoked 401 |
| GET /api/auth/csrf | — | 200 {csrfToken:string} | 401 |
| POST /api/auth/change-password | {currentPassword,newPassword,confirmPassword} | 200 {user:SafeUser}, new cookie; flag false | 400 policy/confirmation; wrong current 400 INVALID_CURRENT_PASSWORD; 403 CSRF |
| POST /api/auth/logout | empty | 204, revoked session + expired cookie | 403 invalid Origin/CSRF |

Login email trim/lowercase; password preserved as entered. Name 1–100 after trim; email valid syntax, ≤254.
Passwords 12–128 chars and not equal old password. Password change revokes all old sessions atomically.
Login max 5 failed attempts/email+IP/15min then 429 on sixth; current time injectable for tests.
Existing request header X-Requester-Id and any requesterId field are ignored for identity in Lab 3.
No session means 401 even with a valid requester header; inactive/deleted/revoked user sessions yield 401.

## 3. Existing Requester routes preserved under session

| Method/path | Access / payload | Success |
|---|---|---|
| GET /api/health | public | 200 {status:"ok",service:"TokTickIT API"} |
| GET /api/categories | completed-change session any role | 200 [{id,name}] ordered id |
| GET /api/related-systems | completed-change session any role | 200 [{id,name}], active only |
| GET /api/tickets | REQUESTER, scoped to session | 200 TicketListResponse |
| POST /api/tickets | REQUESTER: {categoryId,relatedSystemId,summary,description,requestedPriority} | 201 TicketDetail |
| GET /api/tickets/:id | own Requester; Staff/Admin any read | 200 TicketDetail |
| POST /api/tickets/:id/attachments | own REQUESTER; multipart file | 201 AttachmentDTO |
| GET /api/attachments/:id | own Requester; Staff/Admin read | 200 AttachmentDTO (may be soft-removed metadata) |
| GET /api/attachments/:id/download | same read access, active attachment | 200 bytes + content headers |
| DELETE /api/attachments/:id | own REQUESTER; {reason} | 200 updated AttachmentDTO |

Remove development `/api/requesters` enumeration in Lab 3: return 404, replace Staff owner lookup with section 4.
No new GET /tickets/:id/attachments is required; detail already includes attachments.

TicketListResponse = `{data,page,pageSize,total,totalPages,unfilteredTotal}`.
List item = `{id,ticketNumber,ticketNo,summary,category,requestedPriority,currentStatus,createdAt,updatedAt}`;
category here is **string**. `ticketNo === ticketNumber` alias retained.
TicketDetail = `{id,ticketNumber,ticketNo,requesterId,categoryId,relatedSystemId,summary,description,
requestedPriority,currentStatus,createdAt,updatedAt,category:{id,name},relatedSystem:{id,name},attachments:[AttachmentDTO]}`
Add `itPriority,ticketOwnerId,ticketOwner:{id,name}|null,version,appearsResolvedAt,appearsResolvedById`.
Do not include notes in generic detail DTO; they use a separate protected endpoint.
AttachmentDTO = `{id,originalName,mimeType,sizeBytes,uploadedAt,removedAt,removalReason}`.
Baseline detail currently spreads raw attachment rows; Lab 3 explicitly uses this safe DTO allowlist
and stops exposing storedFilename/ticketId there. Database fields and file locations stay unchanged.

### Requester query compatibility

- search: trim, case-insensitive substring ticketNumber OR summary; categoryId integer filter
- requestedPriority → priority → itPriority (first truthy) are legacy aliases for **requestedPriority** filtering
- status: any of eight TicketStatus values after migration
- sort allowlist: createdAt, updatedAt, ticketNumber, requestedPriority, currentStatus, summary
- default sort createdAt desc; order=asc else desc; secondary id in same direction
- page: full digits ≥1 else 1; pageSize: full digits ≥1 else 10, capped at 50
- invalid sort/filter values follow existing main normalization/ignored behavior, not new 400 behavior
- totalPages=ceil(total/pageSize), zero total =>0; clamp page to last only when totalPages>0
- unfilteredTotal counts own tickets before search/filters
- **Staff itPriority filter in section 4 means actual new IT Priority**; do not change legacy alias semantics silently

Create: summary trim 1–150, description trim 1–2000, existing category + active related system,
requestedPriority LOW/MEDIUM/HIGH. Validation 400 VALIDATION_ERROR with fields; preserve official
TKT-YYYY-000000 format from formatTicketNumber with UTC year and atomic ID allocation.
Do not accept client owner/status/itPriority to override defaults. Reject unexpected operational fields with 400.

Attachments: one file/call; ≤5 active per ticket; ≤5*1024*1024 bytes; .jpg/.jpeg/.png/.webp/.pdf;
verify extension+MIME+magic bytes; unauthorized request rejected before disk write.
No file 400 NO_FILE; too large 400 FILE_TOO_LARGE; type 400 UNSUPPORTED_TYPE;
limit 409 ATTACHMENT_LIMIT. Retain transaction lock preventing concurrent sixth active attachment.
Removal reason trim 1–500 (400 REASON_REQUIRED); owned already removed 409 ALREADY_REMOVED;
foreign/missing 404; removed download 404. Keep metadata and stored bytes after soft remove.
Download keeps Content-Type, Content-Length and UTF-8 Content-Disposition; protect path traversal.

## 4. Staff queue and operations

| Method/path | Access / request | Success |
|---|---|---|
| GET /api/staff/tickets | IT_STAFF; query below | 200 QueueResponse |
| GET /api/staff/tickets/:id | IT_STAFF | 200 StaffTicketDetail |
| GET /api/staff/eligible-owners | IT_STAFF | 200 {data:[{id,name,role}]} active Staff/Admin only |
| POST /api/staff/tickets/:id/claim | {expectedVersion} | 200 StaffTicketDetail |
| PATCH /api/staff/tickets/:id/owner | {ticketOwnerId,expectedVersion} | 200 StaffTicketDetail |
| PATCH /api/staff/tickets/:id/priority | {itPriority,expectedVersion} | 200 StaffTicketDetail |
| PATCH /api/staff/tickets/:id/status | {currentStatus,expectedVersion} | 200 StaffTicketDetail |

Queue query: search (trim ≤150, ticketNumber/summary insensitive), categoryId positive integer,
requestedPriority, itPriority, status, owner=all|unassigned|mine or ticketOwnerId positive integer
(owner != all and ticketOwnerId mutually exclusive). Defaults owner=all.
sort=createdAt|updatedAt|ticketNumber|itPriority|requestedPriority|currentStatus, default updatedAt;
order asc|desc default desc; page positive integer default 1; pageSize 10|20|50 default 10.
Invalid supplied queue query = 400 VALIDATION_ERROR; blank search/optional filters mean absent.
Primary+id tie break same direction; priority ranking LOW=1/MEDIUM=2/HIGH=3, desc highest first.
Status sorting uses NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,RESOLVED,CLOSED,REOPENED,CANCELLED.
Zero total -> page=1,totalPages=0; otherwise clamp page to max. Filters combine AND; search fields combine OR.
QueueResponse = `{data,page,pageSize,total,totalPages,unfilteredTotal}`; unfilteredTotal is all visible tickets.
Queue item adds requester:{id,name}, ticketOwner:{id,name}|null, ticketOwnerId,itPriority,version
to legacy list fields; never include credentials or note content. StaffTicketDetail extends safe TicketDetail
with requester:{id,name,email}. Communications loaded separately.

Claim: only unassigned; already assigned (even to actor) 409 ALREADY_CLAIMED.
Owner must be non-null active Staff/Admin: else 400 INVALID_OWNER. No explicit unassign endpoint.
All mutations require positive expectedVersion and atomic version compare; stale 409 VERSION_CONFLICT.
Success increments version once; same owner/priority with current version returns current DTO as no-op.
Status follows specification matrix and eligible owner preconditions; invalid edge 400 INVALID_TRANSITION,
missing eligible owner 400 OWNER_REQUIRED. A status mutation does not alter requestedPriority.
Version conflict checked before state transition validation; two concurrent claims: one 200, one 409.

## 5. Communications / Requester indication

| Method/path | Permission / request | Success |
|---|---|---|
| GET /api/tickets/:id/comments | own Requester, Staff, Admin | 200 {data:[EntryDTO]} |
| POST /api/tickets/:id/comments | own Requester, Staff; {content} | 201 EntryDTO |
| GET /api/tickets/:id/internal-notes | Staff/Admin only | 200 {data:[EntryDTO]} |
| POST /api/tickets/:id/internal-notes | Staff only; {content} | 201 EntryDTO |
| POST /api/tickets/:id/appears-resolved | own Requester; empty body | 200 {id,appearsResolvedAt,appearsResolvedById,currentStatus,version} |

EntryDTO = `{id,ticketId,content,author:{id,name,role},createdAt}`; createdAt then id ascending.
Content trim 1–2000; authors/timestamps from session/server only (reject supplied author/time fields).
Comments/notes may append for any existing ticket status; do not invent a closed-ticket prohibition.
PUT/PATCH/DELETE of collection or entry path return 405 after auth/role/ownership; Requester notes always 403.
Indication allowed states in specification; invalid state 400 INVALID_TRANSITION; duplicate indication is
idempotent retaining original actor/time/version. First indication increments version atomically; concurrent
formal status change must serialize/check status in the same transaction. No formal status mutation.

## 6. Administrator users

| Method/path | Request | Success |
|---|---|---|
| GET /api/admin/users | search (name/email insensitive), role optional | 200 {data:[SafeUser]} ordered name then id |
| POST /api/admin/users | {name,email,role,active,initialPassword} | 201 {user:SafeUser} |
| PATCH /api/admin/users/:id | subset {name,email,role,active}, at least one | 200 {user:SafeUser,unassignedTicketCount:number} |
| POST /api/admin/users/:id/reset-password | {initialPassword} | 200 {user:SafeUser} |

All ADMINISTRATOR only. Name trim 1–100; email trim/lowercase valid syntax ≤254; role one enum;
active boolean required on create. initialPassword follows 12–128 policy. Invalid query/fields =400;
duplicate normalized email (including database race) =409 EMAIL_EXISTS; nonexistent user=404.
Reject passwordHash, mustChangePassword, sessionVersion or password fields in generic edit.
Self-deactivation =400 SELF_DEACTIVATION; last active admin demotion/deactivation =400 LAST_ACTIVE_ADMIN.
Lock/recheck admin invariant in transaction (including simultaneous requests); no zero-admin outcome.
Role/activation changes revoke sessions atomically. Deactivating/changing eligible owner to REQUESTER
unassigns tickets and increments versions in same transaction; preserve statuses/author/requester FKs.
Reset invalidates all sessions, sets mustChangePassword=true; never echo password/hash in response.
Existing requesters changed to another role retain their historical ticket ownership; current role governs access.
No delete/bulk/export/user pagination endpoints in scope.
