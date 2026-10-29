# Lab 4 AI Use Record & Reflection

## 1. Recorded LLM Models Used

- **Specification & Architecture Agent:** Google Gemini 3.8 Flash (High) via Antigravity IDE.
- **Implementation & Coding Agent:** Google Antigravity Agent (Gemini 3.8 Flash High) pair-programming in Antigravity IDE.
- **Review & Verification:** Antigravity IDE Automated Test Runner & Playwright Chromium Browser Agent.

---

## 2. Key Prompts During Development (Sprint 4)

### Prompt 1: Lab 4 Handout Analysis & Master Planning
- **Date / Model:** 2026-10-12 | Gemini 3.8 Flash (High)
- **Purpose:** Analyze the 11-page Lab 4 specification handout, extract all mandatory rules, deliverables, and create the 5-phase master plan (`Plan_lab4.md`).
- **Input Prompt:**
  > "ตอนนี้เราทำLab3 เสร็จเรียบร้อยแล้ว เราจะเริ่มทำLab4 กันโดยไฟล์ที่เราแนบไปคือassignment รายละเอียดต่างๆ ที่เราต้องทำในLab4 ตอนนี้ให้คุณอ่านก่อนยังไม่ต้องลงมือทำอะไร อ่านเสร็จแล้วแจ้งเราได้เลย"
  > "เริ่มวางแผนอย่างการแบ่งphase ว่ามีกี่phase และมีรายละเอียดอะไรบ้างในแต่ละ phase"
  > "เห็นด้วยกับการวางแผนและโครงสร้างเฟส lab4ของคุณ อยากให้คุณสร้างไฟล์ชื่อPlan_lab4 เก็บไว้ซักที่เพื่อที่จะไม่ลืมรายละเอียดแต่ละเฟสว่าต้องทำอะไรบ้าง และเวลาจะเข้ามาทำต่อให้อ่านไฟล์นี้ก่อนเริ่มทำทุกครั้งครับ"
- **Relevant Output:**
  - Complete architectural decomposition of Lab 4 into 5 Phases (F1–F5) and 15 Work Packages (P00–P14).
  - Created `Plan_lab4.md` at root as the single master roadmap.
  - Updated `AGENTS.md` and `.antigravityrules` to mandate reading `Plan_lab4.md` before starting work.
- **Human Review & Adjustment:** Verified that all 9 parts of the final PDF submission criteria (60 points) are mapped directly to corresponding phases.

