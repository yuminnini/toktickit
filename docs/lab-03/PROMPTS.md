# ข้อความพร้อมส่งให้ coding agent

ข้อความด้านล่างเป็นคำสั่งสำหรับใช้ในอนาคต ไม่ใช่คำสั่งที่แพ็กนี้ดำเนินการไปแล้ว

## เริ่ม F1

```text
ช่วยเริ่ม Lab 3 จาก root repository นี้ โดยใช้ pipeline ใน docs/lab-03 และยึดโค้ด main ของ repository เป็นฐาน
อ่าน START-HERE.md, AGENTS.md, .antigravityrules, baseline.md, ADAPTATION-NOTES.md,
PHASES.md และ specification/api-spec/ui-spec/tests ใน docs/lab-03 ให้ครบ
เริ่ม F1/P00–P02: ตรวจ checkout และ environment จริง, review contract ที่ปรับ main,
ทำ test harness ให้แยก DB/uploads/API/client/workers ก่อนรัน DB/E2E tests
รักษา source ที่ผู้ใช้แก้ไว้และ legacy contracts ที่ระบุในแผน
อนุญาตแก้ไฟล์เดิมเท่าที่จำเป็นภายใน scope F1 พร้อมบันทึก impact และ verification
ห้ามใช้ผลเก่าหรือสถานะจากแพ็กตัวอย่างแทนผลปัจจุบัน; บันทึกผลจริงใน implementation-log.md
ทำงาน local ก่อน การ push/merge หรือส่งข้อความหา reviewer ต้องมีคำสั่งแยก
```

## ต่อ F2

```text
ทำ F2/P03–P06 ตาม contracts ใน docs/lab-03 หลังยืนยัน exit gate F1
เพิ่ม migration/seed/credentials/session/RBAC/auth UI บน client/server เดิม
ใช้ User mapped to RequesterUser เพื่อรักษา IDs และ ticketNumber; เพิ่ม itPriority/owner ที่ยังไม่มี
ทำตาม tests.md แบบ Red/Green และรัน regression บน environment แยก
บันทึกผลจริงและข้อค้าง ไม่อ้างว่า peer review เสร็จถ้าไม่มีหลักฐาน
```

## ต่อ F3

```text
ทำ F3/P07–P10 หลังผ่าน F2: requester regression, Staff Queue, claim/reassign/priority/status,
Public Comments/Internal Notes และ appears-resolved ตาม role matrix/expectedVersion
รักษา foreign/removed download 404 และ double-remove 409 ของ main
ใช้ --color-* / --badge-* และ components เดิม; ทดสอบ API/UI/security/concurrency/flow จริง
```

## ต่อ F4

```text
ทำ F4/P11–P12 หลังผ่าน F3: minimalist Admin Users และ full integrated verification
ทดสอบ self/last-admin safety พร้อม race, reset/session invalidation/owner unassignment
รัน original adapted suites และ Lab 3 suites ครบ; ตรวจ responsive 375/768/1024/1280 และภาพจริง
เก็บ raw logs/run ID/source SHA; report Not run/Blocked ตรงไปตรงมา
```

## F5: เตรียม review และส่งงาน

```text
เตรียม F5/P13–P14 ตาม submission-checklist.md: ตรวจ Issue/PR/reviewer evidence ที่มีจริง,
เตรียม release lab3-staging → main สำหรับ reviewer และรวบรวมเอกสาร Answer Part 1–9
อย่า merge หรือส่งข้อความหาใครโดยไม่มีคำสั่งให้ทำ เมื่อ merge จริงแล้วให้ทดสอบ final main SHA
ถ้ายังไม่มี merge/ผล main/reflection ให้ระบุค้าง ห้ามแต่งหลักฐานหรือ reflection แทนนักศึกษา
```
