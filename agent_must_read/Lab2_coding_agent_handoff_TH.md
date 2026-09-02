# TokTickIT Lab 2 - สถานะปัจจุบันและแผนส่งต่องานให้ Coding Agent

วันที่ตรวจ: 2026-09-02  
เอกสารอ้างอิง: `Lab_02_labsheet.pdf` จำนวน 22 หน้า  
ซอร์สที่ตรวจ: `toktickit-feature-lab2-2-database-foundation (1).zip`  
snapshot comment ใน ZIP: `b113e0a0aee01edcafcb40bd29ff502d8d83d970`

> เอกสารนี้เป็น handoff และ audit จากไฟล์จริงใน ZIP ไม่ใช่คำกล่าวอ้างว่า feature เสร็จแล้ว

## 1. คำตัดสินปัจจุบัน

Lab 2 **ยังไม่เสร็จ** และยังไม่ควรให้ coding agent ข้ามไปทำ UI แบบรวดเดียว เพราะ contract กับ database foundation ยังมีจุดขัดกันที่ต้องแก้ก่อน

สถานะที่ตรวจได้จริง:

| ด้าน | สถานะ | หลักฐานจาก repository |
|---|---|---|
| เอกสาร engineering contract | บางส่วน | มี `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` แต่ยังมีข้อขัดแย้ง/ช่องว่าง |
| เอกสาร Lab 2 ที่ PDF บังคับ | 4/6 ไฟล์ | ขาด `docs/lab-02/reviewer.md` และ `docs/lab-02/ai-use.md` |
| Prisma schema | บางส่วน | มี 5 concepts หลัก: Category, RequesterUser, RelatedSystem, Ticket, Attachment |
| Prisma migration Lab 2 | ยังไม่มี | migration ที่มีสร้างเฉพาะ `Category` ของ Lab 1 |
| Seed Lab 2 | บางส่วน | มี 4 active + 1 inactive Requester และ Related Systems 7 รายการ แต่เอกสารระบุ 6 |
| REST API Lab 2 | แทบยังไม่เริ่ม | มีเพียง `/api/health` และ `/api/categories` จาก Lab 1 |
| UI Lab 2 | ยังไม่เริ่ม | `client/src/App.tsx` ยังเป็นหน้า Check System ของ Lab 1 |
| Lab 2 automated tests | บางส่วนเล็กน้อย | มี 2 database tests จากแผนประมาณ 41 Test IDs; ยังไม่มี API/UI/style/responsive/E2E ที่ต้องใช้ |
| Screenshot/visual evidence | ยังไม่มี | ไม่มี `artifacts/lab-02/screenshots/` |
| Git workflow evidence | ตรวจไม่ได้จาก ZIP | ไม่มี `.git`; จึงยืนยัน branch, PR, review, commit history และ Kanban ไม่ได้ |
| Submission PDF Answer Part 1-9 | ยังไม่มี | ไม่พบไฟล์หลักฐานส่งงาน |

## 2. ผลตรวจที่รันจริง

| คำสั่ง/การตรวจ | ผลจริง |
|---|---|
| `cd client && npm run build` | ผ่าน |
| `cd client && npm test -- --reporter=verbose` | ผ่าน 3/3 tests แต่ทั้งหมดเป็น Lab 1 |
| `cd server && npm run build` | ผ่าน |
| `DATABASE_URL=... npx prisma validate` | schema syntax ผ่าน |
| `cd server && npm test -- --reporter=verbose` โดยไม่มี `.env` | ผ่าน 1/4; ล้ม 3 tests เพราะไม่มี `DATABASE_URL`/database |
| ตรวจ PDF แบบ text + render ทุกหน้า | ครบ 22 หน้า |

ข้อสำคัญ: server tests ที่ล้มรอบนี้ยังไม่พิสูจน์ว่า logic seed/constraint ผิด แต่พิสูจน์ว่า test suite **ยังรันแบบ turnkey ไม่ได้** ตาม Definition of Done เพราะไม่มี test DB setup และ migration Lab 2 ก็ยังขาด

## 3. สิ่งที่ทำไปแล้วจริง พร้อมตำแหน่งไฟล์

### 3.1 Lab 1 foundation ที่ยังใช้ต่อได้

- Express app และ health endpoint: `server/src/app.ts`
- Prisma singleton: `server/src/prisma.ts`
- server entrypoint: `server/src/index.ts`
- Category endpoint: `GET /api/categories` ใน `server/src/app.ts`
- React/Vite/Bootstrap foundation: `client/src/main.tsx`, `client/src/App.tsx`
- API health/category client: `client/src/api.ts`
- Lab 1 tests: `server/tests/lab-01/`, `client/tests/lab-01/`

ข้อจำกัด: หน้า client ปัจจุบันยังเป็น Lab 1 Check System ไม่ใช่ Requester application

### 3.2 Engineering contract ที่ร่างไว้แล้ว

