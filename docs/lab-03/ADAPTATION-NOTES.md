# สิ่งที่ปรับจาก pipeline ตัวอย่างให้ตรงกับไฟล์หลัก

| ประเด็น | ตัวอย่างด้านขวา | ฐาน main และแผนชุดนี้ |
|---|---|---|
| Primary ticket field | ticketNo | ticketNumber ใน DB; คง ticketNo เป็น response alias |
| Requester activation | isActive | active; ใช้ชื่อ active ต่อใน User API ใหม่ |
| Requester profile | department / updatedAt | ไม่มี department; เพิ่ม updatedAt สำหรับ User เท่าที่จำเป็น |
| IT priority / owner | ระบุว่ามีแล้ว | ยังไม่มี; เพิ่ม migration/backfill |
| Existing statuses | 3 ค่า | 5 ค่า; เพิ่มเพียง WAITING_FOR_REQUESTER, REOPENED, CANCELLED |
| Attachment fields | fileName, storedFileName, fileSize, createdAt | originalName, storedFilename, sizeBytes, uploadedAt |
| Foreign resource | 403 | 404 NOT_FOUND; role-level forbidden คง 403 |
| Removed download | 410 | 404 NOT_FOUND; repeat remove 409 ALREADY_REMOVED |
| DTO/query | อ้าง contract ของอีก repo | คง search, categoryId, requestedPriority/priority/itPriority alias, status, sort, order, page, pageSize และ unfilteredTotal |
| Theme | --zg-* | --color-* / --badge-* ตาม theme.css |
| Tablet evidence | 768 | เพิ่ม 768 และคง regression 1024 ของ main; mobile 375 / desktop 1280 |
| DB target | อ้าง 5433 และฐานที่พร้อม | example main ใช้ 5233 และยังไม่แยก test DB |
| Source status | F1/P02 In progress, old SHAs/PRs | Planned; ไม่มี Git metadata หรือ fresh runtime result |
| Lab 2 docs | docs จาก reference | เก็บ docs ของ main byte-for-byte |
| Instructions | skill path และ approval รายไฟล์จากอีก repo | self-contained; ทำ patch ใน scope เมื่อได้รับคำสั่ง implement ไม่ขออนุมัติซ้ำทุกรายไฟล์ |

ลำดับการตีความ: คำขอผู้ใช้ → requirement ใบงาน → contract Lab 3 ที่ปรับสำหรับ main นี้
→ source main/หลักฐานจริงสำหรับ legacy → เอกสารเก่าเป็นบริบท
หากพบ source กับ docs เก่าขัดกัน ให้ลงรายการและตัดสินใน F1 ไม่เปลี่ยน contract เงียบ ๆ

แพ็ก pipeline-only นี้มีเฉพาะเอกสาร pipeline, reference PDF และ manifests สำหรับเพิ่มใน repository เดิม ไม่รวม source main ซ้ำ
ไม่มี auth code, DB migration หรือ test result ที่สร้างแทน implementation
