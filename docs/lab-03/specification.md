# TokTickIT — Lab 3 Engineering Specification

Version: draft-main-1.0 | 2026-09-17 | Implementation: Planned
ฐานข้อมูลและพฤติกรรมเดิมยึด source main ในแพ็กนี้ ดู baseline.md และ ADAPTATION-NOTES.md
ตัวเลือกที่ใบงานไม่ได้บังคับกำหนดไว้ในร่างนี้เพื่อ review ใน F1; ไม่ใช่หลักฐานว่าได้รับ approval แล้ว

## 1. Sprint goal

ต่อยอด Requester Portal เดิมให้ login ด้วยบัญชีจริง, แยก Requester/IT Staff/Administrator,
จัดการคิวและสถานะงาน, สื่อสารผ่าน Public Comments/Internal Notes และจัดการบัญชีแบบเรียบง่าย
โดยรักษา tickets/attachments/เลขงานและ ownership ของ Lab 2

## 2. Stakeholder interpretation

ผู้แจ้งใช้บัญชีตนเองแทน selector; เจ้าหน้าที่รับและติดตามงาน; ผู้ดูแลจัดการบัญชี
ทุกข้อจำกัดตรวจที่ server และแสดง UI ตรงสิทธิ์ พร้อมหลักฐานการทดสอบจาก final main

## 3. Scope

รวม auth/session/forced password change, RBAC, requester regression, staff queue/detail,
claim/reassign/IT priority/8 statuses, append-only comments/notes, requester resolution indication,
user list/search/create/edit/activate/reset, migration/seed/tests/responsive/review/submission

ไม่รวม self-registration, MFA/SSO/social login, email invitation/reset, Actions Taken,
SLA/escalation/notifications, analytics dashboards, cloud deployment, departments/organizations,
multiple roles, user deletion, bulk/import/export, account history หรือ advanced user-list features

## 4. Functional requirements

| FR | Requirement | AC |
|---|---|---|
| FR-01 | Login/logout/me/change-password/session lifecycle และ safe failure | AC-01,02,05–11 |
| FR-02 | Replace client requester identity, role/ownership enforcement | AC-03,04,13,23,33,48 |
| FR-03 | Additive migration/credential provisioning/idempotent seed | AC-14–18 |
| FR-04 | Preserve Requester tickets/attachments/query/DTO and isolate accounts | AC-19–22 |
| FR-05 | Staff Queue search/filter/sort/pagination and detail | AC-23–28 |
| FR-06 | Claim/reassign/priority/status and concurrency | AC-29–33 |
| FR-07 | Appears-resolved/public comments/internal notes | AC-34–39 |
| FR-08 | Minimal user administration and admin safety | AC-40–49 |
| FR-09 | Consistent usable UI, feedback, responsive and accessibility | AC-12,13,27,49–53 |
| FR-10 | Traceable contracts, test plan, peer review/final-main/submission | AC-54–56 |

## 5. Business rules