### Prompt 2: Phase F1 — Baseline Verification & Engineering Contracts (P00–P01)
- **Date / Model:** 2026-10-12 | Gemini 3.8 Flash (High)
- **Purpose:** Audit the Lab 3 baseline on `main` and draft the 4 mandatory Engineering Contracts (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`).
- **Input Prompt:**
  > "เริ่มPhase F1(P00 Baseline / P01 Specification) ได้เลย"
- **Relevant Output:**
  - Audited static baseline on `main` commit `1f2e3ab` and created `docs/lab-04/baseline.md`.
  - Authored `docs/lab-04/specification.md` (FR-01 to FR-11, BR-01 to BR-14, AC-01 to AC-28, DoD, DB justifications).
  - Authored `docs/lab-04/api-spec.md` (Actions Taken endpoints, Dashboard endpoints, Workflow & OCC).
  - Authored `docs/lab-04/ui-spec.md` (Zen Green tokens, Staff & Requester Dashboards, Actions Taken forms, Responsive breakpoints, Accessibility checklist).
  - Authored `docs/lab-04/tests.md` (Full AC-to-test traceability matrix).
- **Human Review & Adjustment:** Verified that database justifications explain the separation of `actionDateTime` from `createdAt` and the compound index on `(ticketId, actionDateTime)`.

### Prompt 3: Peer Review Round 1 & Round 2 Contract Refinement
- **Date / Model:** 2026-10-12 | Gemini 3.8 Flash (High)
- **Purpose:** Address Peer Review feedback on `codex/lab4-p00-p02-baseline-contracts`, finalizing Decisions D2–D7, role alignment, and contract precision.
- **Input Prompt:**
  > "เพื่อนเรารีวิวอีกรอบ ดังนี้: รีวิวรอบ 2 (commit 2d76ec4) ... ยังเหลือ 3 เรื่องก่อน approve: 1. Decision D2–D7 ยังเป็น TBD ... 2. D6 ยัง TBD แต่ spec เขียนเหมือนตัดสินแล้ว ... 3. ตาราง endpoint ใน api-spec.md §5 อ้างเลขบรรทัดและ role ผิด ..."
- **Relevant Output:**
  - Finalized Decisions D1–D7 in `specification.md` §11 (D1 baseline matrix, D2 $\ge 1$ Action Taken for Resolve, D3 omit `resolutionNote`, D4 author/Admin edit, D5 lock on Resolve/Closed/Cancelled, D6 Admin status permission, D7 OCC on Actions Taken).
  - Reconciled D6 route roles across `specification.md` (§2, FR-04, BR-09) and `api-spec.md` (§4.1 & §5).
  - Stripped line numbers from `api-spec.md` §5 table and corrected roles.
  - Consolidated documentation roadmap to `Plan_lab4.md`.
- **Human Review & Adjustment:** Verified that all review items are resolved and documented in `reviewer.md` under PR #49 before approval into `lab4-staging`.

### Prompt 4: Peer Review Round 3 Approval & Issue #48 Linking
- **Date / Model:** 2026-10-12 | Gemini 3.8 Flash (High)
- **Purpose:** Record Peer Review Round 3 approval, link Issue #48 to PR #49, and document F2 notes for AC-27/D2 regression tests.
- **Input Prompt:**
  > "เพื่อนเรารีวิวแล้วครับ: รีวิวรอบ 3 (commit 36f3cef) — Approve ... ขอให้ผูก Issue ผ่าน Development panel แล้วใส่เลขใน reviewer.md ก่อน merge ... เราผูกdevelopment panel แล้ว เลข#48"
- **Relevant Output:**
  - Linked GitHub Issue #48 to PR #49 in `reviewer.md`.
  - Updated F1 status to `Approved (Ready to Merge)` in `reviewer.md`.
  - Documented prerequisite fixture requirements for Lab 3 tests (`staff-ticket-detail.api.test.ts:399, 508`) under D2 (`ACTION_REQUIRED`) for Phase F2 implementation.
### Prompt 5: Phase F2 — Database Increment & Actions Taken Backend (P03–P05)
- **Date / Model:** 2026-10-18 | Gemini 3.8 Flash (High)
- **Purpose:** Execute Phase F2 (Issue #50): Prisma migration for `ActionTaken`, idempotent seed data (AC-26), Actions Taken REST API & Authorization (AC-01 to AC-09, AC-22), and Ticket Workflow Resolution Gate & OCC (AC-10 to AC-15).
- **Input Prompt:**
  > "สวัสดีครับ เนื่องจากเพื่อนเราได้รีวิวและกดmerge F1 ให้แล้ว ลิ้งก์นี้ https://github.com/yuminnini/toktickit/pull/49 ต่อไปเราจะเริ่มทำF2 กัน โดยจะเริ่มจากการสร้างnew issueก่อน อยากให้คุณบอกวิธีสร้างnew issue พร้อมบอกtitle and description ด้วย"
  > "เราสร้างแล้วโดยเลขคือ#50 แล้วลากมันอยุ่ในช่องstarted แล้วต่อไปตาคุณจัดการต่อได้"
- **Relevant Output:**
  - Fast-forwarded `lab4-staging` from merged PR #49 (`9df3c6c`) and created branch `codex/lab4-p03-p05-actions-taken-backend`.
  - Added `ActionTaken` model in `server/prisma/schema.prisma` with compound index on `[ticketId, actionDateTime]`, `performedById`, and `version` (Decision D7).
  - Created migration `20261018000000_lab4_actions_taken` and deployed to dev and test databases.
  - Implemented idempotent seed data with tickets spanning 0, 1, and multiple Actions Taken, plus backfill for existing closed/resolved tickets (AC-26).
  - Implemented `server/src/routes/actions.ts` (`GET/POST /api/tickets/:id/actions`, `PATCH /api/actions/:id`), auto-binding actor, validating follow-up notes, enforcing Decision D4 (Author/Admin edit only) and Decision D5 (`400 TICKET_LOCKED` on resolved/closed/cancelled).
  - Updated `server/src/routes/staff.ts` status transition to enforce Decision D2 (`400 ACTION_REQUIRED` when resolving with 0 actions) and Decision D6 (`requireRole("IT_STAFF", "ADMINISTRATOR")`).
  - Added comprehensive automated API tests (`server/tests/lab-04/actions-taken.api.test.ts`, `ticket-workflow.api.test.ts`, `seed.integration.test.ts`) passing 17/17 tests, while full regression suite passed 100% (273 total passing tests across server and client).
- **Human Review & Adjustment:** Verified that all 15 ACs for Phase F2 are green with zero regression on Lab 1–3 suites.

### Prompt 6: Phase F2 Peer Review Rounds 1 & 2 and Phase F3 — Authoritative Dashboard Backend (P06–P07)
- **Date / Model:** 2026-10-29 | Gemini 4 Argon (Medium)
- **Purpose:** Resolve Round 2 peer review on PR #51 (returning `403 FORBIDDEN` on inactive staff session while immediately revoking the session in DB, and handling `{ followUpNote: null, expectedVersion: 1 }` when `followUpRequired` is already `false`), then implement Phase F3 (Issue #52): Requester Dashboard (`GET /api/dashboard/requester`) and IT Staff/Admin Dashboard (`GET /api/dashboard/staff`).
- **Input Prompt:**
  > "เพื่อนส่งรีวิวมาอีกครั้งครับ Verified Fixes from Round 1 ... Remaining Issues to Address Before Approval: 1. [P1] Inactive Staff Mutation Returns 401 Instead of 403 FORBIDDEN ... 2. [P2] PATCH /api/actions/:id With { followUpNote: null, expectedVersion: 1 } When followUpRequired is Already false"
  > "เพื่อนของเรากดmergeเรียบร้อยแล้ว พร้อมทำF3ต่อเลยครับ โดยจะให้สร้างnew pull requestกับnew issue ก่อน"
- **Relevant Output:**
  - Resolved PR #51 Round 2 items (`694f2a7`) and merged into `lab4-staging` (`00bf767`).
  - Created Issue #52 and feature branch `codex/lab4-p06-p07-dashboard-backend`.
  - Followed TDD (Red → Green): wrote `server/tests/lab-04/requester-dashboard.api.test.ts` (T16, T17, T22) and `server/tests/lab-04/staff-dashboard.api.test.ts` (T19, T21, T22), observed 404 failures, then implemented `server/src/routes/dashboard.ts` and mounted at `/api/dashboard` in `server/src/app.ts`.
  - Verified all 29 server test suites (197 tests) pass 100%.
- **Human Review & Adjustment:** Confirmed strict requester data isolation, 8-status & 3-priority aggregations for IT Staff, and `userStats` extension exclusively for Administrators.

---

## 3. My Reflection on Specification-Agent & Coding-Agent Use

Working with an AI Specification Agent and Coding Agent across Phases F1 and F2 demonstrated the power of Specification-Driven and Test-Driven Development:
1. **Preventing Scope Creep:** The AI agent helped strictly demarcate what is in-scope (Actions Taken parent-child records, resolution gates, authoritative dashboards) versus what is explicitly excluded by the professor (SLA clocks, email notifications, BI warehouses).
2. **Contract-First Rigor (Spec DD):** By locking down the REST API shapes, validation constraints (e.g. `followUpNote` mandatory only when `followUpRequired = true`), and the 8-state transition matrix early, we eliminated ambiguous design questions that could have caused costly rework during backend implementation.
3. **Traceability & Regression Shield (Test DD):** By observing meaningful failing tests before implementing the Prisma model and routes, and verifying both new Lab 4 suites and previous Lab 1–3 suites pass 100% (187 server tests + 86 client tests = 273 total passing tests), we guaranteed zero regression and absolute compliance with engineering contracts.
