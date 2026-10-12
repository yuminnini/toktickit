# Lab 4 Peer Review Evidence

- **Status:** In Progress (Phase F1: Baseline, Contracts & Test Harness)
- **Base Branch:** `lab4-staging`
- **Target Main Branch:** `main`

| Work Package / Issue | PR / Base Branch | Reviewer Identity | Comments and Response | Approval | Merge SHA | Status |
|---|---|---|---|---|---|---|
| **Phase F1 (P00–P02)** / Issue #1 | PR #1 (`codex/lab4-p00-p02-baseline-contracts` → `lab4-staging`) | Peer Reviewer | **Review Round 1 (Commit `2d76ec4`):**<br>- *Feedback:* Fixed status endpoint path (`/api/staff/tickets/:id/status`, `currentStatus`), baseline transition matrix adopted (D1 Option A), fixed clickable `file:///` links, aligned FR-05 and T12, updated dashboard fields and drill-down URLs.<br>- *Response:* Resolved and pushed to origin.<br><br>**Review Round 2:**<br>- *Feedback:*<br>1. Decisions D2–D7 must be resolved before F2.<br>2. Align D6 role across spec and API contract.<br>3. Remove line numbers from table §5 in `api-spec.md` and set role of staff detail to `IT_STAFF, ADMINISTRATOR`.<br>4. Non-blocking items: Zen green `--color-primary: #006B3C`, `actionDateTime` past-only constraint, T23 responsive to Playwright, T26 seed test separate file, consolidated `Plan_lab4.md`.<br>- *Response:* All items resolved; D2–D7 decided and documented in `specification.md` §11; endpoint tables and roles aligned; `docs/lab-04/PHASES.md` consolidated into `Plan_lab4.md`. | Pending Approval | — | In Progress |
| **Phase F2 (P03–P05)** / Issue #2 | PR #2 (`codex/lab4-p03-p05-actions-taken-backend` → `lab4-staging`) | Peer Reviewer | (Pending Implementation) | Pending | — | Planned |
| **Phase F3 (P06–P07)** / Issue #3 | PR #3 (`codex/lab4-p06-p07-dashboards-backend` → `lab4-staging`) | Peer Reviewer | (Pending Implementation) | Pending | — | Planned |
| **Phase F4 (P08–P11)** / Issue #4 | PR #4 (`codex/lab4-p08-p11-frontend-dashboards` → `lab4-staging`) | Peer Reviewer | (Pending Implementation) | Pending | — | Planned |
| **Phase F5 (P12–P14)** / Release | PR #5 (`lab4-staging` → `main`) | Maintainer / Reviewer | (Pending Final Release) | Pending | — | Planned |

---

> **Peer Review Protocol:**  
> - ทุก PR ต้องมี reviewer เป็นบุคคลจริงที่ทำการตรวจโค้ดและ comment  
> - ผู้พัฒนาแก้ไขข้อเสนอแนะจน reviewer approve ก่อนทำการ merge เข้า `lab4-staging`  
> - บันทึก PR links, comments, fixes, และ merge SHA จริงลงในตารางนี้เสมอ