- Sprint goal, scope, FR-01 ถึง FR-10, BR-01 ถึง BR-14, AC-01 ถึง AC-22 และ DoD: `docs/lab-02/specification.md`
- REST paths และ payload/status เบื้องต้น: `docs/lab-02/api-spec.md`
- Zen Green tokens, screen states, responsive/accessibility rules: `docs/lab-02/ui-spec.md`
- Planned tests และ AC traceability: `docs/lab-02/tests.md`

เอกสารเหล่านี้เป็นฐานที่ดี แต่ยังต้องแก้หัวข้อ P0 ในส่วน 5 ก่อนถือเป็น contract ที่อนุมัติแล้ว

### 3.3 Database schema ที่เพิ่มแล้ว

ไฟล์: `server/prisma/schema.prisma`

- `RequesterUser`: id, name, unique email, active, timestamps, Ticket relation
- `RelatedSystem`: id, unique name, active, timestamps, Ticket relation
- `Ticket`: official number, ownership, category/system relations, summary, description, priority, status, timestamps, indexes
- `Attachment`: ticket relation, original/stored filename, MIME, size, upload/removal metadata
- enums `Priority`, `TicketStatus`
- Category ได้ back-relation `tickets`

ยังไม่ถือว่าเสร็จ เพราะ schema ไม่มี migration ที่สร้างตารางเหล่านี้ใน PostgreSQL

### 3.4 Seed ที่เพิ่มแล้ว

ไฟล์: `server/prisma/seed.ts`

- Categories 4 รายการตาม PDF
- Related Systems 7 รายการ
- Development Requesters: active 4 คน, inactive 1 คน
- ใช้ upsert จึงไม่เพิ่ม duplicate เมื่อรันซ้ำ

ยังต้องแก้ให้ upsert converge กลับสู่ canonical data ด้วย เช่น `update: { name, active }` และแก้จำนวน 6/7 ในเอกสารให้ตรงกัน

### 3.5 Lab 2 tests ที่มีไฟล์แล้ว

- `server/tests/lab-02/seed.unit.test.ts`
- `server/tests/lab-02/requester-constraint.unit.test.ts`

สองไฟล์นี้แตะ PostgreSQL จริง จึงควรจัดประเภทเป็น DB integration tests ไม่ใช่ pure unit tests และต้องมี test DB setup/cleanup ที่ชัดเจน

## 4. Requirement matrix จาก PDF เทียบของจริง

สัญลักษณ์: ✅ ตรวจพบว่าเสร็จ, 🟡 มีบางส่วน, ❌ ยังไม่มี, ⚠️ ตรวจไม่ได้จาก ZIP

| Requirement กลุ่มใหญ่ | สถานะ | สิ่งที่พบ/สิ่งที่ขาด |
|---|---:|---|
| Development Requester Selection | ❌ | มี model/seed แต่ไม่มี API, context, screen, loading/empty/error, Change Requester |
| Testing-only identity; ไม่ใช่ auth | 🟡 | เขียนใน spec แล้ว แต่ยังไม่มี implementation |
| Active Requesters only | 🟡 | seed/model มี `active`; ยังไม่มี `/api/requesters` และ test ผ่านจริง |
| Create Ticket | ❌ | มี contract/schema แต่ไม่มี API/UI/validation/ticket number implementation |
| Backend-generated unique Ticket Number | 🟡 | schema/spec มี แต่ไม่มี generator/service/API และ algorithm ยังมี insertion trap |
| Default status NEW | 🟡 | schema default มี แต่ยังไม่มี create API test |
| Category/Related System จาก DB | 🟡 | Category API มี; Related System API ไม่มี; active Category contract ยังขัด PDF |
| My Tickets ownership | ❌ | ยังไม่มี list API/UI/ownership test |
| Search/filter/sort/pagination | ❌ | มีเอกสารเท่านั้น; implementation/tests ไม่มี |
| Empty vs no-results | 🟡 | UI spec มี แต่ API response ปัจจุบันยังแยกสอง state ไม่ได้อย่างมั่นคง |
| Ticket Detail owned-only | ❌ | มี contract เท่านั้น |
| Attachment upload | ❌ | มี schema/contract; ไม่มี multipart dependency, storage service, API/UI/test |
| Attachment metadata retrieval | ❌ | ไม่มี endpoint |
| Active attachment download | ❌ | ไม่มี endpoint และต้องห้าม static public serving |
| Soft removal + reason | ❌ | schema มี metadata; ไม่มี API/UI/validation/test |
| Removed metadata remains visible | 🟡 | contract/schema รองรับ; implementation ไม่มี |
| Removed file blocked from download/preview | 🟡 | contract ระบุ 404; implementation ไม่มี |
| Max 5 MB, allowed JPG/JPEG/PNG/WEBP/PDF | 🟡 | contract ระบุ; validation/storage implementation ไม่มี |
| Max 5 active attachments | 🟡 | contract ระบุ; concurrency-safe enforcement ไม่มี |
| Zen Green reusable UI | ❌ | มี ui-spec แต่ยังไม่มี `client/src/styles/theme.css` หรือ components |
| Desktop/tablet/mobile | ❌ | มี rules แต่ไม่มี implementation/Playwright screenshots |
| Accessibility | ❌ | มี rules แต่ไม่มี tests/implementation |
| API safe errors/status codes | 🟡 | ร่างใน api-spec; endpoints และ error middleware ไม่มี |
| Automated unit/API/UI/style/responsive/E2E | ❌ | มี plan; implementation test ส่วนใหญ่ไม่มี |
| Every AC mapped to actual test path | 🟡 | matrix มี แต่ client paths ยังใช้ `client/...` placeholder |
| README Lab 2 setup/test commands | ❌ | README ยังประกาศ Lab 1 และมีข้อความคำสั่ง commit ติดท้าย |
| reviewer.md / ai-use.md | ❌ | ไม่มีใน `docs/lab-02/` |
| GitHub Issues/branches/PR/review/Kanban | ⚠️ | ZIP ไม่มี `.git` และไม่มี external evidence |
| screenshots and Answer Part 1-9 PDF | ❌ | ไม่มี |

