# Lab 3 AI use record

## 1. Recorded LLM Models Used

- **Specification & Architecture Agent**: Anthropic Claude 3.5 Sonnet / OpenAI Codex / Google Gemini 3.8 Flash (High) via Antigravity IDE.
- **Implementation & Coding Agent**: Google Antigravity Agent (Gemini 3.8 Flash High) pair-programming in Antigravity IDE.
- **Review & Verification**: Antigravity IDE Automated Test Runner & Playwright Chromium Browser Agent.

---

## 2. Key Prompts During Development (8 Selected Prompts)

### Prompt 1: Phase F1 — Test Harness Isolation (HARNESS-01)
- **Date / Model**: 2026-09-17 | Gemini 3.8 Flash
- **Purpose**: Implement strict test harness pre-flight checks ensuring database URL isolation, upload directory bounds, and port separation before any test suite executes.
- **Input Prompt**:
  > "ช่วยเริ่ม Lab 3 Phase F1/P00–P02: ตรวจ checkout และ environment จริง, review contract ที่ปรับ main, ทำ test harness ให้แยก DB/uploads/API/client/workers ก่อนรัน DB/E2E tests ตามเกณฑ์ HARNESS-01 ใน .antigravityrules และ specification.md"
- **Relevant Output**: Created `server/src/harness-guard.ts` with `ensureTestHarnessReady()`, `validateDatabaseUrl`, `validateUploadDir`, and `setup-harness.ts` pre-flight hooks.
- **Human Review & Adjustment**: Fixed reviewer feedback regarding NTFS directory junctions and nested dev upload directories using canonical real paths (`fs.realpathSync.native`).

### Prompt 2: Phase F1 — E2E Teardown & Async Registration Tracker
- **Date / Model**: 2026-09-17 | Gemini 3.8 Flash
- **Purpose**: Eliminate swallowed errors in Playwright E2E teardown and reliably capture ticket IDs from async responses.
- **Input Prompt**:
  > "แก้ปัญหา Reviewer Round 5: สกัด ResponseRegistrationTracker ใน server/src/harness-guard.ts เพื่อดักจับ response network ใน E2E tests ป้องกัน catch {} กลืน error และดักจับ ID ตั๋วที่สร้างแม้ submitBtn.click() จะ timeout หรือล้มเหลว"
- **Relevant Output**: `ResponseRegistrationTracker` with `waitForRegistrations()` and teardown error aggregation in `requester-ticket-flow.spec.ts`.
- **Human Review & Adjustment**: Added unit test in `harness.unit.test.ts` simulating network JSON parse failure to verify teardown throws properly.

### Prompt 3: Phase F2 — Authentication Backend & Session Security
- **Date / Model**: 2026-09-18 | Gemini 3.8 Flash
- **Purpose**: Implement Argon2id password hashing, rolling window rate limiter, session management, and CSRF protection.
- **Input Prompt**:
  > "ทำ F2/P03–P06: พัฒนาระบบ Auth backend: Argon2id (memory 19456 KiB, iterations 2), rate limiter 5 ครั้งต่อ 15 นาที ตอบ 429, Session token random 32-byte เก็บ SHA-256 hash ใน DB อายุ 8 ชั่วโมง, และ CSRF protection middleware"
- **Relevant Output**: `server/src/services/password.ts`, `rateLimiter.ts`, `session.ts`, `csrf.ts`, and `/api/auth` endpoints.
- **Human Review & Adjustment**: Enforced `mustChangePassword = true` for all newly provisioned accounts in seed, and prevented `X-Forwarded-For` spoofing by configuring Express `trust proxy` safely.

### Prompt 4: Phase F2 — Atomic Password Change & Logout Resilience
- **Date / Model**: 2026-09-18 | Gemini 3.8 Flash
- **Purpose**: Address Peer Review Round 2 for Phase F2 to ensure atomic transactions and error propagation during logout.
- **Input Prompt**:
  > "แก้ปัญหา Reviewer Phase F2: 1) ห่อหุ้มการเปลี่ยนรหัสผ่าน, เพิกถอน session เดิม, และสร้าง session ใหม่ไว้ใน Prisma $transaction เดียวกัน พร้อม sessionVersion concurrency check 2) แยกกรณี 'ไม่พบ session' ออกจาก 'อ่าน DB ล้มเหลว' ใน authenticateSession โดยตอบ 500 แทนที่จะปล่อยผ่าน"
- **Relevant Output**: Wrapped `/change-password` in `$transaction` and updated `authenticateSession` error handling.
- **Human Review & Adjustment**: Verified with Supertest that simulating DB disconnection during logout correctly yields HTTP 500 instead of 204 false positive.

