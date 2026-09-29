# Lab 3 — หลักการรักษาฐานเดิมและหลักฐาน

ใช้กับ pipeline ที่ปรับจาก `toktickit-main (2).zip` เท่านั้น ไม่ใช่ประวัติของ repository ตัวอย่าง

## การรักษาข้อมูล

- ห้ามแก้ migration SQL เดิม 3 ชุดย้อนหลัง; เพิ่ม migration ใหม่พร้อมทดสอบ fresh/populated DB
- คง Ticket IDs/numbers/requester links, Category, RelatedSystem, Attachment metadata และ bytes เดิม
- เพิ่ม User โดยใช้ Prisma mapping กับตาราง RequesterUser เดิมตาม specification; อย่าทิ้งตารางแล้ว seed ใหม่
- backfill `itPriority = requestedPriority` เฉพาะตอนสร้างคอลัมน์ใหม่; seed ซ้ำไม่เขียนทับค่าที่คนเปลี่ยนแล้ว
- เก็บ fixture ที่มีทั้ง 5 สถานะเดิม รวม inactive requester และ removed attachment เพื่อเทียบก่อน/หลัง
- ห้ามอ้างว่ารักษาข้อมูลจริงแล้วจากการอ่าน ZIP; ZIP ไม่มีข้อมูล DB/uploads จริง

## HARNESS-01 ที่ต้องปิดใน F1/P02

- launcher ตรวจ DB URL, test marker/run ID และ upload path ก่อน import test/app และก่อน I/O
- parse URL จริงและตรวจ disposable target ที่ระบุไว้ชัดเจน; suffix `_test` อย่างเดียวไม่ใช่หลักฐาน isolation
- ห้าม fallback ไป `.env`; runner, API process, Prisma และ Playwright workers ใช้ target เดียวกัน
- พอร์ตแยก เช่น API 3103/client 5174 เป็นข้อเสนอ; ตรวจว่าว่างและ `reuseExistingServer: false`
- ส่ง `VITE_API_URL`, `DATABASE_URL`, `UPLOAD_DIR`, `PORT` อย่าง explicit; แก้ hardcoded localhost:3000
- guard ตรวจ absolute/canonical paths, root/home/dev uploads, symlink/junction escape และ ancestor overlap
- cleanup เฉพาะ IDs/files ของ run; ลงทะเบียนทันทีเมื่อสร้างสำเร็จ; report cleanup failures ไม่กลืน error
- หลักฐาน `artifacts/lab-03/screenshots/<run-id>/` ไม่ทับ artifacts/lab-02
- ทดสอบ unsafe target, missing env, worker mismatch, busy port, failed setup, aborted flow และ cleanup failure
- guard failure ต้องจบก่อนสร้าง Prisma/เปิด server/เขียนไฟล์ และระบุ Blocked แทนการ skip ให้ผ่าน

## หลักฐานและสถานะ

บันทึก implementation-log.md: phase/work package, changed files, source SHA (หรือไม่มี .git),
command, result/exit code, raw log, AC/test IDs, risks, reviewer evidence และ next step
เอกสารเก่าและภาพ Lab 2 เป็น historical evidence; ไม่ใช้ยืนยัน checkout ใหม่
การตรวจลิงก์/ZIP/hash/AC mapping เป็น package verification ไม่ใช่ application tests