- BR-01: เฉพาะ active user ที่ credentials ถูกต้อง login ได้; wrong/inactive/missing account ตอบเหมือนกัน
- BR-02: mustChangePassword อนุญาตเฉพาะ me/csrf/change-password/logout; business APIs = 403 PASSWORD_CHANGE_REQUIRED
- BR-03: requesterId มาจาก session; ignore legacy header/query/body identity; header อย่างเดียวไม่ authenticate
- BR-04: Public Comments อ่านโดยเจ้าของ Requester/Staff/Admin; Internal Notes อ่านเฉพาะ Staff/Admin
- BR-05: Requester แจ้ง appears-resolved ได้ แต่ไม่ formal resolve/close
- BR-06: User มี role เดียว REQUESTER / IT_STAFF / ADMINISTRATOR และใช้ active boolean
- BR-07: สงวน foreign resource เป็น 404 ตาม main; ไม่มี/หมดอายุ session = 401; role denial = 403
- BR-08: Password 12–128 characters, preserve whitespace, confirm ตรง, new != old; เก็บ hash เท่านั้น
- BR-09: Argon2id (memory 19456 KiB, iterations 2, parallelism 1), random salt ต่อ password; เพิ่ม dependency ใน F2/P04
- BR-10: session token random ≥32 bytes, DB เก็บ SHA-256 token hash, อายุ absolute 8 ชั่วโมง; logout revoke server-side
- BR-11: login rate limit 5 failed attempts ต่อ normalized email+IP ใน rolling 15 นาที; ครั้งที่ 6 = 429 พร้อม Retry-After; success reset key
- BR-12: user role/active change, password reset/change invalidate sessions แบบ atomic; change password ออก session ใหม่ให้ browser ปัจจุบัน
- BR-13: ticket ใหม่ NEW, ticketOwnerId=null, itPriority=requestedPriority; Requested Priority immutable หลังสร้าง
- BR-14: owner เป็น active IT_STAFF/ADMINISTRATOR; claim เฉพาะ unassigned ให้ตัวเอง; claimed แล้วทุกกรณี = 409
- BR-15: reassign ต้องระบุ owner ที่เข้าเงื่อนไข ไม่รับ null; claim/reassign ไม่เปลี่ยนสถานะอัตโนมัติ
- BR-16: owner/priority/status mutation ใช้ expectedVersion; atomic compare-and-update, stale = 409
- BR-17: transition ตามตารางด้านล่าง; target OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/RESOLVED ต้องมี eligible owner
- BR-18: appears-resolved เฉพาะ own ticket ใน OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED; server actor/time, no status change; ซ้ำเป็น no-op
- BR-19: เข้า REOPENED ล้าง appearsResolvedAt/ById; transitions อื่นคงค่า
- BR-20: comments/notes trim 1–2000 chars, server author/time, plain text rendering, append-only; editing/deleting = 405 หลังผ่าน auth/role
- BR-21: email trim+lowercase unique ที่ DB และ API; ห้ามรวม requester เดิมเมื่อ normalization ชนกันโดยอัตโนมัติ
- BR-22: Admin ห้าม deactivate ตัวเอง; ห้าม demote/deactivate last active Admin รวม concurrent requests
- BR-23: deactivate owner หรือเปลี่ยนเป็น REQUESTER → unassign tickets, increment versions, preserve status/history ภายใน transaction; ส่ง affected count
- BR-24: reset ใช้ initial password ใหม่, mustChangePassword=true และ revoke sessions; ห้าม reset ผ่าน generic edit
- BR-25: seed ซ้ำไม่ทับ password/role/active/priority/status ที่แก้แล้ว; fictional seed identities ใช้ stable keys
- BR-26: attachments ใช้ชื่อ/ขนาด/type/count/soft remove เดิม; ไม่ลบ bytes จากการ remove ปกติ

### Authorization matrix

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| me / own password / logout / csrf | own | own | own |
| Categories / related systems | read | read | read |
| Create/list own tickets | yes | no | no |
| Detail / active attachment download | own only | any ticket | any ticket read-only |
| Upload/remove attachments | own only | no | no |
| Staff queue | no | yes | no |
| Claim/reassign/IT Priority/status | no | yes | no |
| Public Comments read | own | any | any |
| Public Comments create | own | any | no |
| Internal Notes read | no | any | any |
| Internal Notes create | no | any | no |
| Appears-resolved | own only | no | no |
| Users list/create/edit/reset | no | no | yes |

Admin สามารถถูก assign เป็น owner ได้ตามใบงาน แต่ไม่ได้สิทธิ์ Staff mutation โดยอัตโนมัติ
Admin เปิด read-only ticket detail ด้วย URL ได้; ไม่ต้องเพิ่ม dashboard หรือ queue ของ Admin

### Transition matrix

| From | Allowed targets |
|---|---|
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | REOPENED |
| REOPENED | OPEN, IN_PROGRESS, CANCELLED |
| CANCELLED | none |