## 5. จุดต้องแก้ก่อนให้ Coding Agent เริ่ม feature (P0 contract repair)

### P0-1: Active Category ขัดกับ labsheet

PDF ระบุ REST API ต้อง “retrieve active Categories” แต่ `specification.md` ระบุว่า Category ไม่ต้องมี `active` และ schema ปัจจุบันก็ไม่มี field นี้

คำตัดสินที่แนะนำ:

- เพิ่ม `Category.active Boolean @default(true)`
- seed ทุก Category เป็น active
- `/api/categories` filter `active: true`
- ปรับ Lab 1 test ให้ไม่ผูกกับ ID คงที่จาก DB ที่ใช้ร่วมกัน
- อัปเดต `specification.md`, `api-spec.md`, `tests.md`

### P0-2: Ticket Number algorithm สร้างตรง ๆ ไม่ได้

`Ticket.ticketNumber` เป็น required + unique แต่ BR-01 บอกให้ derive จาก auto-increment `id` หลัง create ดังนั้น agent ห้าม create ด้วย `ticketNumber: ""` เพราะ ticket ที่สองจะชน unique

implementation ที่แนะนำ:

1. เปิด transaction
2. create ด้วย provisional unique value เช่น `TMP-${crypto.randomUUID()}`
3. ได้ `id` แล้วสร้าง `TKT-${UTC_YEAR}-${String(id).padStart(6,"0")}`
4. update row เป็น official number ก่อน commit
5. return เฉพาะ official number; provisional valueห้ามหลุดออก API
6. มี pure unit test สำหรับ formatter และ API/integration test สำหรับ uniqueness หลาย tickets

ถ้าจะใช้ database sequence/raw SQL แทน ต้องแก้ contract และอธิบาย migration ให้ชัดก่อน

### P0-3: Migration Lab 2 ไม่มี

`server/prisma/migrations/20260815141221_add_category/migration.sql` สร้างแค่ Category

ต้องสร้าง migration ใหม่จากฐาน Lab 1 เพื่อเพิ่ม:

- `Category.active`
- RequesterUser
- RelatedSystem
- Priority/TicketStatus enums
- Ticket
- Attachment
- unique constraints, FKs, indexes และ `ON DELETE` behavior ตาม contract

ห้าม edit migration เก่าที่อาจเคยรันแล้ว ให้เพิ่ม migration ใหม่และตรวจด้วย database ใหม่เปล่า

### P0-4: Seed เอกสารบอก 6 แต่โค้ดมี 7

PDF ต้องการอย่างน้อย 6 ดังนั้น 7 ใช้ได้ แต่เอกสารที่ว่า “exactly 6” ผิด

คำตัดสินที่แนะนำ: เก็บ 7 รายการตามโค้ด แล้วแก้ `specification.md` เป็น “at least 6; implementation seeds 7” พร้อม test แบบ `>= 6` และตรวจชื่อสำคัญ แทนการผูกกับจำนวนผิด

### P0-5: Empty vs No-results ยังขาดข้อมูลจาก API

response list ปัจจุบันมีแค่ `total` ของ query ที่ filter แล้ว จึงไม่รู้แน่ชัดว่า user ไม่มี ticket เลย หรือมี ticket แต่ filter ไม่เจอ

คำตัดสินที่แนะนำ: เพิ่ม `unfilteredTotal` หรือ `hasAnyTickets` ใน `GET /api/tickets` response แล้วอัปเดต contract/tests/UI

### P0-6: Secondary sort ไม่ได้กำหนด

PDF บังคับให้ระบุ default และ secondary sorting แต่ contract ระบุเพียง `createdAt desc`

คำตัดสินที่แนะนำ: ทุก sort ใช้ `id desc` เป็น deterministic secondary sort; default คือ `createdAt desc, id desc`

### P0-7: Attachment security/storage rules ยังไม่พอ

ต้องระบุใน contract ก่อน code:

