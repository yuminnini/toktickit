# Lab 4 Peer Review Evidence

- **Status:** In Progress (Phase F2: Database Increment & Actions Taken Backend)
- **Base Branch:** `lab4-staging`
- **Target Main Branch:** `main`

| Work Package / Issue | PR / Base Branch | Reviewer Identity | Comments and Response | Approval | Merge SHA | Status |
|---|---|---|---|---|---|---|
| **Phase F1 (P00–P02)** / Issue #48 | PR #49 (`codex/lab4-p00-p02-baseline-contracts` → `lab4-staging`) | Peer Reviewer | **Review Round 1 (Commit `2d76ec4`):**<br>- *Feedback:* Fixed status endpoint path (`/api/staff/tickets/:id/status`, `currentStatus`), baseline transition matrix adopted (D1 Option A), fixed clickable `file:///` links, aligned FR-05 and T12, updated dashboard fields and drill-down URLs.<br>- *Response:* Resolved and pushed to origin.<br><br>**Review Round 2 & 2.1 (Commit `9014975` & `36f3cef`):**<br>- *Feedback:* Finalize Decisions D2–D7 in `specification.md` §11; align D6 role and scope strictly to `/status`; remove line numbers from table §5 in `api-spec.md` and set role of staff detail to `IT_STAFF, ADMINISTRATOR`; set real PR #49; align AC-27 with D2; clean deleted `PHASES.md` links; Zen green token `--color-primary: #006B3C`; past-only `actionDateTime`.<br>- *Response:* Resolved all items.<br><br>**Review Round 3 (Commit `36f3cef`):**<br>- *Feedback:* Approved. Verified PR #49, linked Issue #48 via Development panel, verified AC-27/T27 D2 exception note for F2.<br>- *Response:* Recorded Issue #48 and PR #49; approved and merged into `lab4-staging`. | Approved | `9df3c6c` | Merged |
| **Phase F2 (P03–P05)** / Issue #50 | PR #51 (`codex/lab4-p03-p05-actions-taken-backend` → `lab4-staging`) | Peer Reviewer | Ready for Review Round 1 (Commit `2d23dc2`): All 17 new Lab 4 tests passing; full regression suite passing 273/273 tests (100%). | Pending Review | — | In Review |
| **Phase F3 (P06–P07)** / Issue #TBD | PR #TBD (`codex/lab4-p06-p07-dashboards-backend` → `lab4-staging`) | Peer Reviewer | (Pending Implementation) | Pending | — | Planned |
| **Phase F4 (P08–P11)** / Issue #TBD | PR #TBD (`codex/lab4-p08-p11-frontend-dashboards` → `lab4-staging`) | Peer Reviewer | (Pending Implementation) | Pending | — | Planned |
| **Phase F5 (P12–P14)** / Release | PR #TBD (`lab4-staging` → `main`) | Maintainer / Reviewer | (Pending Final Release) | Pending | — | Planned |

---

> **Peer Review Protocol:**  
> - ทุก PR ต้องมี reviewer เป็นบุคคลจริงที่ทำการตรวจโค้ดและ comment  
> - ผู้พัฒนาแก้ไขข้อเสนอแนะจน reviewer approve ก่อนทำการ merge เข้า `lab4-staging`  
> - บันทึก PR links, comments, fixes, และ merge SHA จริงลงในตารางนี้เสมอ
