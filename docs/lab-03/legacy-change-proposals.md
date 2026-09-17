# Planned minimal changes to existing main

เอกสารนี้ระบุ impact เพื่อเริ่ม implementation ไม่ใช่รายงานว่า patch ถูกทำแล้ว
เมื่อผู้ใช้สั่ง implement ใน scope นี้ ให้ดำเนินการตามงานโดยไม่ขออนุมัติรายไฟล์ซ้ำ

| Phase | Files / area | Needed change | Regression evidence |
|---|---|---|---|
| F1/P02 | server/vitest.config.ts, playwright.config.ts, E2E fixtures, test cleanup, .gitignore | strict isolated env/ports/paths, no .env fallback/reuse, ignore secret env variants | HARNESS-01 + baseline business tests |
| F2/P03 | schema.prisma, new migration, seed.ts, tests | User mapping, add fields/statuses/relations, provisioning/idempotence; replace Prisma accessor | DATA-ALL; legacy ID/FK/bytes comparison |
| F2/P04–05 | server/src/app.ts, new auth modules, server/package*.json | session/CSRF/RBAC/credentials; remove dev identity trust; dependencies chosen in contract | AUTH/RBAC/CSRF matrix |
| F2/P06 | client/src/api.ts, App.tsx, main.tsx, RequesterContext/guards/AppShell | credentials, AuthContext, role navigation, remove selector/sessionStorage | AUTH-UI/AUTH-E2E; requester integration |
| F3/P07 | existing requester pages/components/API and tests | session ownership and new safe DTO; preserve category string/list metadata; remove storedFilename leakage | REQUESTER-UI + 404/409/bytes |
| F3/P08–10 | server routes/services, client staff pages, Badge/theme | queue/operations/communication, 3 new status badges; --color-* retained | QUEUE/OPS/MSG/RACE suites |
| F4/P11 | user service/admin UI | admin invariants/revocation/unassign | ADMIN-E2E/RACE-01 |
| F4/P12 | tests/E2E/artifacts | full regression and new screenshot paths | complete AC mapping + visual review |
| F5/P14 | README/docs | update actual setup/results/links and submission | documentation review against final main |

Intentional compatibility changes: authentication errors become 401; selector removed; reference data protected;
generic detail stops leaking storedFilename/ticketId in attachment DTO; 3 additional status values supported.
All are explicit plan items, not silent rewrites. Physical schema fields and original source in this ZIP remain unchanged.