- เก็บไฟล์ใน private storage directory ที่ไม่ถูกเสิร์ฟผ่าน `express.static`
- `storedFilename` สร้างโดย server ด้วย random UUID + verified extension
- ห้ามใช้ `originalName` เป็น path
- whitelist extension และ MIME; อย่างน้อยตรวจสองอย่างให้สอดคล้องกัน
- Content-Disposition ต้อง encode filename อย่างปลอดภัย
- หากเขียนไฟล์สำเร็จแต่ DB insert ล้ม ต้องลบไฟล์ชดเชย
- หาก soft-remove สำเร็จ metadata ยังอยู่; route download ต้อง query ownership + `removedAt: null`
- removal reason: trim, required, กำหนด max length เช่น 500 ตัวอักษร และ test boundary
- uploads ที่เกิดจาก automated tests ต้องอยู่ temp directory และ cleanup ได้

### P0-8: Test paths ใช้ placeholder

`docs/lab-02/tests.md` ใช้ `client/.../lab-02/...` ซึ่งไม่ผ่าน requirement “actual test-file path”

คำตัดสินที่แนะนำ: ใช้ `client/tests/lab-02/*.test.tsx` ให้สอดคล้องกับโครงสร้างปัจจุบัน หรือกำหนด path จริงอื่นหนึ่งแบบแล้วแก้ทุก row

### P0-9: Test database contract ไม่มี

ต้องกำหนด:

- separate `DATABASE_URL_TEST`
- migration + seed ก่อน integration suite
- cleanup เฉพาะข้อมูล test ไม่แตะ dev DB
- deterministic fixtures ไม่พึ่ง ID 1,2,3 แบบตายตัว
- test runner ต้อง fail ชัดเมื่อ test DB ไม่ได้ตั้งค่า; ห้าม skip แล้วรายงาน Pass

### P0-10: API behavior ที่ยังคลุมเครือ

ต้องตัดสินเพิ่ม:

- page เกิน `totalPages`: return empty page เดิม หรือ clamp ไปหน้าสุดท้าย
- inactive requester เรียก list/detail/attachment: 400, 404 หรือ behavior ใด
- Category/Related System ที่ inactive ตอน create ต้องถูก reject อย่างไร
- `GET /api/attachments/:id` เมื่อขาด `requesterId` ต้อง 400 shape ใด
- upload ที่ create Ticket สำเร็จแต่บาง attachment ล้ม: response/UI แสดง partial success อย่างไร
- detail response ต้องรวมทั้ง active และ removed attachment metadata

## 6. Pipeline ที่เหลือสำหรับ Coding Agent

ทำทีละ Issue/feature branch และ PR เข้า `lab2-staging` ห้ามทำทั้งหมดใน branch เดียว ห้ามพัฒนาโดยตรงบน `main` หรือ `lab2-staging`

### Phase 0 - Repair and approve the engineering contract

Branch แนะนำ: `docs/lab2-contract-repair`

แก้ไฟล์:

- `docs/lab-02/specification.md`
- `docs/lab-02/api-spec.md`
- `docs/lab-02/ui-spec.md`
- `docs/lab-02/tests.md`
- เพิ่ม `docs/lab-02/implementation-log.md`

งาน:

1. แก้ P0-1 ถึง P0-10
2. เพิ่ม AC/test ที่ขาดสำหรับ active reference data, Ticket Detail, active download, attachment metadata, removal-reason boundary, 5 MB boundary, partial upload failure, inactive requester, reference-data failures, tablet/desktop screenshots
3. เปลี่ยน test path placeholder เป็น path จริง
4. เพิ่ม `unfilteredTotal` และ deterministic secondary sort ใน API contract
5. ระบุ exact field required/editable/read-only และ validation ทั้ง frontend/backend
6. ระบุ safe storage/filename/compensation rules
7. ให้ human owner review/approve ก่อน merge

ผ่าน Phase เมื่อ:

- docs ทั้ง 4 internally consistent
- ทุก FR/BR มี AC หรือเหตุผลว่าทำไม test ผ่าน AC อื่น
- ทุก AC มี planned test path จริง
- ไม่มีคำว่า “exactly 6” ที่ขัด seed 7
- ไม่มีข้อขัดแย้ง active Category

### Phase 1 - Finish database foundation and test harness

Branch แนะนำ: `feature/lab2-database-foundation`

แก้/เพิ่มไฟล์หลัก:

- `server/prisma/schema.prisma`
- `server/prisma/migrations/<timestamp>_lab2_requester_ticket_foundation/migration.sql`
- `server/prisma/seed.ts`
- `server/tests/helpers/testDb.ts` หรือชื่อที่กำหนด
- `server/tests/lab-02/ticket-number.unit.test.ts`
- ปรับ `server/tests/lab-02/seed.unit.test.ts`
- ปรับ `server/tests/lab-02/requester-constraint.unit.test.ts`
- `server/.env.example`
- `.gitignore`

งาน:

1. เพิ่ม Category.active และ migration Lab 2 ครบ
2. ตรวจ migration บน PostgreSQL database ใหม่เปล่า
3. ทำ seed ให้ idempotent และ convergent (`update` field ที่ควรคืนค่ามาตรฐาน)
4. แยก pure ticket-number formatter service เช่น `server/src/services/ticketNumber.ts`
5. ทำ test DB bootstrap/cleanup
6. ห้าม test ผูกกับ auto IDs ตายตัว
7. ตรวจ schema ↔ migration diff เป็นศูนย์หลัง migrate

