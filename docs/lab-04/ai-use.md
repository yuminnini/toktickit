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
- **Human Review & Adjustment:** Verified that all 3 blocking review items and non-blocking polish items are resolved before PR approval into `lab4-staging`.

---

## 3. My Reflection on Specification-Agent & Coding-Agent Use

Working with an AI Specification Agent during Phase F1 provided immense clarity and structure before writing a single line of backend or frontend code:
1. **Preventing Scope Creep:** The AI agent helped strictly demarcate what is in-scope (Actions Taken parent-child records, resolution gates, authoritative dashboards) versus what is explicitly excluded by the professor (SLA clocks, email notifications, BI warehouses).
2. **Contract-First Rigor (Spec DD):** By locking down the REST API shapes, validation constraints (e.g. `followUpNote` mandatory only when `followUpRequired = true`), and the 8-state transition matrix early, we eliminated ambiguous design questions that could have caused costly rework during frontend-backend integration.
3. **Traceability as Quality Assurance:** Mapping all 28 Acceptance Criteria (AC-01 through AC-28) to concrete planned test files establishes an objective, measurable definition of done that can be validated via automated test runs on `main`.
