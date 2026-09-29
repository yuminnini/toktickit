# Baseline — static inspection of supplied main ZIP

วันที่ตรวจ: 2026-09-17. Source: `toktickit-main (2).zip` จำนวน 93 files
ไม่มี `.git` จึงไม่ยืนยัน SHA/branch/remote, working tree, PR หรือ live data counts
SHA-256 ของ source ZIP ที่ตรวจอยู่ใน `SOURCE-MANIFEST.json` ที่ root; pipeline-only ZIP ไม่ได้รวม source เหล่านี้

## โครงสร้างจริง

- React 18 + TypeScript + Vite + React Router + Bootstrap; Express + Prisma 5 + PostgreSQL
- Backend routes อยู่ใน `server/src/app.ts` ยังไม่ได้แยก controller/service/auth middleware
- `server/src/prisma.ts` ใช้ `getPrisma()` แบบ lazy singleton
- `server/src/index.ts` อ่าน `PORT` จาก process env; ไม่มี dotenv loader ใน dev entry
- Requester identity ดึง header → query → body ใน `extractRequesterId`; ไม่ใช่ authentication
- Frontend routes: `/requester-selection`, `/check-system`, `/my-tickets`, `/tickets/new`, `/tickets/:id`
- `RequesterContext.tsx` และ `RequesterRouteGuard.tsx` ใช้ development selector
- tests ที่พบ: server 11 files, client 10 files, E2E 2 files
  จำนวนนี้คือ file inventory ไม่ใช่จำนวน tests ที่ Pass

## Data model

| ส่วน | มีอยู่จริง | งานเพิ่ม Lab 3 |
|---|---|---|
| RequesterUser | id, name, email unique, active, createdAt | mapped User, role, passwordHash, mustChangePassword, sessionVersion, updatedAt |
| Ticket | ticketNumber, requesterId, categoryId, relatedSystemId, summary, description, requestedPriority, currentStatus, timestamps | itPriority, ticketOwnerId, version, appearsResolvedAt/ById |
| Status | NEW, OPEN, IN_PROGRESS, RESOLVED, CLOSED | WAITING_FOR_REQUESTER, REOPENED, CANCELLED |
| Attachment | originalName, storedFilename unique, mimeType, sizeBytes, uploadedAt, removedAt, removalReason | คงชื่อและ metadata; ไม่เพิ่ม uploadedByRequesterId โดยอ้างว่ามีอยู่แล้ว |
| Category / RelatedSystem | Category name; RelatedSystem.active | คงข้อมูลและ foreign keys |
| Authentication / communications | ไม่มี | Session, PublicComment, InternalNote |

Migration directories จริง:
- `20260815141221_add_category`
- `20260830151713_lab2_ticketing_foundation`
- `20260831110621_attachment_stored_filename_unique`

Seed code ระบุ 4 categories, 7 related systems, 4 active และ 1 inactive Requester
นี่คือ seed definitions ไม่ใช่จำนวนแถวจริงในฐานข้อมูล

## Harness findings ที่ต้องทำใน P02

1. `server/.env.test.example` ชี้ localhost:5233/toktickit ซึ่งเป็น dev target เดียวกัน
2. `server/vitest.config.ts` fallback จาก .env.test ไป .env เมื่อไม่มี DATABASE_URL
3. Playwright ใช้ API 3000/client 5173 และ `reuseExistingServer: true`; E2E hardcode localhost:3000
4. E2E ใช้ requester IDs คงที่และ sessionStorage; responsive setup จับ error แล้ว fallback ID 1
5. responsive screenshots เขียน `artifacts/lab-02/screenshots/` และมี mkdir ตอน module import
6. attachments API test มี temp uploads แล้ว แต่ cleanup กลืน error และยังไม่มี guard ครอบทุก suite
7. ต้องตรวจ fixture registration/cleanup ทุกเส้นทาง รวม create-ticket และ E2E ไม่อาศัย shared seeded IDs
8. `.gitignore` เดิมไม่ครอบ `.env.test` ด้วยรูปแบบ `.env`/`*.env`; เพิ่ม ignore env variants
   พร้อม allow example files ใน patch ของ P02 ก่อนมี test secrets
9. dev entry ไม่โหลด `.env` อัตโนมัติ: launcher ต้องส่ง env ก่อนสร้าง Prisma; อย่าสรุปว่า copy .env แล้วพอ

## ผลการตรวจครั้งนี้

- อ่าน schema/routes/client API/styles/test configuration และใบงาน; ตรวจ hash source สำเนา
- ไม่รัน npm install/build/test, Docker, DB migration/seed หรือ network workflow
- ไม่รับผล 107 tests / commit / Docker status ของแพ็กตัวอย่างมาเป็นผลของ main นี้
- เมื่อถึง P00 ให้บันทึกผล runtime ใหม่หลังปิด safety gate ที่เกี่ยวข้อง