Staff เท่านั้นเป็นผู้ทำ transition. Same-state หรือ edge นอกตาราง = 400 INVALID_TRANSITION
UI confirm ทุก status change และ reassign; ยืนยันการปิด/ยกเลิก/เปิดใหม่ด้วยข้อความชัดเจน
ไม่มี Actions Taken precondition ใน Lab 3

## 6. UI summary

Login, mandatory Change Password, authenticated shell, Requester screens เดิม + Public Comments,
Staff Queue/Detail และ Admin Users; ใช้ route และ state contract ใน ui-spec.md

## 7. Data changes and migration

### Proposed Prisma design

- `User @@map("RequesterUser")`: คง physical table/IDs/email/name/active/createdAt เดิม;
  เพิ่ม role enum(default REQUESTER), nullable passwordHash ระหว่าง provisioning,
  mustChangePassword(default true), sessionVersion(default 1), updatedAt
- เปลี่ยน Prisma relation/model accessor จาก requesterUser เป็น user อย่างชัดเจนใน code/tests/seed
  โดย migration SQL ต้องไม่ DROP/CREATE ตาราง RequesterUser; Ticket.requesterId ยังอ้าง ID เดิม
- `Session`: tokenHash String PK, userId FK, sessionVersion Int, csrfToken String,
  createdAt DateTime, expiresAt DateTime; index userId/expiresAt; ไม่เก็บ raw session token
- `Ticket`: เพิ่ม itPriority Priority, ticketOwnerId Int? FK User, version Int default 1,
  appearsResolvedAt DateTime?, appearsResolvedById Int? FK User; requester/owner/actor ใช้ relation names แยกกัน
- เพิ่ม 3 enum values โดยคง 5 ค่าเดิม; index owner/itPriority/updatedAt สำหรับ queue
- `PublicComment` และ `InternalNote`: id Int PK, ticketId FK, authorId FK User, content String,
  createdAt DateTime, seedKey String? unique; index(ticketId,createdAt,id)
- คง Attachment schema เดิมและ FK; ห้าม rename fields เพื่อให้เหมือนอีกแพ็ก

### Migration/provisioning sequence

1. Snapshot schema, IDs/FKs/numbers/metadata และ fixture file hashes จาก populated disposable DB
2. ตรวจ normalized email collisions; หากชนให้รายงานเพื่อแก้ข้อมูลอย่างระบุรายชื่อ ไม่ merge/drop เงียบ ๆ
3. Add columns/tables/statuses; เติม role=REQUESTER และ itPriority=requestedPriority;
   owner=null, version=1, appears fields=null สำหรับ legacy rows
4. Normalize email หลังตรวจ collision; unique constraint คงไว้; Prisma User map กับตารางเดิม
5. Provision initial passwords จาก local secrets input ให้ทุก migrated requester รวม inactive;
   hash เท่านั้น, mustChangePassword=true; missing passwordHash ห้าม login แบบ fail closed
6. Verify ไม่เหลือ unprovisioned intended accounts ก่อนปิด F2; ส่ง initial credentials ให้ผู้ทดสอบด้วยช่องทาง local ที่ไม่ commit
7. fresh + populated migration tests และ seed สองรอบ; เปรียบเทียบ old fields/hashes และ session invalidation
8. ใช้ forward migration ใหม่; ห้าม reset/drop dev DB หรือแก้ migration เก่าย้อนหลัง

Seed: ≥4 active+1 inactive Requester, ≥3 active+1 inactive Staff, ≥1 active Admin;
ร่างนี้เลือก ≥24 fictional tickets ครบ 8 statuses/priorities/assigned+unassigned และ sample comments/notes
24 เป็นการเลือกเพื่อ coverage ตามตัวอย่าง ไม่ใช่จำนวนขั้นต่ำที่ใบงานระบุ
existing main seed มี requesters แล้วให้ reuse stable email หลัง normalize ไม่สร้างซ้ำ

## 8. API contract

รายละเอียด endpoints/payloads/errors/CSRF/query อยู่ใน api-spec.md
Requester legacy behavior คงไว้ ยกเว้น authentication/identity ที่เปลี่ยนเป็น session ตาม Lab 3