### Prompt 5: Phase F3 — Staff Queue API & Responsive UI
- **Date / Model**: 2026-09-18 | Gemini 3.8 Flash
- **Purpose**: Implement `GET /api/staff/tickets` with search, filter, semantic sort, pagination, and responsive UI.
- **Input Prompt**:
  > "ทำ F3/P08: เพิ่ม GET /api/staff/tickets รองรับค้นหา ticketNumber/summary/requester, กรอง status, priority, category, unassignedOnly, assignedToMe, จัดเรียง priority ตามความสำคัญจริง (HIGH > MEDIUM > LOW), pagination และสร้างหน้า StaffQueuePage.tsx ทั้งแบบตารางสำหรับ Desktop และการ์ดสำหรับ Mobile"
- **Relevant Output**: `server/src/routes/staff.ts` queue endpoint and `client/src/pages/StaffQueuePage.tsx`.
- **Human Review & Adjustment**: Ensured page resets to 1 whenever any filter or search query changes, and verified skeleton loading state.

### Prompt 6: Phase F3 — Operational Mutations & Optimistic Concurrency Control
- **Date / Model**: 2026-09-18 | Gemini 3.8 Flash
- **Purpose**: Implement Claim, Reassign, IT Priority, 8-state status matrix, and optimistic version locking.
- **Input Prompt**:
  > "ทำ F3/P09: เพิ่ม /claim, /owner, /priority, /status ตาม transition matrix ใน specification.md ใช้ optimistic concurrency control ผ่าน currentVersion ใน body ตอบ 409 VERSION_CONFLICT เมื่อ version ไม่ตรง และรับประกันว่า commit ลง DB ก่อนส่ง HTTP response"
- **Relevant Output**: Operational routes in `staff.ts`, state transition validation helper, and conflict banner in `StaffTicketDetailPage.tsx`.
- **Human Review & Adjustment**: Added atomic conditional update (`updateMany`) to guarantee single-winner semantics under concurrent claims.

### Prompt 7: Phase F4 — Admin User Management & Deadlock Elimination
- **Date / Model**: 2026-09-19 | Gemini 3.8 Flash
- **Purpose**: Implement Administrator User Management, last-active-admin invariant, atomic ticket unassignment, and resolve concurrent deactivation deadlocks.
- **Input Prompt**:
  > "แก้ปัญหา Peer Review Phase F4 [P1]: เมื่อ Admin 2 คนสั่งปิดบัญชีซึ่งกันและกันพร้อมกัน เกิด PostgreSQL Deadlock (500 Error) ให้ใช้ Transaction-Level Advisory Lock (pg_advisory_xact_lock) ที่จุดเริ่มต้นของ transaction ก่อนล็อก User เพื่อจัด Lock Order ให้ตรงกันทั้งระบบ (Advisory Lock -> User -> Ticket) ตอบ 200/400 LAST_ACTIVE_ADMIN โดยไม่มี 500"
- **Relevant Output**: Added advisory locks in `server/src/routes/admin.ts` and locked candidate owners in `server/src/routes/staff.ts`.
- **Human Review & Adjustment**: Added automated concurrency test with advisory lock gating in `users-admin.api.test.ts` verifying 100% deadlock-free behavior.

### Prompt 8: Phase F4 — Client Auth State Synchronization
- **Date / Model**: 2026-09-19 | Gemini 3.8 Flash
- **Purpose**: Clear client AuthContext and redirect to login when an administrator modifies their own role or resets their own password.
- **Input Prompt**:
  > "แก้ปัญหา Peer Review Phase F4 [P2]: เมื่อ Admin แก้ไข Role ตนเอง หรือ Reset Password ตนเอง ซึ่ง Backend เพิกถอน Session ทันที ให้ Frontend ใน AdminUsersPage.tsx เรียก refreshUser() เคลียร์ AuthContext ทันที และ navigate('/login', { replace: true, state: { message: '...' } }) พร้อมแสดง alert-info ในหน้า Login"
- **Relevant Output**: Updated `AdminUsersPage.tsx`, `LoginPage.tsx`, and component tests in `UserManagement.test.tsx`.
- **Human Review & Adjustment**: Verified in browser tests that non-admin routes are immediately blocked without allowing stale UI interaction.

---

## 3. My Reflection

การพัฒนาโครงการ **TokTickIT Lab 3** ร่วมกับ AI Agents (ทั้ง Specification Agent และ Coding Agent) ถือเป็นประสบการณ์ที่เปิดมุมมองใหม่ในการพัฒนาซอฟต์แวร์ระดับมืออาชีพอย่างยิ่ง โดยมีข้อคิดและการเรียนรู้ที่สำคัญดังนี้:

