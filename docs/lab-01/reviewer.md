# Lab 1 — Peer Review Record

**Author:** รพีพิชชา วราสินกุลภัทร์ 67070501036 — GitHub: @yuminnini
**Peer reviewer:** พงศธร พุทธสอน 67070501084 — GitHub: @JinggXd

## Pull Requests I authored (reviewed by my partner)
| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| #5 | feature/1-project-foundation | Approved |
| #7 | feature/2-health-check | Approved  |
| #8 | feature/3-category-seed | Approved  |
| #9 | feature/4-category-list | Approved |

Issue 1: Project foundationฺ- #5

- Reviewer comment I received:
ขั้นตอน setup ครบ

-Prerequisites (Node.js 18+, Docker)
-รัน Postgres ผ่าน Docker (docker run ) โดย map พอร์ตเป็น 5233 เพราะ5322ติดของเก่าจากเทอมที่แล้ว
-วิธี install dependency ทั้งฝั่ง client และ server
-วิธี copy env ทั้งสองฝั่ง รวมถึงจุดที่ต้องแก้ port ใน DATABASE_URL ให้ตรงกับ Docker
-คำสั่ง npx prisma generate
-คำสั่งรัน dev ทั้งสองฝั่ง (client: 5173, server: 3000)
-คำสั่งรันเทส (vitest run)
-ปิด gap เรื่อง README ไม่มี setup instructions ที่ค้างจากรอบรีวิวก่อนหน้าเรียบร้อย ตอนนี้ Issue 1 (project foundation) ผ่านครบทุกข้อแล้ว:

-React + TS + Vite frontend รันได้
-Bootstrap ติดตั้งและเห็นผลจริง
-Express + TS backend รันได้
-Postgres reachable, Prisma initialized
-Vitest/Supertest ตั้งค่าไว้แล้ว
-gitignore + env.example ครบ
-README มีขั้นตอน setup ชัดเจน
-ลองให้แชร์จอดูผลเทสก็ผ่านตามissue1
-รันเทสหมดแล้วผ่านหมดครับลองดูจากแชร์สรีนแล้วครับ
- How I responded: Thank you for your review.

Issue 2: API health check- #7

- Reviewer comment I received:
Route คืน 200 + JSON ตรง (status: "ok", service: "TokTickIT API")
Supertest ผ่าน (health.test.ts เขียวแล้ว จาก stub 501 → ทำงานจริง)
ฝั่ง client ดึงสถานะจาก API จริง ไม่ hardcode ตามในใบแล็ป
error message ตอน backend ล่ม ทำ normalize ทั้งกรณี network fail กับ non-2xx ให้ขึ้นข้อความเดียวกัน ("Unable to connect to TokTickIT API") — ตรงตามเกณฑ์ "useful error message" แล้ว
- How I responded: Thank you for your review.

Issue 3: Category model + seed- #8

- Reviewer comment I received:
Category model (id, unique name, createdAt) ครบ 3 field ตาม schema
2 Migration สร้างตาราง มี migration folder + SQL จริง
3 Seed insert 4 categories ชื่อครบ 4 ตัว ผ่าน Prisma Studio
4 Seed idempotent (รันซ้ำไม่พัง) ใช้ upsert() + ยืนยันด้วยการรันซ้ำ 2 รอบจริง ยังได้ 4 rows ไม่ error
5 ไม่ commit credentials.env ไม่เคย commit มีแค่ .env.example
- How I responded: Thank you for your review.

Issue 4: Display the IT request category list- #9
- Reviewer comment I received: 
ทดลองเรียก GET /api/categories พบว่าดึงข้อมูลหมวดหมู่จาก PostgreSQL ผ่าน Prisma มาใช้งานจริง
ตรวจสอบ response พบว่าส่งค่า id และ name ของแต่ละหมวดหมู่มา เรียงลำดับตาม id จากน้อยไปมากอย่างถูกต้องและคงที่ทุกครั้ง
รันไฟล์ทดสอบ categories.test.ts (Supertest) ในเครื่อง ผ่านทุกกรณี ยืนยันว่า endpoint ทำงานตรงตามที่คาด
ตรวจโค้ดฝั่ง React ใน api.ts / App.tsx พบว่าดึงข้อมูลหมวดหมู่จาก API จริง ไม่ใช่ค่าที่ hardcode ไว้เป็น array ตายตัว
ทดลองปิด/เปิดการเชื่อมต่อ backend พบว่ามีสถานะ loading ระหว่างรอข้อมูล และขึ้นข้อความ error/offline เมื่อเชื่อมต่อไม่ได้ ครบทั้งสองกรณี
รันไฟล์ทดสอบ App.test.tsx (Vitest) ที่ mock ฟังก์ชัน checkSystem ด้วย vi.spyOn ในเครื่อง ผ่านทุกกรณี
ดึงโค้ดจาก branch มารันคำสั่ง npx vitest run ทั้งฝั่ง client/ และ server/ พบว่าผ่านทุก test ไม่มี .todo ค้างอยู่
รันแอปในเครื่อง เปิด backend + DB แล้วกดปุ่ม "Check System" พบว่าแสดงหมวดหมู่ครบ 4 รายการ (Account and Access, Hardware, Software, Network) เรียงลำดับถูกต้องตรงตามที่กำหนด
ปิด backend แล้วกด "Check System" อีกครั้ง พบว่าขึ้นสถานะ Offline พร้อมข้อความแจ้งเตือนที่เข้าใจง่าย ไม่มีแอปค้างหรือ crash
- How I responded: Thank you for your review.