## 9. Acceptance criteria

- **AC-01:** Active valid user logs in successfully, receiving HTTP-only session cookie and safe user profile.
- **AC-02:** User with `mustChangePassword === true` is blocked from business APIs and forced to change password.
- **AC-03:** Submitting legacy `X-Requester-Id` header is ignored; server derives requester identity strictly from session.
- **AC-04:** Requester requesting Internal Notes endpoint receives `403 Forbidden` with zero note content or existence leak.
- **AC-05:** Invalid email, wrong password, or inactive account returns uniform `401 Unauthorized`.
- **AC-06:** Password policy enforced (12–128 chars, whitespace preserved, confirmation check, new differs from old).
- **AC-07:** `/api/auth/me` returns current user; expired or missing session returns `401 Unauthorized`.
- **AC-08:** Logout invalidates server session; subsequent requests with revoked cookie return `401`.
- **AC-09:** Exceeding 5 failed login attempts in 15 minutes triggers `429 Too Many Requests` with `Retry-After`.
- **AC-10:** CSRF protection verifies valid origin / session token for all state-changing mutations.
- **AC-11:** Inactive accounts or changed roles immediately invalidate existing sessions upon next request.
- **AC-12:** Login and Change Password screens display proper validation, busy state, safe errors, and success flow.
- **AC-13:** Role-based navigation displays correct links and user badge; development selector completely absent.
- **AC-14:** Existing ticket IDs/numbers, attachments including file bytes, categories, systems, requester IDs and ownership survive migration from the supplied main schema.
- **AC-15:** Forward database migration applies cleanly on fresh and populated test databases without data loss.
- **AC-16:** Idempotent seed script runs repeatedly without duplicating records or overwriting changed passwords.
- **AC-17:** Seeded/migrated Requesters have valid provisioned credentials and initial password change flag.
- **AC-18:** Seed includes at least 4 active and 1 inactive Requester, 3 active and 1 inactive Staff, and 1 active Admin; at least 24 fictional tickets span all 8 statuses, all priorities and assigned/unassigned ownership, with sample comments and notes.
- **AC-19:** Requester creation, list/detail DTOs including ticketNumber and existing ticketNo alias, query behavior and ticket number formatting retain main Lab 2 behavior under session identity.
- **AC-20:** Legacy attachment upload, list, download, and soft-remove function with full ownership protection.
- **AC-21:** Foreign tickets/attachments and removed downloads return 404 NOT_FOUND with no file bytes; repeated removal of an owned attachment returns 409 ALREADY_REMOVED. Role denials return 403.
- **AC-22:** Logging out and logging in as another requester completely isolates ticket cache and state.
- **AC-23:** IT Staff Queue accessible to IT Staff; denied (`403`) to Requesters and non-permitted roles.
- **AC-24:** Queue search by ticket number and summary operates case-insensitively with combined filters.
- **AC-25:** Semantic priority sorting orders tickets by `HIGH` > `MEDIUM` > `LOW` rather than alphabetical order.
- **AC-26:** Queue pagination handles bounds, total counts, page sizes (10/20/50), and page resets on filter change.
- **AC-27:** Queue renders distinct loading skeleton, empty queue, no-results state, and error retry state.
- **AC-28:** Staff Detail shows all read-only ticket fields and exposes operational panels only to permitted roles.
- **AC-29:** Staff can claim an unassigned ticket and assign/reassign to an active Staff/Admin. Every already-owned claim returns 409. Null, inactive, nonexistent and Requester owners are rejected.
- **AC-30:** Concurrent claim or stale status update returns `409 Conflict` prompting the user to refresh.
- **AC-31:** IT Priority updates independently from Requested Priority; Requested Priority remains immutable.
- **AC-32:** Status transitions strictly adhere to permitted 8-status matrix; illegal transitions rejected with `400`.
- **AC-33:** Requester cannot set status to `RESOLVED` or `CLOSED` or mutate operational fields.
- **AC-34:** Requester "Problem Appears Resolved" records timestamp and actor without changing formal status.
- **AC-35:** Public comments are readable by own Requester, Staff, and Admin; creatable by Requester and Staff.
- **AC-36:** Internal notes are readable by IT Staff and Admin, creatable only by IT Staff, and completely hidden from Requester.
- **AC-37:** Comments and notes are strictly append-only; `PUT`, `PATCH`, and `DELETE` requests are rejected with `405`.
- **AC-38:** Comment content trimmed, validated (1–2,000 chars), and rendered safely without HTML injection.
- **AC-39:** IT Staff can complete end-to-end flow: triage queue $\rightarrow$ claim $\rightarrow$ prioritize $\rightarrow$ comment $\rightarrow$ resolve.
- **AC-40:** Admin User Management lists Name, Email, Role, active Status and Edit, with name/email search and one optional role filter.
- **AC-41:** Admin can provision new user with valid single role, active state, and initial password.
- **AC-42:** Duplicate email submission (case-insensitive and trimmed) returns `409 Conflict`.
- **AC-43:** Admin can edit user name, email, role, and active status without modifying credential fields.
- **AC-44:** Administrator self-deactivation is strictly blocked by application logic and API response `400`.
- **AC-45:** Deactivation or demotion of the last remaining active Administrator is blocked with `400`.
- **AC-46:** Deactivating an owner or changing them to REQUESTER unassigns their tickets atomically, increments versions, preserves statuses and displays the affected count.
- **AC-47:** Admin password reset forces `mustChangePassword === true` and revokes user sessions immediately.
- **AC-48:** Non-admin attempting to access user management APIs or screens receives `403 Forbidden`.
- **AC-49:** Admin screens handle loading, validation errors, busy states, and success confirmations.
- **AC-50:** All major screens work at desktop 1280px, tablet 768px and mobile 375px without clipping/overflow; retain 1024px tablet regression from the supplied main.
- **AC-51:** Reuse actual --color-* / --badge-* Zen Green palette, typography, existing badges, editable/read-only styling and extend badges for the three new statuses.
- **AC-52:** Keyboard accessibility, associated `<label>` elements, focus rings, and touch targets (≥44px) verified.
- **AC-53:** Safe error handling: `404`, `409`, and `500` responses never leak stack traces, database secrets, or foreign data.
- **AC-54:** Complete engineering documentation (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`).
- **AC-55:** Specification and Test Plan exist and are reviewed before implementation PRs are merged.
- **AC-56:** Final main test suites pass with recorded commit SHA; single submission PDF (Parts 1–9) verified.

## 10. Product definition of done

- ทุก AC มี planned test และ executed evidence จากไฟล์จริง; ไม่ skip เพื่อซ่อนงานค้าง
- migration fresh/populated, seed ซ้ำ, data/bytes preservation, security และ Lab 2 regression ผ่าน
- Login/Requester/Staff/Admin flows ใช้งานจริงด้วย backend; ทุก role enforced server-side
- full unit/API/UI/style/E2E และ responsive/visual inspection มี raw output และภาพอ่านได้
- engineering docs, reviewer.md และ ai-use.md ตรง source; review/approval/merge มีหลักฐานจริง
- release ผ่าน lab3-staging → main และทดสอบ final main SHA หลัง merge
- PDF เดียว Answer Part 1–9 ครบ; ไม่ commit secrets และไม่ใช้ historical results แทน

## 11. Assumptions and decisions

ร่างเลือก stateful cookie sessions, Argon2id, 8-hour expiry, concrete rate limit,
strict Staff/Admin separation, expectedVersion และ transition matrix เพื่อให้ implement/test ได้ชัดเจน
ใบงานกำหนดผลลัพธ์หลายส่วนแต่ให้ทีมเลือก implementation details; review decisions เหล่านี้ใน F1
ชื่อ field/status/error/theme ที่เป็น legacy ตัดสินจาก main source ไม่ใช่ reference package