### 1. การเปรียบเทียบ Specification Agent กับ Coding Agent
- **Specification Agent (Spec DD):** มีจุดเด่นอย่างมากในการช่วยคิดอย่างเป็นระบบและครอบคลุมทุกมิติ ทั้งการร่างสัญญา (Contracts), การกำหนด Business Rules (BR-01 ถึง BR-26), การแปลง Requirement เป็น Acceptance Criteria (AC-01 ถึง AC-56), และการวิเคราะห์ Edge Cases แต่บทบาทของมนุษย์มีความสำคัญยิ่งในการตรวจทานขอบเขต (Scope) ไม่ให้เกินกรอบที่โจทย์กำหนด (เช่น การกันฟีเจอร์ Actions Taken หรือ Multiple Roles ออกไป)
- **Coding Agent (TDD & Implementation):** มีความรวดเร็วและแม่นยำในการเขียน Boilerplate, การสร้าง DTO/Type definitions, และการเขียนชุดทดสอบตาม Test DD อย่างไรก็ตาม Coding Agent มักจะมองข้ามปัญหาเชิงสถาปัตยกรรมระดับลึก เช่น Concurrency Race Conditions, Database Deadlocks และ Client-Server State Desynchronization หากไม่มีการกำหนดโจทย์และกำกับดูแลอย่างเข้มงวด

### 2. ข้อผิดพลาดสำคัญที่ตรวจพบและการแก้ไข
1. **PostgreSQL Concurrency Deadlock (Phase F4):** เมื่อจำลองกรณีที่แอดมินสองคนสั่งปิดบัญชีซึ่งกันและกันพร้อมกัน คำขอที่หนึ่งล็อก User B แล้วขอ User A ในขณะที่คำขอที่สองล็อก User A แล้วขอ User B เกิดเป็นวงจรรอคอย (Cyclic Wait) จน PostgreSQL ตัดจบเป็น 500 Deadlock Detected การแก้ไขทำโดยการสร้าง **Global Lock Ordering** โดยใช้ `pg_advisory_xact_lock` ร่วมกับการล็อกแถวในลำดับเดียวกัน ทำให้คำขอถูกจัดคิวอย่างเป็นระเบียบและส่งผลลัพธ์เป็น 200/400 `LAST_ACTIVE_ADMIN` ได้อย่างปลอดภัย
2. **Client State Desynchronization (Phase F4):** เมื่อแอดมินเปลี่ยน Role หรือ Reset รหัสผ่านตนเอง Backend สั่ง Revoke Session ทันที แต่ฝั่ง Client ยังคงจำข้อมูลเดิมใน React Context ทำให้ผู้ใช้เห็นปุ่มและเมนูที่ไม่สามารถใช้งานได้ การตรวจพบทำให้เราเพิ่มการซิงค์ `refreshUser()` ทันทีที่มีการแก้ไขบัญชีตนเอง พร้อม Redirect กลับหน้า Login อย่างราบรื่น
3. **Flaky E2E Teardown (Phase F1):** ใน E2E Tests เดิมมีการใช้ `catch {}` กลืนข้อผิดพลาดระหว่างดึง ID ตั๋ว ทำให้ไฟล์ขยะและข้อมูลในฐานข้อมูลหลงเหลือโดยไม่แจ้งเตือน เราได้ออกแบบ `ResponseRegistrationTracker` เพื่อรอให้การอ่าน Network Response เสร็จสมบูรณ์ และรวม Error ทั้งหมดมาแจ้งเตือนใน Teardown

### 3. วิธีการตรวจสอบและมาตรฐานวิศวกรรม
การยึดถือแนวทาง **Spec DD $\rightarrow$ Test DD $\rightarrow$ Red-Green TDD** อย่างเคร่งครัด ทำให้โค้ดทุกบรรทัดมีที่มาที่ไปและสามารถตรวจสอบย้อนกลับ (Traceability) ได้ 100% การแยก Test Harness ออกจาก Development Environment (HARNESS-01) ช่วยป้องกันไม่ให้ข้อมูลจริงสูญหาย และการรัน Full Suite (289 tests) บน final main SHA ยืนยันความสมบูรณ์ของระบบได้อย่างแท้จริง

### 4. ความรับผิดชอบในฐานะวิศวกรซอฟต์แวร์
AI เป็นเครื่องมือช่วยเพิ่มประสิทธิภาพ (Force Multiplier) ที่ทรงพลัง แต่ความรับผิดชอบต่อความถูกต้อง ความปลอดภัย และเสถียรภาพของระบบยังคงอยู่ที่ **ตัวนักศึกษา/วิศวกรซอฟต์แวร์** การอ่านทำความเข้าใจโค้ดทุกบรรทัด การตรวจทาน Pull Request อย่างละเอียด และการไม่ยอมรับคำตอบที่เพียงแค่ "คอมไพล์ผ่าน" แต่ต้อง "ถูกต้องตามหลักการวิศวกรรม" คือหัวใจสำคัญที่สุดในการพัฒนาซอฟต์แวร์ในยุค AI