## Pull Requests I reviewed for my partner
My comment: Issue 1 — Project foundation (feature/1-project-foundation)

เพื่อนทำอะไรไปบ้าง:

Setup repo + branch ครบ (main → lab1-staging → feature/*)
ตั้ง PostgreSQL ผ่าน Docker, เชื่อมต่อ Prisma สำเร็จ
Client (React+Vite+Bootstrap) และ Server (Express+TS) รันได้ทั้งคู่
เขียน README.md (setup instructions ครบ)
Acceptance criteria verification:

Criteria	ผล	หลักฐาน
React+TS+Vite frontend starts	✅	รัน npm run dev เห็นหน้า Bootstrap จริง
Bootstrap installed/visible	✅	ปุ่ม/ฟอนต์สไตล์ Bootstrap ขึ้นจริง
Node+Express+TS backend starts	✅	รันที่ localhost:3000
PostgreSQL reachable + Prisma initialized	✅	npx prisma db pull ต่อสำเร็จ (error P4001 DB ว่าง ไม่ใช่ P1000 auth fail)
Vitest/Supertest configured	✅	คำสั่งเทสรันได้ทั้ง client/server
.gitignore + .env.example, ไม่ commit secrets	✅	เช็คแล้วไม่มี .env ใน git
README setup instructions	✅	เขียนครบแล้ว
Overall: ทำถูกต้อง ครบทุก criteria ของ issue 1. Approving.
Partner's response: Thankyou kupppp

My comment: Issue 2 - API Health Check
เพื่อนทำอะไรไปบ้าง:

server/src/app.ts: /api/health ตอบ 200 + {status:"ok", service:"TokTickIT API"}
client/src/api.ts: checkSystem() เรียก API จริง
client/src/App.tsx: แสดง Online/Offline จาก API call จริง
Acceptance criteria verification:

Criteria	ผล	หลักฐาน
GET /api/health returns 200	✅	Manual check ที่ localhost:3000/api/health
JSON body ถูกต้อง	✅	Supertest + manual check
Supertest verify endpoint	✅	health.test.ts PASS
React แสดงสถานะจาก API จริง	✅	กด Check System → "System Status: Online"
Error message เมื่อ backend ไม่พร้อม	✅	ปิด server → "System Status: Offline"
Test output:

✓ tests/lab-01/health.test.ts (1)
Test Files  1 passed | 1 skipped (2)
Overall: Looks good ทำครบทุก Issue 2 acceptance criteria. Approving.

Nice work 👍
Partner's response: Thankyou kupppp

My comment: Issue 3 — Category model + seed (feature/3-category-seed)

เพื่อนทำอะไรไปบ้าง:

เพิ่ม Prisma model Category (id, name unique, createdAt)
รัน migration สร้างตารางสำเร็จ
เขียน seed ด้วย upsert (idempotent)
Acceptance criteria verification:

Criteria	ผล	หลักฐาน
Prisma model ถูกต้อง	✅	ตรงตาม spec เป๊ะ
Migration สร้างตาราง	✅	"Your database is now in sync with your schema"
Seed ใส่ 4 หมวดถูกต้อง	✅	Query จริงเห็น Account and Access, Hardware, Software, Network
Seed idempotent	✅	รัน seed 2 รอบ ยังเจอแค่ 4 แถวเท่าเดิม
DB credentials ไม่ commit	✅	.env ไม่เคย commit
Overall: ทำดีมาก ทำครบทุก criteria. Approving. 👍
Partner's response: Thankyou kupppp

My comment: Issue 4 — Category list (`feature/4-category-list`)

**เพื่อนทำอะไรไปบ้าง:**
- `server/src/app.ts`: เพิ่ม `GET /api/categories` (ดึงจาก Prisma เรียงตาม id)
- `client/src/api.ts`: `checkSystem()` ดึง categories ต่อจาก health check
- `client/src/App.tsx`: แสดง category list จริงบนหน้าเว็บ
- Implement เทสที่เคยเป็น `.todo` ครบทั้ง server และ client

**Acceptance criteria verification:**

| Criteria | ผล | หลักฐาน |
|---|---|---|
| GET /api/categories ดึงจาก Prisma | ✅ | endpoint คืนค่าจริงจาก DB |
| คืนค่าเรียงตาม id | ✅ | ตรงตาม `orderBy: {id:"asc"}` |
| Supertest verify | ✅ | `categories.test.ts` PASS |
| React แสดงจาก API จริง (ไม่ hard-code) | ✅ | list render จาก `categories.map()` |
| Loading/error state | ✅ | ทดสอบ manual ในเบราว์เซอร์ |
| Vitest verify UI behavior | ✅ | 2 เทส mock success/error ผ่านหมด |

**Test output:**
```
server:  ✓ categories.test.ts  ✓ health.test.ts   → 2 passed (2)
client:  ✓ heading  ✓ Online+categories  ✓ Offline error   → 3 passed (3)
```
Overall: ทำครบทุก criteria โดยรวมดีมาก ไม่มีปัญหา
Partner's response: Thankyou kupppp
