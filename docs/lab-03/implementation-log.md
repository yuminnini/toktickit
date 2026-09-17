# TokTickIT Lab 3 — Implementation Log

## 2026-09-17 — Phase F1 (P00–P02) Baseline, Contracts & Harness Isolation

- **Date / Contributor / Model**: 2026-09-17 | yuminnini (b4ymin) | Claude / Gemini
- **Phase & Work Packages**: F1 (P00–P02) | Issue #26 | Branch: `codex/lab3-p01-baseline-harness` | Base: `lab3-staging` (from `origin/main` @ `10c9305c40eb3790aefaba75b7fb1b42b6c144df`)
- **Requirements & ACs**: AC-54, AC-55, HARNESS-01
- **Files Changed**:
  - `.gitignore`: Updated to ignore `.env*` while preserving `.env.example` and `.env.test.example`.
  - `server/.env.test.example`: Updated to point to isolated `toktickit_test` database and test port 3103.
  - `server/vitest.config.ts`: Removed fallback to dev `.env` to guarantee test isolation.
  - `server/src/harness-guard.ts`: Implemented HARNESS-01 validation logic (database URL isolation, upload directory guard, port availability, deterministic cleanup registry, pre-flight safety check).
  - `server/tests/lab-03/harness.unit.test.ts`: Created comprehensive unit test suite (17 passing tests).
  - `playwright.config.ts`: Updated configuration to use dedicated test ports (API 3103, client 5174), `reuseExistingServer: false`, and explicit test environment variables.
- **Test Results**:
  - `server/tests/lab-03/harness.unit.test.ts`: 17 passed (exit code 0).
  - `server` baseline suite: 12 test files, 77 passed (exit code 0).
  - `client` baseline suite: 10 test files, 53 passed (exit code 0).
- **Regression / Data Preservation**:
  - Created isolated PostgreSQL database `toktickit_test` on port 5233.
  - Deployed baseline migrations (3 migrations) and baseline seed without touching development database `toktickit`.
- **Exit Gate Status**: F1 / P00–P02 completed and verified. Ready for F2 (P03).
