# TokTickIT Lab 3 — แผนงานและสรุปสถานะการทำงาน Phase F4 (P11–P12)
## Handoff to Peer Review (PR from `codex/lab3-p11-p12-admin-verification` to `lab3-staging`)

เอกสารนี้สรุปผลการพัฒนางาน Phase F4 ซึ่งประกอบด้วย **P11 (Administrator User Management)** และ **P12 (Integrated Verification, Responsive Design & Accessibility)** เพื่อเตรียมความพร้อมสำหรับการส่งให้เพื่อน (Peer Reviewer) ตรวจสอบและ Merge เข้าสู่ `lab3-staging`

---

## 1. สิ่งที่พัฒนาและตรวจสอบเรียบร้อยใน Phase F4

### 1.1 Work Package P11: Administrator User Management (T40–T49 / AC-40–AC-49)
- **Backend (`server/src/routes/admin.ts` & `/api/admin`):**
  - ติดตั้ง Middleware: `requireAuth`, `requirePasswordChanged`, `requireRole("ADMINISTRATOR")`
  - `GET /api/admin/users`: ดึงรายชื่อผู้ใช้ เรียงตาม `name asc, id asc` พร้อม SafeUser projection, ค้นหาแบบ case-insensitive ได้ทั้งชื่อและอีเมล, กรองตามบทบาทเดี่ยว (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
  - `POST /api/admin/users`: สร้างผู้ใช้ใหม่พร้อมนโยบายรหัสผ่าน 12–128 ตัวอักษร, Hash ด้วย Argon2id, กำหนด `mustChangePassword = true`, ปฏิเสธ duplicate email ด้วย HTTP 409 `EMAIL_EXISTS`
  - `PATCH /api/admin/users/:id`: แก้ไขข้อมูลผู้ใช้ (`name`, `email`, `role`, `active`)
  - **Self-Deactivation Block:** ป้องกันไม่ให้แอดมินปิดการใช้งานบัญชีตนเอง (400 `SELF_DEACTIVATION`)
  - **Last Active Admin Invariant Protection:** ใช้ PostgreSQL Row-Level Lock (`SELECT id FROM "RequesterUser" WHERE role = 'ADMINISTRATOR'::"Role" AND active = true FOR UPDATE;`) ภายใน `$transaction` เพื่อ serialize concurrent requests ป้องกันการลดบทบาทหรือปิดใช้งานแอดมินคนสุดท้ายจนระบบไม่มีผู้ดูแล (400 `LAST_ACTIVE_ADMIN`)
  - **Atomic Ticket Unassignment (BR-23 / AC-46):** เมื่อปิดการใช้งานเจ้าหน้าที่หรือปรับเป็น REQUESTER ระบบจะปลดการมอบหมายตั๋ว (`ticketOwnerId = null`), เพิ่มหมายเลข `version` ขึ้น 1, รักษาสถานะตั๋วเดิมไว้ และส่งคืน `unassignedTicketCount`
  - **Atomic Session Revocation (BR-12 / AC-47):** เมื่อมีการเปลี่ยนบทบาท, ปิดการใช้งาน หรือ Reset Password ระบบจะเพิ่ม `sessionVersion` และล้างเซสชันที่ใช้งานอยู่ทั้งหมดของผู้ใช้นั้นทันที
  - `POST /api/admin/users/:id/reset-password`: รีเซ็ตรหัสผ่านชั่วคราว, บังคับ `mustChangePassword = true` และเพิกถอนเซสชันทันที
- **Frontend (`client/src/pages/AdminUsersPage.tsx` & `client/src/api.ts`):**
  - หน้าจอการจัดการผู้ใช้แบบ Responsive (ตารางสำหรับ Desktop และการ์ดสำหรับ Mobile)
  - แถบค้นหาชื่อ/อีเมล และตัวกรอง Role พร้อมปุ่ม Clear Filters
  - แสดง Badge บทบาทและสถานะการใช้งาน พร้อมสัญลักษณ์บ่งชี้ "You" สำหรับบัญชีแอดมินที่ล็อกอินอยู่
  - Add User Modal พร้อมปุ่ม Show/Hide รหัสผ่าน และการตรวจสอบความถูกต้อง
  - Edit User Modal พร้อมการปิด switch Active บนบัญชีตนเองและข้อความเตือน, รวมถึงกล่องเตือนเรื่องการปลดตั๋วที่ถือครอง
  - Reset Password Modal พร้อมข้อความเตือนเรื่องการบังคับเปลี่ยนรหัสและเพิกถอนเซสชัน
  - ระบบแจ้งเตือนผลลัพธ์ (Success/Error) พร้อมจำนวนตั๋วที่ถูกปลดการมอบหมาย

---

### 1.2 Work Package P12: Integrated Verification, Responsive & Accessibility (T50–T53 / AC-50–AC-53)
- **T51 / AC-51 (Design Tokens & Extended Badges):**
  - สร้างชุดทดสอบ [`client/tests/lab-03/Theme.style.test.tsx`](file:///c:/Users/uesr/Downloads/toktickit/client/tests/lab-03/Theme.style.test.tsx) ตรวจสอบ Zen Green tokens (`--color-*`, `--badge-*`), typography, editable/readonly background tokens
  - ตรวจสอบ Badge สถานะใหม่ทั้ง 3 สถานะ (`WAITING_FOR_REQUESTER`, `REOPENED`, `CANCELLED`) ที่จับคู่สีเดิมอย่างถูกต้องและแสดงข้อความอ่านง่าย (7/7 tests passed)
- **T53 / AC-53 (Safe Error Handling & Non-Disclosure API):**
  - ติดตั้ง Global 404 wildcard handler สำหรับ `/api/*` และ Error Middleware ใน [`server/src/app.ts`](file:///c:/Users/uesr/Downloads/toktickit/server/src/app.ts)
  - สร้างชุดทดสอบ [`server/tests/lab-03/safe-errors.api.test.ts`](file:///c:/Users/uesr/Downloads/toktickit/server/tests/lab-03/safe-errors.api.test.ts) ตรวจสอบ 400 (malformed JSON), 404 (non-existent route, foreign ticket non-disclosure), 409 (duplicate email, repeat attachment removal), และ 500 (unhandled internal errors) โดยตรวจสอบว่าผลลัพธ์ไม่หลุด stack traces, database secrets, SQL queries หรือข้อมูลเจ้าของตั๋วคนอื่น (7/7 tests passed)
- **ADMIN-E2E / AC-40–AC-49 (Full User Administration Flow):**
  - สร้าง [`e2e/lab-03/user-administration.spec.ts`](file:///c:/Users/uesr/Downloads/toktickit/e2e/lab-03/user-administration.spec.ts) ครอบคลุม: Admin Login -> ค้นหา/กรอง -> สร้างผู้ใช้ IT Staff -> เข้าสู่ระบบด้วยรหัสชั่วคราวและถูกบังคับเปลี่ยนรหัสผ่านทันที -> Admin แก้ไขข้อมูล -> ปิดการใช้งาน Staff และตั๋วถูกปลดเป็น unassigned โดยอัตโนมัติ -> รีเซ็ตรหัสผ่าน -> ป้องกันการปิดการใช้งานตนเอง -> บัญชีที่ไม่ใช่แอดมินถูกบล็อก 403 (7/7 tests passed)
- **T52 / AC-52 / VISUAL-01 (Accessibility & Keyboard Navigation):**
  - เพิ่ม Event Listener ดักจับปุ่ม `Escape` สำหรับปิด Modal ใน `AdminUsersPage.tsx`
  - เพิ่ม `aria-label` ที่ระบุชื่อผู้ใช้อย่างชัดเจนบนปุ่มควบคุมทุกขนาดหน้าจอ
  - สร้าง [`e2e/lab-03/accessibility.spec.ts`](file:///c:/Users/uesr/Downloads/toktickit/e2e/lab-03/accessibility.spec.ts) ตรวจสอบ associated `<label>` ทุกฟิลด์, ขนาด Touch Target ไม่ต่ำกว่า 44px, เส้นขอบ Focus Ring เมื่อ Tab, ARIA attributes บน Dialog, และ ARIA Live regions สำหรับ alert (5/5 tests passed)
- **T50 / AC-50 / VISUAL-01 (Responsive Layouts & Visual Evidence):**
  - สร้าง [`e2e/lab-03/responsive.spec.ts`](file:///c:/Users/uesr/Downloads/toktickit/e2e/lab-03/responsive.spec.ts) ทดสอบทุกหน้าจอหลัก (Authentication, Requester, Staff Queue, Staff Detail, User Management) บน 4 ขนาดหน้าจอ (375px mobile, 768px tablet, 1024px tablet-regression, 1280px desktop)
  - ตรวจสอบ `scrollWidth <= clientWidth` ปราศจากข้อผิดพลาดข้อความล้นหรือตกขอบ
  - บันทึกภาพหลักฐานจริง 32 ภาพ (ขนาด >10KB ทุกไฟล์) ภายใต้ไดเรกทอรี `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/` โดยคงไฟล์ประวัติเดิมของ Lab 2 ไว้อย่างครบถ้วน (16/16 tests passed)

---

## 2. หลักฐานผลการรันทดสอบทั้งหมด (Real Verification Evidence)

| ชุดทดสอบ | จำนวนไฟล์ | จำนวนข้อที่ผ่าน | ข้อผิดพลาด | ผลลัพธ์ |
|---|---|---|---|---|
| **Server Vitest** | 24 files | **167 passed** | 0 | **100% Pass** |
| **Client Vitest** | 15 files | **83 passed** | 0 | **100% Pass** |
| **Playwright E2E** | 5 files | **33 passed** | 0 | **100% Pass** |
| **Server Build (`tsc`)** | - | 0 errors | 0 | **Clean Build** |
| **Client Build (`tsc && vite build`)** | - | 0 errors | 0 | **Clean Build** |

---

## 3. ขั้นตอนที่ต้องทำต่อไป (Step-by-Step for User & Reviewer)

### สำหรับคุณ (Contributor / ผู้ส่งงาน):
1. ตรวจสอบ git status และ commit ไฟล์งานทั้งหมดใน branch `codex/lab3-p11-p12-admin-verification`
2. Push commit ขึ้น remote:
   ```bash
   git push origin codex/lab3-p11-p12-admin-verification
   ```
3. เปิดเบราว์เซอร์ไปที่ GitHub Repository และสร้าง Pull Request:
   - **Head branch (ต้นทาง):** `codex/lab3-p11-p12-admin-verification`
   - **Base branch (ปลายทาง):** `lab3-staging` *(ระวังอย่าเลือก `main`)*
   - **Title:** `Phase F4 (P11–P12): Administrator User Management & Integrated Verification`
   - **Description:** ใส่สรุปงาน P11 และ P12 พร้อมอ้างอิง `Closes #45`
4. บน GitHub Project Board ให้ขยับ **Issue #45** ไปยังคอลัมน์ **In Review**
5. แจ้งเพื่อน (Peer Reviewer) ให้เริ่มทำการตรวจสอบ

### สำหรับเพื่อน (Peer Reviewer):
1. สลับมาที่ branch `codex/lab3-p11-p12-admin-verification` หรือดึง PR มาทดสอบ
2. รันคำสั่งตรวจสอบ:
   ```bash
   npm --prefix server test -- --run
   npm --prefix client test -- --run
   npx playwright test
   npm --prefix server run build; npm --prefix client run build
   ```
3. ตรวจสอบโค้ดเรื่องความปลอดภัยของ Admin, Concurrency Lock, Safe Error Handling และภาพถ่ายหน้าจอใน `artifacts/lab-03/screenshots/run-2026-09-19T12-16-03-181Z/`
4. เมื่อเพื่อนตรวจสอบเรียบร้อยและกดยืนยัน **Approve** ให้เพื่อนกดปุ่ม **Merge Pull Request** เข้าสู่ `lab3-staging`