ผ่าน Phase เมื่อ:

- database ใหม่รัน migrate + seed ได้สองครั้งโดยไม่ duplicate
- 4 categories active, Related Systems อย่างน้อย 6, Requesters active 4 + inactive อย่างน้อย 1
- pure unit ticket-number tests ผ่าน
- DB integration tests ผ่านจาก documented command
- ไม่มี `.env`, DB credentials หรือ uploaded test files ถูก commit

### Phase 2 - Reference APIs and Development Requester context

Branch แนะนำ: `feature/lab2-requester-context`

server files แนะนำ:

- `server/src/routes/reference.routes.ts`
- `server/src/routes/requester.routes.ts`
- `server/src/http/errors.ts`
- เชื่อม routes ใน `server/src/app.ts`
- `server/tests/lab-02/requesters.api.test.ts`
- `server/tests/lab-02/reference-data.api.test.ts`

client files แนะนำ:

- `client/src/context/RequesterContext.tsx`
- `client/src/pages/RequesterSelectionPage.tsx`
- `client/src/components/AppShell.tsx`
- `client/src/components/RequesterRouteGuard.tsx`
- `client/src/api/requesters.ts`
- `client/tests/lab-02/RequesterSelection.test.tsx`
- `client/tests/lab-02/RouteGuard.test.tsx`

งาน:

1. TDD: เขียน API/UI tests ให้แดงด้วยเหตุผลที่ถูกต้องก่อน
2. ทำ active Categories, Related Systems, active Requesters endpoints
3. implement selection loading/empty/error/retry
4. persist selected requester ใน `sessionStorage`
5. route guard บังคับ selection ก่อน Create/My Tickets/Detail
6. AppShell แสดงชื่อและ Change Requester
7. เปลี่ยน requester แล้ว clear requester-scoped state/cache
8. เขียนข้อความชัดว่าไม่ใช่ login/auth

ผ่าน Phase เมื่อ:

- inactive requester ไม่ปรากฏใน selector
- no selection redirect ทำงาน
- refresh แล้วยังอยู่ใน session เดิม
- Change Requester ล้างข้อมูลเก่า
- loading/empty/API failure tests ผ่าน

### Phase 3 - Ticket creation API and Create Ticket UI

Branch แนะนำ: `feature/lab2-ticket-creation`

server files แนะนำ:

- `server/src/routes/ticket.routes.ts`
- `server/src/services/ticket.service.ts`
- `server/src/services/ticketNumber.ts`
- `server/src/validation/ticket.validation.ts`
- `server/tests/lab-02/create-ticket.api.test.ts`

client files แนะนำ:

- `client/src/pages/CreateTicketPage.tsx`
- `client/src/components/forms/*`
- `client/src/api/tickets.ts`
- `client/tests/lab-02/CreateTicket.test.tsx`
- `client/tests/lab-02/CreateTicket.style.test.tsx`

งาน:

1. backend validate requester active, Category active, Related System active, priority enum, summary/description trim+limits
2. server sets createdAt/currentStatus/requesterId; client ห้ามส่งค่าระบบ
3. implement transaction-safe official Ticket Number
4. UI load reference data from DB
5. field-level errors + `aria-describedby`; focus first invalid field
6. busy/disabled state ป้องกัน double click
7. API failure ต้องรักษาค่าฟอร์ม
8. success แสดง official Ticket Number + next actions
9. ยังไม่ผูก attachment จน Phase 5 แต่ UI contract ต้องรองรับ staged files หรือ feature flag ตาม Issue boundary

ผ่าน Phase เมื่อ:

- valid create = 201 และ DB มีหนึ่ง row
- invalid body = 400 safe field errors
- inactive/unknown references ถูก reject
- duplicate click = API call ครั้งเดียวใน UI test
- server ไม่รับ client-generated ticket number/status/date

### Phase 4 - My Tickets and owned Ticket Detail

Branch แนะนำ: `feature/lab2-my-tickets-detail`

server:

- list/detail handlers/services ใน ticket route/service
- `server/tests/lab-02/my-tickets.api.test.ts`
- `server/tests/lab-02/ticket-detail.api.test.ts`

client:

- `client/src/pages/MyTicketsPage.tsx`
- `client/src/pages/TicketDetailPage.tsx`
- `client/src/components/TicketTable.tsx`
- `client/src/components/TicketCard.tsx`
- `client/src/components/Badge.tsx`
- `client/src/components/Pagination.tsx`
- `client/tests/lab-02/MyTickets.test.tsx`
- `client/tests/lab-02/RequesterTicketDetail.test.tsx`
- `client/tests/lab-02/Badge.style.test.tsx`

งาน:

1. list ทุก query ต้องมี requester ownership scope ตั้งแต่ Prisma `where`
2. search ticketNumber/summary แบบ case-insensitive
3. filters ใช้ AND; invalid values ตาม contract
4. deterministic primary + secondary sort
5. pagination metadata รวม `unfilteredTotal`
6. distinguish Empty vs No-results
7. requester switch abort/ignore stale response เพื่อไม่ให้ข้อมูล A โผล่ใน B
8. detail lookup ต้อง query id + requesterId พร้อมกันและ cross-owner = 404
9. detail fields read-only; ห้ามเพิ่ม comments/status/IT staff features

