# Lab 2 — Peer Review Record

**Author:** รพีพิชชา วราสินกุลภัทร์ 67070501036 — GitHub: [@yuminnini](https://github.com/yuminnini)  
**Peer Reviewer:** พงศธร พุทธสอน 67070501084 — GitHub: [@JinggXd](https://github.com/JinggXd) (BuamBuam)  
**Repository:** [https://github.com/yuminnini/toktickit](https://github.com/yuminnini/toktickit)

---

## 1. Pull Requests I Authored (Reviewed by My Partner)

| PR | Branch | Scope | Reviewer Verdict | Status |
|---|---|---|---|---|
| [#11](https://github.com/yuminnini/toktickit/pull/11) | `feature/lab2-1-spec-test-plan` | Lab 2 Specification, API Contract, Test Plan & UI Spec | Approved | Merged to `lab2-staging` |
| [#13](https://github.com/yuminnini/toktickit/pull/13) | `feature/lab2-2-database-foundation` | Prisma Schema, Migrations, Idempotent Seed, Constraints | Approved | Merged to `lab2-staging` |
| [#15](https://github.com/yuminnini/toktickit/pull/15) | `feature/lab2-3-requester-context` | Reference APIs, RequesterContext, RouteGuard, AppShell | Approved | Merged to `lab2-staging` |
| [#16](https://github.com/yuminnini/toktickit/pull/16) | `feature/lab2-ticket-creation` | POST /api/tickets, Ticket Number generator, Create Ticket UI | Approved | Merged to `lab2-staging` |
| [#19](https://github.com/yuminnini/toktickit/pull/19) | `feature/lab2-phase4` | GET /api/tickets, Search, Filters, Pagination, Ticket Detail | Approved | Merged to `lab2-staging` |
| [#20](https://github.com/yuminnini/toktickit/pull/20) | `feature/lab2-attachments` | Attachment lifecycle, Multer storage, Soft-removal, Concurrency lock | Approved | Merged to `lab2-staging` |
| [#23](https://github.com/yuminnini/toktickit/pull/23) | `feature/lab2-zen-green-responsive` | Zen Green UI tokens, Accessibility, Responsive layout switching | Approved | Merged to `lab2-staging` |
| [#25](https://github.com/yuminnini/toktickit/pull/25) | `test/lab2-e2e-evidence` | Playwright E2E suites, Real download verification, Visual screenshots | Approved | Merged to `lab2-staging` |

---

### Phase 1 — Specification & Test Plan ([#11](https://github.com/yuminnini/toktickit/pull/11))
- **Branch:** `feature/lab2-1-spec-test-plan`
- **Reviewer comment received:**
  > "เอกสารครอบคลุมดีมาก มีการแยก Specification, API Contract, UI Spec และ Test Plan ชัดเจน Acceptance Criteria (AC-01 ถึง AC-22) ครบถ้วนตาม labsheet ขอเสริมให้เพิ่มเคสทดสอบเรื่อง Ownership isolation ของ Attachment ให้ชัดเจน (เช่น Requester อื่นห้ามดาวน์โหลดหรือลบไฟล์ของคนอื่น) และอยากให้ระบุเกณฑ์การทดสอบ Responsive Breakpoints ให้ตรงกับ Bootstrap 5 grid ครับ"
- **How I responded:**
  > "ขอบคุณสำหรับข้อเสนอแนะ ได้เพิ่มเคสทดสอบ API-12, API-13, API-14 สำหรับ Attachment metadata, download, และ delete เมื่อไม่ใช่ owner ต้องได้ 404 ตามกฎ BR-10 (Non-disclosure) เรียบร้อย และกำหนด Breakpoints ชัดเจนใน `ui-spec.md` (Mobile <992px แสดงการ์ด, Desktop/Tablet ≥992px แสดงตาราง) ครับ"
- **Verdict:** Approved

---

### Phase 2 — Database Foundation & Seed ([#13](https://github.com/yuminnini/toktickit/pull/13))
- **Branch:** `feature/lab2-2-database-foundation`
- **Reviewer comment received:**
  > "Prisma schema ครบถ้วนทั้ง RequesterUser, RelatedSystem, Ticket, Attachment มี Unique constraint บน email ของ Requester และ seed ทำงานได้แบบ idempotent รันซ้ำ 2 รอบได้ผลเท่าเดิมไม่มี error แต่สังเกตว่าใน Attachment model ยังไม่มี unique constraint บน `storedFilename` ซึ่งอาจทำให้เกิด collision ได้ถ้าในอนาคตมีชื่อไฟล์สุ่มซ้ำ และใน test cleanup อยากให้ใช้ `try/finally` เพื่อรับประกันว่า test data จะถูกลบแม้ assertion fail ครับ"
- **How I responded:**
  > "แก้ไขเรียบร้อยครับ: 
  > 1. เพิ่ม migration `20260831110621_attachment_stored_filename_unique` เพื่อ enforce `@unique` บน `storedFilename`
  > 2. ปรับ unit test ใน `requester-constraint.unit.test.ts` และ `seed.unit.test.ts` ให้ครอบ `try/finally` เพื่อทำความสะอาด DB เสมอ"
- **Verdict:** Approved

---

### Phase 3 Part 1 — Reference APIs & Requester Context ([#15](https://github.com/yuminnini/toktickit/pull/15))
- **Branch:** `feature/lab2-3-requester-context`
- **Reviewer comment received:**
  > "Reference APIs (`/api/categories`, `/api/related-systems`, `/api/requesters`) ดึงข้อมูลจริงจาก DB และคัดกรองเฉพาะ `active: true` ได้ถูกต้อง RouteGuard ทำงานดี เมื่อไม่มี requester ใน session จะ redirect ไปหน้าคัดเลือกทันที แนะนำให้เพิ่มปุ่ม Cancel ในหน้า Requester Selection เผื่อผู้ใช้กด Change มาแล้วเปลี่ยนใจไม่อยากเปลี่ยนคนครับ"
- **How I responded:**
  > "เพิ่มปุ่ม Cancel ใน `RequesterSelection.tsx` เรียบร้อยแล้ว โดยถ้าผู้ใช้มี requester เดิมอยู่แล้วและกด Cancel จะพากลับไปยังหน้า My Tickets เดิมโดยไม่ลบ session ครับ"
- **Verdict:** Approved

---

### Phase 3 Part 2 — Ticket Creation API & UI ([#16](https://github.com/yuminnini/toktickit/pull/16))
- **Branch:** `feature/lab2-ticket-creation`
- **Reviewer comment received:**
  > "ฟอร์มสร้างตั๋วทำงานได้ดี มี validation ครบทั้ง client และ server (summary, description, category, related system) ระบบสร้างรหัสตั๋วแบบ `TKT-YYYY-NNNNNN` ทำงานถูกต้อง ป้องกัน double-click submit ได้ดี แต่ขอให้ตรวจสอบ accessibility ให้ input ที่มี error เชื่อมโยงกับ error text ผ่าน attribute `aria-describedby` เพื่อให้ Screen Reader อ่านได้ถูกต้องด้วยครับ"
- **How I responded:**
  > "เพิ่ม `aria-describedby="summary-error"` และ `aria-invalid` ในฟอร์ม พร้อมเขียน UI Style test `CreateTicket.style.test.tsx` ตรวจสอบเรียบร้อยแล้วครับ"
- **Verdict:** Approved

---

### Phase 4 — My Tickets & Ticket Detail ([#19](https://github.com/yuminnini/toktickit/pull/19))
- **Branch:** `feature/lab2-phase4`
- **Reviewer comment received:**
  > "หน้า My Tickets มีฟิลเตอร์ครบทั้ง Search, Category, Priority, และ Status มี Pagination ถูกต้อง และแยก Empty State ("No tickets yet") กับ No Results State ("No tickets found") ตามกฎ BR-12 แล้ว ตั๋วของผู้ใช้อื่นไม่หลุดมาในลิสต์ (Ownership Scoped) แต่พบว่าเมื่อผู้ใช้สลับ Requester ในขณะที่หน้ากำลัง fetch ข้อมูล อาจเกิด race condition ได้ อยากให้ใช้ `AbortController` เพื่อยกเลิก request เก่าด้วยครับ"
- **How I responded:**
  > "นำ `AbortController` มาใช้ใน `useEffect` ของ `MyTickets.tsx` และ `TicketDetail.tsx` เรียบร้อยแล้ว หากมีการสลับ Requester หรือเปลี่ยน route ตัว request เก่าจะถูก abort ทันที ไม่นำข้อมูลเก่ามาทับครับ"
- **Verdict:** Approved

---

### Phase 5 — Attachment Lifecycle ([#20](https://github.com/yuminnini/toktickit/pull/20))
- **Branch:** `feature/lab2-attachments`
- **Reviewer comment received:**
  > "การอัปโหลดไฟล์ ทำงานได้ดี ตรวจสอบนามสกุลและจำกัดขนาด 5MB ได้ถูกต้อง Soft-removal เก็บประวัติเหตุผล 1-500 ตัวอักษรและคืนโควตา 5 ไฟล์ตาม AC-14 ได้จริง แต่มีจุดที่ต้องปรับปรุงเรื่องความปลอดภัย 3 จุด:
  > 1. การจำกัด 5 ไฟล์ยังเสี่ยงต่อ race condition หากมีการอัปโหลดพร้อมกันในเวลาเสี้ยววินาที
  > 2. ต้องป้องกัน Path Traversal ในชื่อไฟล์ตอนบันทึกและดาวน์โหลด
  > 3. ตอนดาวน์โหลดไฟล์ ถ้าไฟล์บน disk หายหรืออ่านไม่ออก backend ไม่ควร crash"
- **How I responded:**
  > "ดำเนินการแก้ไขทุกข้อเรียบร้อย:
  > 1. ใช้ row-level lock `SELECT id FROM "Ticket" WHERE id = $1 FOR UPDATE` ภายใต้ `prisma.$transaction` เพื่อป้องกันการอัปโหลดพร้อมกันเกิน 5 ไฟล์ พร้อมเขียน test ทดสอบด้วย `Promise.all`
  > 2. เพิ่มฟังก์ชัน `resolveSafeFilePath` ตรวจสอบ path boundary ไม่ให้หลุดออกจากโฟลเดอร์ uploads
  > 3. เพิ่ม error listener บน download stream หากมีข้อผิดพลาดจะคืน `404 NOT_FOUND` อย่างปลอดภัยไม่ทำให้ process ล่ม"
- **Verdict:** Approved

---

### Phase 6 — Zen Green UI & Responsive ([#23](https://github.com/yuminnini/toktickit/pull/23))
- **Branch:** `feature/lab2-zen-green-responsive`
- **Reviewer comment received:**
  > "ธีม Zen Green สวยงาม สอดคล้องกับ mockup ในใบแล็ป ฟอนต์และสีตัดกันดี ผ่านเกณฑ์ accessibility การสลับ layout ระหว่างตาราง (≥992px) และการ์ด (<992px) ทำงานราบรื่น ไม่มี horizontal scroll บน mobile (375px) ตรวจสอบเพิ่มเติม:
  > - ฝั่ง backend ควรตรวจสอบ magic numbers ของไฟล์ไบนารีด้วยเพื่อป้องกันการเปลี่ยนนามสกุลหลอก
  > - หน้า My Tickets อยากให้มีปุ่ม Clear Filters ใน Toolbar ให้กดรีเซ็ตได้ตลอดเวลา และมีตัวเลือก Page Size (5, 10, 20, 50)"
- **How I responded:**
  > "ได้ดำเนินการเพิ่มครบถ้วน:
  > 1. เพิ่ม binary magic bytes inspection ใน `server/src/services/attachmentStorage.ts` รองรับ PNG, JPEG, PDF, WEBP
  > 2. เพิ่มปุ่ม Clear Filters แบบถาวรและตัวเลือก Page Size (5, 10, 20, 50) ใน Toolbar ของ `MyTickets.tsx`
  > 3. เพิ่มการจัดการ Focus และปุ่ม Escape ใน Modal ลบไฟล์แนบ"
- **Verdict:** Approved

---

### Phase 7 & 8 — E2E Test Evidence, Hardening & Release ([#25](https://github.com/yuminnini/toktickit/pull/25))
- **Branch:** `test/lab2-e2e-evidence`
- **Reviewer comment received:**
  > "Playwright รันผ่านครบ มีการแคปรูป 9 responsive screenshots ครบถ้วนตาม `ui-spec.md` แต่ขอให้เน้นเรื่อง 'Test ต้องล้มเมื่อพฤติกรรมจริงเสีย':
  > - ปุ่ม Download อย่าตรวจแค่ว่าปุ่มโชว์ ต้องกดดาวน์โหลดจริง และ assert binary content
  > - การตรวจ Ownership อย่าตรวจแค่หน้า UI ต้องยิง API ด้วย requester อื่นแล้วตรวจว่าได้ 404 จริง
  > - การแคปหน้าจอ ต้องตรวจว่า elements โหลดเสร็จก่อนแคป และไฟล์ภาพต้องไม่ว่างเปล่า (>10KB)
  > - README ต้องอัปเดตให้ติดตั้งจากเครื่องใหม่ได้จริง (ติดตั้ง root, playwright browser, migrate, seed, build, test) และเอาคำสั่ง commit ท้ายเอกสารออก"
- **How I responded:**
  > "แก้ไขใน Phase 8 ครบถ้วน 100%:
  > 1. ใน `requester-ticket-flow.spec.ts`: ใช้ `page.waitForEvent('download')`, ตรวจชื่อไฟล์, และอ่าน binary มาเทียบกับ fixture byte-by-byte พร้อมตรวจ 404 เมื่อไฟล์ถูก soft-remove
  > 2. ตรวจสอบ Ownership 404 ครอบคลุมทั้ง Ticket API, Attachment Metadata API, Attachment Download API, และ Delete API
  > 3. ใน `responsive.spec.ts`: เพิ่ม assertions ตรวจฟอร์มและตารางก่อนแคปภาพ และตรวจสอบไฟล์ภาพทั้ง 9 ไฟล์ว่ามีอยู่จริง ขนาด >10KB และมี PNG header
  > 4. อัปเดต `README.md` เป็นคู่มือ Lab 2 แบบ Reproducible สมบูรณ์ ลบคำสั่งหลงท้ายเอกสารออกเรียบร้อย"
- **Verdict:** Approved (Merged into `lab2-staging` and released to `main`)

---

## 2. Pull Requests I Reviewed for My Partner

| Partner's PR | Branch / Scope | Verification Summary | Verdict |
|---|---|---|---|
| Lab 2 Spec & Test Plan | `feature/lab2-spec` | ตรวจสอบ AC-01 ถึง AC-22, Data model, API contracts | Approved |
| Database & Seeds | `feature/lab2-db` | ตรวจสอบ Schema, Migrations, Idempotent seed | Approved |
| Requester Context & Shell | `feature/lab2-context` | ตรวจสอบ RouteGuard, SessionStorage, Nav Switcher | Approved |
| Ticket Creation API & UI | `feature/lab2-create-ticket` | ตรวจสอบ Form validation, Ticket numbering, Error states | Approved |
| My Tickets & Ticket Detail | `feature/lab2-tickets-list` | ตรวจสอบ Filter, Sorting, Pagination, Detail read-only | Approved |
| Attachments Lifecycle | `feature/lab2-attachments` | ตรวจสอบ Upload, Soft-remove reason, Path safety | Approved |
| Zen Green & Responsive | `feature/lab2-zen-green` | ตรวจสอบ Mobile cards vs Desktop table, Theme tokens | Approved |
| E2E Testing & README | `feature/lab2-e2e-release` | ตรวจสอบ Playwright flows, Screenshots, Setup steps | Approved |

---

### Detailed Review Example: Attachments Lifecycle (`feature/lab2-attachments`)

**สิ่งที่เพื่อนทำ:**
- สร้างตาราง `Attachment` และเชื่อม Foreign Key กับ `Ticket`
- สร้าง Endpoint อัปโหลดไฟล์ด้วย Multer และจำกัดขนาดไม่เกิน 5 MB
- สร้างหน้าต่างยืนยันการลบแบบ Soft-removal พร้อมระบุเหตุผล (1–500 ตัวอักษร)
- เขียน Unit test ตรวจสอบการอัปโหลดและการปฏิเสธไฟล์นามสกุล `.exe`

**Acceptance Criteria Verification:**

| Criteria | ผลการตรวจ | หลักฐานที่พบ |
|---|---|---|
| **AC-11:** อัปโหลดไฟล์แนบ 1 MB สำเร็จ | ✅ Pass | `POST /api/tickets/:id/attachments` คืนสถานะ `201 Created` พร้อม metadata |
| **AC-12:** ปฏิเสธไฟล์ `.exe` ทันที | ✅ Pass | มี client-side alert แจ้งเตือน และ API ตอบกลับด้วย `400 INVALID_FILE_TYPE` |
| **AC-13:** จำกัดไม่เกิน 5 ไฟล์ active | ✅ Pass | เมื่อมีไฟล์ active ครบ 5 ไฟล์ ปุ่ม upload จะถูก disable และ API คืน `409 ATTACHMENT_LIMIT` |
| **AC-14:** Soft-removal พร้อมเหตุผล | ✅ Pass | เมื่อลบไฟล์ `removedAt` และ `removalReason` ถูกบันทึกลงฐานข้อมูล แถวข้อมูลไม่ถูกลบจริง |
| **AC-15:** ห้ามดาวน์โหลดไฟล์ที่ถูกลบ | ✅ Pass | `GET /api/attachments/:id/download` คืน `404 NOT_FOUND` |

**ข้อคิดเห็นและข้อเสนอแนะที่แจ้งเพื่อน (Comments Given):**
1. ตรวจสอบการลบไฟล์แนบ พบว่าถ้ากรอกช่องเหตุผลด้วยช่องว่างล้วน (`"   "`) ตัว API ยังยอมรับอยู่ ควรเพิ่ม `.trim()` เพื่อป้องกันการใส่เหตุผลว่างเปล่า
2. เพื่อความปลอดภัย แนะนำให้เพิ่มการตรวจสอบ Path Traversal ในชื่อไฟล์บันทึก เพื่อไม่ให้มีโอกาสเข้าถึงไฟล์ระบบนอกไดเรกทอรี
3. ควรเพิ่ม Row-level lock ในระหว่างตรวจสอบโควตา 5 ไฟล์ เพื่อป้องกันข้อผิดพลาดกรณีผู้ใช้อัปโหลดพร้อมกันหลายไฟล์

**การตอบกลับของเพื่อน (Partner's Response):**
> "ขอบคุณมากครับ ได้ทำการเพิ่ม `.trim()` ตรวจสอบความยาวเหตุผล 1-500 ตัวอักษร, นำ `path.resolve` มาตรวจ boundary ป้องกัน directory traversal, และใส่ transaction lock ในการเช็คจำนวนไฟล์เรียบร้อยแล้วครับ"

---

### Detailed Review Example: My Tickets & Sorting (`feature/lab2-tickets-list`)

**สิ่งที่เพื่อนทำ:**
- สร้างหน้า `MyTickets.tsx` รองรับการค้นหา, ตัวกรองหมวดหมู่, ลำดับความสำคัญ และสถานะ
- สลับการแสดงผลระหว่าง Table บนหน้าจอใหญ่ และ Cards บนหน้าจอมือถือ
- แสดงปุ่มเลขหน้าสำหรับ Pagination และสรุปจำนวนตั๋ว

**Acceptance Criteria Verification:**

| Criteria | ผลการตรวจ | หลักฐานที่พบ |
|---|---|---|
| **AC-07:** Empty State เมื่อไม่เคยมีตั๋ว | ✅ Pass | แสดงการ์ด "No tickets yet" พร้อมปุ่ม "Create Your First Ticket" |
| **AC-08:** No Results State เมื่อฟิลเตอร์ไม่พบ | ✅ Pass | แสดงการ์ด "No tickets found" พร้อมปุ่ม "Clear Filters" |
| **AC-09:** การเปลี่ยนหน้า Pagination | ✅ Pass | กดหน้าถัดไป ยิง API ขอ `page=2` และอัปเดตข้อมูลตรงตามชุดข้อมูล |
| **AC-19:** ค้นหาคำว่า "laptop" | ✅ Pass | คืนเฉพาะตั๋วที่มีคำว่า laptop ใน summary หรือ ticketNumber |
| **AC-20:** กรองหมวดหมู่ร่วมกับความสำคัญ | ✅ Pass | แสดงเฉพาะตั๋วที่ตรงเงื่อนไขทั้งสองตัวกรองพร้อมกัน |

**ข้อคิดเห็นและข้อเสนอแนะที่แจ้งเพื่อน (Comments Given):**
- การจัดวางตารางบนหน้าจอ Tablet (1024px) แสดงผลได้ดี คอลัมน์ Last Updated มีประโยชน์มาก ช่วยให้ติดตามตั๋วที่เพิ่งมีความเคลื่อนไหวได้สะดวก
- ปุ่มรีเซ็ตตัวกรองทำงานได้ถูกต้องทั้งใน Toolbar และ Empty Card

**การตอบกลับของเพื่อน (Partner's Response):**
> "ขอบคุณครับ ได้ตรวจสอบการแสดงผลบน Tablet และ Mobile ซ้ำแล้ว ทุกอย่างแสดงผลตรงตาม breakpoint สวยงามครับ"
