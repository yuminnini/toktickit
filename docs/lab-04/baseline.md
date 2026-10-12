# Lab 4 Baseline — Static & Environment Audit of Lab 3 Baseline

- **Audit Date:** 2026-10-12
- **Baseline Branch:** `main`
- **Baseline Commit SHA:** `1f2e3abe7b3ac0f6784f281c9fb7e808def488ce`
- **Commit Message:** `docs(lab-03): update README and documentation for Lab 3 release`

---

## 1. ซอฟต์แวร์และสถาปัตยกรรมที่มีอยู่เดิม (As-Is State from Lab 3)

### 1.1 Stack & Architecture
- **Client:** React 18 + TypeScript + Vite + React Router + Bootstrap 5.3 (Zen Green Theme)
- **Server:** Node.js + Express 4 + TypeScript + Prisma ORM 5.22 + PostgreSQL
- **Security / Auth:** Session cookie-based authentication (`Session` model in DB), Argon2 password hashing, CSRF token verification, role-based access control (RBAC).

### 1.2 Prisma Schema & Database Models
ปัจจุบันมี 8 Models และ 4 Enums:
- **Models:**
  1. `Category` (id, name, createdAt)
  2. `User` (mapped to `RequesterUser`: id, name, email unique, active, role, passwordHash, mustChangePassword, sessionVersion)
  3. `Session` (tokenHash, userId, sessionVersion, csrfToken, expiresAt)
  4. `RelatedSystem` (id, name, active)
  5. `Ticket` (id, ticketNumber, requesterId, categoryId, relatedSystemId, summary, description, requestedPriority, itPriority, currentStatus, ticketOwnerId, version, appearsResolvedAt, appearsResolvedById, createdAt, updatedAt)
  6. `PublicComment` (id, ticketId, authorId, content, createdAt, seedKey)
  7. `InternalNote` (id, ticketId, authorId, content, createdAt, seedKey)
  8. `Attachment` (id, ticketId, originalName, storedFilename unique, mimeType, sizeBytes, uploadedAt, removedAt, removalReason)
- **Enums:**
  - `Role`: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`
  - `Priority`: `LOW`, `MEDIUM`, `HIGH`
  - `TicketStatus`: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`

### 1.3 Migrations ที่มีอยู่แล้ว
1. `20260815141221_add_category`
2. `20260830151713_lab2_ticketing_foundation`
3. `20260831110621_attachment_stored_filename_unique`
4. `20260918000000_lab3_auth_roles_ticketing`

### 1.4 Test Inventory ที่มีอยู่เดิม
- `server/tests/`: ครอบคลุม `lab-01`, `lab-02`, `lab-03`
- `client/tests/`: ครอบคลุม `lab-01`, `lab-02`, `lab-03`
- `e2e/`: ครอบคลุม `lab-02`, `lab-03`

---

## 2. สิ่งที่ยังขาดสำหรับ Lab 4 (Delta / Gap Analysis)

| มิติ | สถานะปัจจุบันใน Baseline | สิ่งที่ต้องพัฒนาเพิ่มใน Lab 4 |
|---|---|---|
| **Data Model** | ยังไม่มี `ActionTaken` model | เพิ่ม model `ActionTaken` (relation กับ `Ticket` 1:N และ `User` N:1 สำหรับ `performedBy`) พร้อม fields วันเวลา, description, result, follow-up flags, attachment notes |
| **Actions Taken API** | ยังไม่มี API สำหรับ Actions Taken | สร้าง REST endpoints: `POST /api/tickets/:id/actions`, `GET /api/tickets/:id/actions`, `PATCH /api/actions/:id` พร้อม RBAC (Staff/Admin write, Requester read-only) |
| **Ticket Workflow** | มี transition เบื้องต้นใน Lab 3 | Enforce final transition matrix ทั้ง 8 สถานะ, Stale concurrency check (409 Conflict), Resolution gate (Requester เป็น advisory เท่านั้น, Staff เป็นผู้ resolve) |
| **Dashboards API** | ยังไม่มี API dashboard | สร้าง `GET /api/dashboard/requester` และ `GET /api/dashboard/staff` (คำนวณ Authoritative metrics จากฐานข้อมูล) |
| **UI Components** | มีหน้า My Tickets, Staff Queue, Ticket Detail, Admin Users | 1. เพิ่ม Actions Taken section & forms บน Ticket Detail<br>2. สร้าง Requester Dashboard page<br>3. สร้าง IT Staff & Admin Dashboard page<br>4. Drill-down interaction |
| **Test Coverage** | มี tests ถึง Lab 3 | เพิ่ม `server/tests/lab-04/`, `client/tests/lab-04/`, `e2e/lab-04/` |
| **Evidence & Docs** | มี docs ถึง Lab 3 | จัดทำ `docs/lab-04/` (4 contracts + reviewer + ai-use) และ artifacts screenshots |

---

## 3. สรุปผลการตรวจ P00
- Baseline ของระบบพร้อมต่อยอดสู่ Lab 4
- สภาพแวดล้อมมีความสะอาด สถาปัตยกรรมโมดูลาร์ พร้อมสำหรับการจัดทำ Engineering Contracts (P01)