ผ่าน Phase เมื่อ:

- cross-requester list/detail ไม่มีข้อมูลรั่ว
- search/filter/sort/page tests ผ่านทั้ง boundary/default/invalid inputs
- requester switching test พิสูจน์ stale data ถูกล้าง
- desktop table และ mobile card rendering มี component tests

### Phase 5 - Attachment lifecycle end-to-end

Branch แนะนำ: `feature/lab2-attachments`

dependencies ที่คาดว่าต้องเพิ่มและต้อง review:

- server: `multer`, `@types/multer` หรือ multipart library ที่มีเหตุผลเทียบเท่า

server files แนะนำ:

- `server/src/routes/attachment.routes.ts`
- `server/src/services/attachmentStorage.ts`
- `server/src/validation/attachment.validation.ts`
- `server/tests/lab-02/attachments.api.test.ts`

client files แนะนำ:

- `client/src/components/AttachmentPicker.tsx`
- `client/src/components/AttachmentSection.tsx`
- `client/src/api/attachments.ts`
- `client/tests/lab-02/AttachmentSection.test.tsx`

งาน:

1. implement upload one file/call, client-side and server-side validation
2. safe random filename/private storage/no static bypass
3. ownership on metadata/download/remove via parent Ticket
4. active download sets safe headers
5. soft remove requires trimmed reason; never physical DELETE DB row
6. removed metadata stays in detail; actions disabled
7. removed/non-owned download returns 404
8. count only active attachments; protect 5-file limit in transaction as far as practical
9. compensation cleanup when disk/DB step partially fails
10. Create Ticket flow: create first, upload attachments after; show partial success per contract

ผ่าน Phase เมื่อ:

- valid types under/equal 5 MB pass; over 5 MB and invalid type fail
- 6th active attachment = 409
- soft-removed attachment no longer counts toward active limit
- foreign metadata/download/remove = 404 และไม่มี mutation
- filename traversal attempt ไม่หลุด storage root
- failed DB insert ไม่ทิ้ง orphan file

### Phase 6 - Zen Green reusable UI, accessibility, responsive behavior

Branch แนะนำ: `feature/lab2-zen-green-responsive`

เพิ่ม/แก้:

- `client/src/styles/theme.css`
- reusable form/button/badge/state components
- `client/src/main.tsx` import theme
- UI/style tests ที่ระบุใน `tests.md`

งาน:

1. ใช้ CSS tokens; screen ห้าม hardcode theme hex
2. editable/read-only/invalid/disabled/focus states
3. visible labels, required markers, inline errors
4. keyboard focus, icon `aria-label` + tooltip
5. responsive header/nav
6. ≥992 desktop, 768-991 tablet, <768 mobile
7. no page horizontal overflow; long attachment name truncate + accessible full name

ผ่าน Phase เมื่อ:

- style/component tests ผ่าน
- keyboard-only walkthrough ผ่าน
- automated overflow assertions ผ่านที่ 375/768/1024/1280

### Phase 7 - E2E, screenshots, visual inspection, regression

Branch แนะนำ: `test/lab2-e2e-evidence`

เพิ่ม:

- root `package.json`/script orchestration ถ้าทีมอนุมัติ
- `playwright.config.ts`
- `e2e/lab-02/requester-ticket-flow.spec.ts`
- `e2e/lab-02/responsive.spec.ts`
- `artifacts/lab-02/screenshots/create-ticket/`
- `artifacts/lab-02/screenshots/my-tickets/`
- `artifacts/lab-02/screenshots/ticket-detail/`

งาน:

1. E2E: select A → create with attachment → list → detail → download → soft remove
2. switch B แล้ว ticket A หาย; direct URL/API access ถูก reject
3. capture initial, validation, submitting, success, failure, invalid attachment, empty/no-results
4. screenshots desktop/tablet/mobile ทุก main screen
5. visual checklist no clipping/overlap/scroll
6. run all Lab 1 regression + Lab 2 unit/API/UI/E2E

ผ่าน Phase เมื่อ:

- ไม่มี skipped/only/commented tests
- screenshot paths ตรง `ui-spec.md`
- `tests.md` Final เปลี่ยนเป็น Pass เฉพาะ test ที่มี output จริง
- flaky test rerun ไม่ใช่วิธีแก้; ต้องหา root cause

### Phase 8 - Documentation, review, staged integration, submission evidence

Branch แนะนำ: `docs/lab2-release-evidence`

เพิ่ม/แก้:

- `README.md` เป็น Lab 2 setup/run/test/troubleshooting
- `docs/lab-02/reviewer.md`
- `docs/lab-02/ai-use.md`
- `docs/lab-02/tests.md` final results/traceability
- `docs/lab-02/implementation-log.md`
- PDF หลักฐาน Answer Part 1 ถึง Answer Part 9

งาน:

