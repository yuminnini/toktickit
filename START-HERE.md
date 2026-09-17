# TokTickIT Lab 3 — pipeline สำหรับ repository เดิม

แพ็กแก้ไข: มีเฉพาะ pipeline/เอกสาร Lab 3 และใบงาน ไม่มี source client/server ซ้ำ
ใช้กับ repository ที่มีฐานจาก `toktickit-main (2).zip`

## ตำแหน่งที่ถูกต้อง

นำ contents ของ ZIP ไปเพิ่มที่ **root repository** ระดับเดียวกับ `package.json`, `client/`, `server/`
ห้ามนำ ZIP ทั้งชุดไปวางใต้ `docs/lab-03` เพราะใน ZIP มีโครงสร้าง `docs/lab-03` ให้แล้ว

```text
repository/
├── .git/                 ของ repository เดิม
├── client/               ของเดิม ไม่อยู่ใน ZIP นี้
├── server/               ของเดิม ไม่อยู่ใน ZIP นี้
├── package.json          ของเดิม ไม่อยู่ใน ZIP นี้
├── AGENTS.md
├── .antigravityrules
├── ANTIGRAVITY_LAB3_RULES_ADDENDUM.md
├── START-HERE.md
├── reference/
│   └── Lab_3_sheet.pdf
└── docs/
    ├── lab-01/           ของเดิม
    ├── lab-02/           ของเดิม
    └── lab-03/
        ├── PHASES.md
        ├── PROMPTS.md
        ├── specification.md
        ├── api-spec.md
        ├── ui-spec.md
        ├── tests.md
        └── เอกสารประกอบอื่น
```

## วิธีติดตั้งและแก้โฟลเดอร์ซ้อน

1. แตก ZIP นี้ในโฟลเดอร์ชั่วคราวก่อน
2. หากเคยวางแพ็กเต็มไว้ใน `docs/lab-03` จนมี client/server/docs อยู่ข้างใน:
   ย้ายโฟลเดอร์ `docs/lab-03` ที่ผิดตำแหน่งไปสำรอง **นอก repository** ก่อน ห้ามลบทิ้ง
   ตรวจว่างานที่ coding agent ทำต่ออยู่ในสำเนานั้นหรือไม่ แล้วรักษา/เทียบการแก้ไขเหล่านั้น
3. คัดลอก `docs/lab-03` จาก ZIP นี้ไป `repository/docs/lab-03`
4. คัดลอกไฟล์ระดับ root และ `reference/` ไป root repository ตามภาพ
   ถ้าชื่อซ้ำกับไฟล์ที่ใช้จริงแล้ว ให้เปรียบเทียบและรวมเนื้อหา ไม่เขียนทับงานใหม่โดยไม่ตรวจ
5. เปิด root repository ใน coding agent ไม่เปิด docs/lab-03 เป็น root โปรเจกต์
6. เริ่มจาก [PHASES.md](docs/lab-03/PHASES.md) และ [PROMPTS.md](docs/lab-03/PROMPTS.md)

## ลำดับอ่านและขอบเขต

อ่าน [AGENTS.md](AGENTS.md), [.antigravityrules](.antigravityrules),
[baseline.md](docs/lab-03/baseline.md), [ADAPTATION-NOTES.md](docs/lab-03/ADAPTATION-NOTES.md),
[specification.md](docs/lab-03/specification.md), [api-spec.md](docs/lab-03/api-spec.md),
[ui-spec.md](docs/lab-03/ui-spec.md) และ [tests.md](docs/lab-03/tests.md)

แผน 5 เฟส F1–F5 / P00–P14 เป็นร่างพร้อมเริ่มพัฒนา ไม่ใช่ระบบ Lab 3 ที่ implement เสร็จ
ยึด ticketNumber, active, Attachment fields, --color-* / --badge-* และ 404/409 ของ main เดิม
สถานะ implementation ในเอกสารเป็น Planned; หากทำงานต่อไปแล้วให้รักษาสถานะ/หลักฐานใหม่ของจริง
ห้ามใช้ผลทดสอบเก่าจาก source หรือ reference มาแทนผล checkout ปัจจุบัน
ก่อนรัน DB/E2E ให้ปิด HARNESS-01 เพราะ baseline example ใช้ฐานข้อมูล dev เดียวกับ test

SOURCE-MANIFEST.json เป็น hashes ของ source ZIP ที่เคยตรวจ ใช้เปรียบเทียบฐานเดิมเท่านั้น
source files เหล่านั้นไม่ได้รวมอยู่ใน pipeline-only ZIP นี้
