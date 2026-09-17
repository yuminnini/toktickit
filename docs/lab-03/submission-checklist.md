# Lab 3 submission checklist — Planned

ส่ง PDF เดียว ใช้หัวข้อ Answer Part 1 ถึง Answer Part 9 ตามลำดับต่อไปนี้
เอกสารนี้คือ checklist เท่านั้น ยังไม่ใช่ PDF ส่งงานหรือหลักฐานการทำระบบเสร็จ

| Heading | Points | Evidence required |
|---|---|---|
| Answer Part 1 | 10 | Git history feature → lab3-staging → main, final Kanban Done, reviewer identity/PR/comments/responses/approval, README/.gitignore/tree |
| Answer Part 2 | 5 | specification.md พร้อม FR/BR/role matrix/AC/migration/DoD และหลักฐานว่ามีก่อน implementation merge |
| Answer Part 3 | 10 | tests.md planned tests/AC mapping/actual file paths/final results; full unit/API/UI/security/regression/E2E output จาก final main |
| Answer Part 4 | 5 | ai-use.md ระบุ LLM จริง, key prompts 6–10 รายการ และ My Reflection ของนักศึกษา |
| Answer Part 5 | 5 | login valid/invalid/inactive, loading/safe errors, initial password change, role shell/logout/blocked deep link |
| Answer Part 6 | 5 | Staff Queue realistic data/search/filters/sort/paging/owners/badges/detail/empty/no-results/failure/responsive |
| Answer Part 7 | 10 | Staff Detail claim/reassign/priority/status/comments/notes/attachments/requester indication/role controls/direct API evidence |
| Answer Part 8 | 5 | Admin list/search/role/create/edit/reset/duplicate/safety/non-admin denial/responsive/safe errors |
| Answer Part 9 | 5 | ui-spec.md และ desktop/tablet/mobile major screens, completed visual checklist |

## Final gate

- [ ] 56 AC มีผลจริงและ test file ที่มีอยู่ ไม่ใช่เพียง planned paths
- [ ] ผล suites ผูกกับ final main SHA หลัง merge; ถ้า source เปลี่ยนให้ทดสอบที่เกี่ยวข้องใหม่
- [ ] raw logs ไม่มี secrets และ screenshots อ่านได้โดยไม่ zoom มาก
- [ ] ลิงก์ repository/PR/Issue/project/docs/evidence เปิดได้และตรงของทีมจริง
- [ ] ใส่ peer reviewer identity และ approval/merge ที่ตรวจสอบได้
- [ ] ไม่มี credentials/real password ใน repo/PDF; local demo credential guide แยกจาก secrets
- [ ] My Reflection เป็นข้อความจากนักศึกษาและ prompts ใช้งานจริง
- [ ] PDF มี Answer Part 1–9 ครบและเรียงถูก รวม 60 คะแนน
- [ ] เปิด PDF ตรวจทุกหน้าก่อนส่ง: ไม่มีภาพ/ตาราง/ข้อความถูกตัด