1. ลบข้อความ shell/commit ที่หลงอยู่ท้าย README ปัจจุบัน
2. ระบุ test DB, migration, seed, upload directory, commands
3. reviewer identity, PR links, comments/response/approval ต้องเป็นข้อมูลจริง ห้ามแต่ง
4. ai-use มี 6-10 key prompts + reflection ของเจ้าของงาน
5. ทุก issue เข้า `lab2-staging` ผ่าน reviewed PR
6. run integration บน staging แล้ว release PR `lab2-staging` → `main`
7. capture final main test output
8. ทำ submission PDF หนึ่งไฟล์ตามหัวข้อ exact order

ผ่าน Lab 2 เมื่อ Product DoD และ Course Delivery DoD ผ่านทั้งคู่เท่านั้น

## 7. GitHub Issue decomposition และ dependency

| Issue | Branch | Depends on | ผลส่งมอบ |
|---|---|---|---|
| Contract repair | `docs/lab2-contract-repair` | - | approved 4 contract docs |
| Database foundation | `feature/lab2-database-foundation` | Contract | migration, seed, test DB |
| Requester context | `feature/lab2-requester-context` | DB | requester/reference API + selector/context |
| Ticket creation | `feature/lab2-ticket-creation` | DB, context | create API/UI/tests |
| My Tickets + Detail | `feature/lab2-my-tickets-detail` | create/context | list/detail ownership |
| Attachments | `feature/lab2-attachments` | create/detail | upload/download/soft-remove |
| Zen Green responsive | `feature/lab2-zen-green-responsive` | screens | tokens/components/responsive/a11y |
| E2E evidence | `test/lab2-e2e-evidence` | all product features | E2E/screenshots/checklist |
| Release evidence | `docs/lab2-release-evidence` | E2E | final docs/main evidence/PDF |

ก่อนเริ่ม agent ต้องรัน `git status --short --branch` และยืนยัน current branch เอง เพราะ ZIP ที่ audit ไม่มี `.git`

## 8. รูปแบบ Implementation Log ที่ Coding Agent ต้องเขียนทุกครั้ง

สร้าง `docs/lab-02/implementation-log.md` แล้ว append หลังจบทุก Issue ห้ามเขียนเพียง “done”

```md
## YYYY-MM-DD - Issue <number/title>

- Branch: `<actual branch>`
- Commit/PR: `<actual commit/PR URL or pending>`
- Scope completed: `<specific behavior>`
- Requirements: `FR-..`, `BR-..`, `AC-..`

### Files changed
- `path/file.ts`: สิ่งที่เพิ่ม/แก้และเหตุผล
- `path/test.ts`: scenario ที่พิสูจน์

### Database/dependencies
- Migration: `<name or none>`
- Dependency changes: `<package + reason or none>`

### Verification run
- `<exact command>` -> `<pass/fail; count>`
- `<exact command>` -> `<pass/fail; count>`

### Evidence
- Screenshot/artifact paths: `<paths or none>`
- Red test before implementation: `<test + expected failure>`
- Green test after implementation: `<test + result>`

### Known risks / not completed
- `<explicit remaining item>`

### Next safe task
- `<one next issue>`
```

กฎการอัปเดต:

- แก้ `docs/lab-02/tests.md` column Final เป็น Pass เฉพาะเมื่อ test file มีจริงและคำสั่งรันผ่าน
- ถ้า test รันไม่ได้เพราะ DB/env ให้เขียน Blocked/Not run ไม่ใช่ Pass
- ทุก migration/dependency/new file ต้องปรากฏใน log
- ห้ามอ้าง screenshot ที่ไม่มีไฟล์
- ห้ามอ้าง PR/reviewer/approval ที่ยังไม่เกิด

## 9. Prompt พร้อมส่งให้ Coding Agent

```text
Read these files in full before changing code:
- Lab2_coding_agent_handoff_TH.md
- docs/lab-02/specification.md
- docs/lab-02/api-spec.md
- docs/lab-02/ui-spec.md
- docs/lab-02/tests.md
- Lab_02_labsheet.pdf

First run `git status --short --branch` and report the current branch. Do not work directly on main or lab2-staging. Do not implement feature code yet.

Start with Phase 0 contract repair only. List any ambiguity or conflict that remains. Apply the approved P0 decisions in the handoff, especially active Categories, ticket-number creation, Lab 2 migration, seed count consistency, unfilteredTotal, deterministic secondary sort, safe private attachment storage, real test paths, and test database setup.

After Phase 0 is approved, implement one Issue/branch at a time in Phase order. Use TDD: create the planned failing tests first, confirm the failure is for the expected missing behavior, implement the smallest correct code, then run the relevant suite and regression tests.

At the end of every Issue:
1. Update docs/lab-02/implementation-log.md with exact changed files and why.
2. State the FR/BR/AC/Test IDs completed.
3. List every migration and dependency change.
4. Show exact verification commands and actual pass/fail counts.
5. Update docs/lab-02/tests.md Final only for tests that exist and passed.
6. List anything still incomplete or blocked.
7. Review the diff for ownership leaks, hard deletes, unsafe file serving, stale Requester data, hidden skipped tests, and out-of-scope auth/IT-staff features.

Never claim Lab 2 is done while migration, DB tests, UI states, E2E, screenshots, reviewer.md, ai-use.md, README, Git workflow evidence, or final-main test evidence are missing. Ask before inventing a business rule that is not in the approved contract.
```

