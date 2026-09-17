# Lab 3 peer review evidence

# Lab 3 peer review evidence

Status: **Under Review (Phase F1 Feedback Addressed)**

| Work package / Issue | PR / base branch | Reviewer identity | Comments and response | Approval | Merge SHA | Status |
|---|---|---|---|---|---|---|
| Phase F1 (P00–P02) / Issue #26 | PR #38 (`codex/lab3-p01-baseline-harness` → `lab3-staging`) | Peer Reviewer | **Feedback:**<br>1. `ensureTestHarnessReady()` not called before real test runs; Vitest/Playwright could hit dev DB.<br>2. E2E hardcoded to `http://localhost:3000` while backend changed to 3103.<br>3. Upload guard accepted `server/uploads/attachments` and root; didn't set `UPLOAD_DIR` env for storage.<br>4. DB URL check accepted names like `contest` on remote hosts.<br>5. `TestHarnessRegistry` not used in real suites; responsive tests overwrite `artifacts/lab-02/screenshots`.<br><br>**Response & Actions:**<br>1. Wired `ensureTestHarnessReady()` into Vitest `setupFiles: ["tests/setup-harness.ts"]` and Playwright `globalSetup: "./e2e/global-setup.ts"`.<br>2. Replaced hardcoded `localhost:3000` with dynamic `API_BASE_URL` (default 3103) in all E2E specs.<br>3. Updated `validateUploadDir` to block all subdirectories of dev uploads and workspace root; set `process.env.UPLOAD_DIR` in guard.<br>4. Updated `validateDatabaseUrl` to require authorized local hostnames and strict `_test`/`test_` naming.<br>5. Integrated `globalHarnessRegistry` into `attachments.api.test.ts` and redirected test screenshots to `artifacts/test-runs/screenshots/` to preserve historical Lab 2 screenshots. | Re-testing Passed (Pending Reviewer Re-inspection) | Pending | In progress — P02 fixes applied |

เก็บ review ของ contract/harness/migration/auth/requester/staff/admin/integration และ release
ใช้ลิงก์จริงพร้อมข้อความ feedback สำคัญ/คำตอบและผล retest ไม่สร้าง reviewer สมมติ
ผู้รีวิวเป็นคนอื่นจากผู้เปิด PR; ตรวจตาม workflow ทีมและให้ reviewer merge เมื่อพร้อม
ผล tests ผ่านอย่างเดียวไม่ใช่ peer approval; draft เอกสารนี้ไม่ใช่หลักฐานส่งงานที่เสร็จแล้ว

