# Lab 3 peer review evidence

Status: **Under Review (Phase F1 Round 2 Feedback Addressed)**

| Work package / Issue | PR / base branch | Reviewer identity | Comments and response | Approval | Merge SHA | Status |
|---|---|---|---|---|---|---|
| Phase F1 (P00–P02) / Issue #26 | PR #38 (`codex/lab3-p01-baseline-harness` → `lab3-staging`) | Peer Reviewer | **Round 1 Feedback:**<br>1. `ensureTestHarnessReady()` not called before real test runs.<br>2. E2E hardcoded to 3000 while backend changed to 3103.<br>3. Upload guard accepted `server/uploads/attachments` and root; didn't set `UPLOAD_DIR` env.<br>4. DB URL check accepted names like `contest` on remote hosts.<br>5. `TestHarnessRegistry` not used in real suites; responsive tests overwrite `artifacts/lab-02/screenshots`.<br><br>**Round 2 Feedback:**<br>1. [P1] `API_BASE_URL` out of scope in `requester-ticket-flow.spec.ts:129` causing ReferenceError in test 2.<br>2. [P1] Playwright environment timing: `webServer.env` evaluated before `globalSetup`; `.env.test` loaded too late.<br>3. [P1] Upload guard accepted junctions/symlinks pointing to `server/uploads/attachments`.<br>4. [P2] Vitest `setup-harness.ts` used `beforeAll`, running after test module imports.<br>5. [P2] Cleanup failures logged `console.error` rather than throwing.<br><br>**Response & Actions:**<br>1. Moved `API_BASE_URL` to module top-level in `requester-ticket-flow.spec.ts`.<br>2. Synchronized `server/.env.test` and executed `ensureTestHarnessReady()` at the top of `playwright.config.ts` before creating `defineConfig` / `webServer.env`.<br>3. Enhanced `validateUploadDir` to resolve canonical real paths (`fs.realpathSync.native`), detecting directory junctions and symlinks; added unit test.<br>4. Converted `setup-harness.ts` to top-level `await ensureTestHarnessReady()`.<br>5. Updated `setup-harness.ts` cleanup to throw a descriptive error on failure. | Re-testing Passed (Pending Reviewer Re-inspection) | Pending | In progress — P02 Round 2 fixes applied |

เก็บ review ของ contract/harness/migration/auth/requester/staff/admin/integration และ release
ใช้ลิงก์จริงพร้อมข้อความ feedback สำคัญ/คำตอบและผล retest ไม่สร้าง reviewer สมมติ
ผู้รีวิวเป็นคนอื่นจากผู้เปิด PR; ตรวจตาม workflow ทีมและให้ reviewer merge เมื่อพร้อม
ผล tests ผ่านอย่างเดียวไม่ใช่ peer approval; draft เอกสารนี้ไม่ใช่หลักฐานส่งงานที่เสร็จแล้ว