## 10. จุดที่ Coding Agent มีโอกาสเขียนผิดสูง - reviewer checklist

- [ ] สร้าง ticketNumber ด้วย empty string แล้วชน unique ใน ticket ที่สอง
- [ ] แก้ schema แต่ลืมสร้าง migration หรือแก้ migration เก่าที่เคยใช้แล้ว
- [ ] Query Ticket ด้วย id ก่อนแล้วค่อยเช็ก requester ใน code ทำให้มีโอกาสข้อมูลรั่ว; ควร scope ownership ใน DB query
- [ ] ส่ง 403 สำหรับ cross-owner ทั้งที่ contract กำหนด 404
- [ ] เชื่อ requesterId ว่าเป็น auth จริง หรือเผลอเพิ่ม password/session/token นอก scope
- [ ] ไม่ reject inactive Requester/Category/Related System
- [ ] เปลี่ยน Requester แล้ว response เก่าของ A มาเขียนทับหน้าของ B
- [ ] แยก Empty/No-results จาก filtered `total` อย่างเดียวโดยไม่มี unfiltered count
- [ ] sort ไม่ deterministic ทำให้ pagination ซ้ำ/หายเมื่อ timestamps เท่ากัน
- [ ] นับ removed attachments รวมใน limit 5
- [ ] hard-delete Attachment row แทน soft remove
- [ ] ซ่อน removed metadata ทั้งหมด ทั้งที่ต้องแสดงชื่อ/เหตุผล
- [ ] serve uploads ด้วย `express.static` ทำให้ bypass ownership/download rule
- [ ] ใช้ original filename เป็น disk path เกิด path traversal/overwrite
- [ ] เชื่อ MIME จาก browser อย่างเดียวและไม่ตรวจ extension/size ฝั่ง server
- [ ] upload file ลง disk แล้ว DB ล้มแต่ไม่ cleanup orphan
- [ ] Ticket create สำเร็จแต่ attachment บางไฟล์ล้ม แล้ว UI แสดง success ทั้งหมดหรือ rollback ticket ผิด contract
- [ ] ลืม Content-Disposition filename encoding
- [ ] field error ไม่มี `aria-describedby` หรือ focus ไปผิด field
- [ ] ใช้สีอย่างเดียวสื่อ priority/status
- [ ] mobile table ล้นแนวนอนหรือปุ่มต่ำกว่า 44px
- [ ] test ใช้ production/dev DB หรือ delete ข้อมูลกว้างเกิน fixture
- [ ] test ใช้ ID 1/2 แบบตายตัว ทำให้รันซ้ำ/parallel แล้ว flaky
- [ ] mark Planned เป็น Pass ทั้งที่ file ไม่มี/skip/DB ไม่ได้รัน
- [ ] เพิ่ม dependency โดยไม่บอกเหตุผลและไม่ตรวจ lockfile
- [ ] ทำ Comments, IT Priority, status changes หรือ real authentication ซึ่งอยู่นอก Lab 2

## 11. Final Definition of Done ที่ใช้ตรวจรับ

### Product completion

- [ ] FR/BR/AC contract ได้รับการอนุมัติและไม่ขัด PDF
- [ ] database ใหม่ migrate/seed ได้จากศูนย์
- [ ] active reference data และ Requester selector ครบทุก state
- [ ] Create Ticket ครบ validation/success/failure/duplicate prevention
- [ ] My Tickets ครบ ownership/search/filter/sort/pagination/empty/no-results
- [ ] Ticket Detail owned-only และ read-only
- [ ] attachments upload/metadata/download/soft-remove/removed block ครบ
- [ ] Zen Green, accessibility, desktop/tablet/mobile ครบ
- [ ] unit/API/UI/style/responsive/E2E ทุก planned test ผ่าน
- [ ] ไม่มี skipped/only/commented required tests
- [ ] README setup/test commands รันได้จริง

### Course delivery

- [ ] Issues และ Kanban final อยู่ Done
- [ ] feature branches → reviewed PRs → lab2-staging
- [ ] integration test บน staging
- [ ] release PR lab2-staging → main ได้ review/approval
- [ ] `reviewer.md`, `ai-use.md`, `tests.md`, implementation log เสร็จ
- [ ] screenshots อ่านได้และอยู่ path ตาม spec
- [ ] final test output มาจาก main
- [ ] PDF หนึ่งไฟล์ใช้หัวข้อ Answer Part 1 ถึง Answer Part 9 ตามลำดับ

## 12. สรุปสำหรับเจ้าของงาน

ของที่มีตอนนี้ควรเรียกว่า **“Lab 2 contract draft + incomplete database foundation”** ไม่ใช่ completed Lab 2 จุดเริ่มที่ปลอดภัยคือแก้ contract P0, สร้าง migration/test DB ให้ผ่านจริง แล้วค่อยเดิน requester context → create → list/detail → attachments → UI responsive → E2E/evidence ตามลำดับ
