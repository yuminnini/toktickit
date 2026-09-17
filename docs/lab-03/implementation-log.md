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

## 2026-09-17 — Phase F2 (P03) Database Migration & Idempotent Seed Data

- **Date / Contributor / Model**: 2026-09-17 | yuminnini (b4ymin) | Claude / Gemini
- **Phase & Work Packages**: F2 (P03) | Issue #27 | Branch: `codex/lab3-p03-migration-seed` | Base: `codex/lab3-p01-baseline-harness`
- **Requirements & ACs**: AC-14, AC-15, AC-16, AC-17, AC-18
- **Files Changed**:
  - `server/prisma/schema.prisma`: Mapped `User` to `RequesterUser`, added `Role` enum (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), added credential/lifecycle fields (`passwordHash`, `mustChangePassword`, `sessionVersion`, `updatedAt`), added `Session` model, extended `TicketStatus` with `WAITING_FOR_REQUESTER`, `REOPENED`, `CANCELLED`, added `itPriority`, `ticketOwnerId`, `version`, `appearsResolvedAt`, `appearsResolvedById` to `Ticket`, and added `PublicComment` and `InternalNote` models.
  - `server/prisma/migrations/20260917131000_lab3_user_workflow_foundation/migration.sql`: Forward migration script with backfill `itPriority = requestedPriority` on existing tickets.
  - `server/src/password.ts`: Implemented Argon2id password hashing, verification, and policy checks.
  - `server/src/prisma.ts`: Added backward-compatible `requesterUser` alias on `PrismaClient` instance.
  - `server/prisma/seed.ts`: Upgraded seed with 11 accounts across all 3 roles, 24 realistic tickets covering all 8 statuses, sample comments and internal notes, and idempotent credential provisioning for migrated accounts.
  - `server/tests/lab-03/migration.integration.test.ts`: Integration test verifying schema evolution, credential provisioning, and seed idempotency (AC-14, AC-15, AC-16, AC-17).
  - `server/tests/lab-03/seed.integration.test.ts`: Integration test verifying user distribution, 24 tickets across 8 statuses, and sample comments/notes (AC-18).
- **Test Results**:
  - `server/tests/lab-03/migration.integration.test.ts`: 4 passed (exit code 0).
  - `server/tests/lab-03/seed.integration.test.ts`: 6 passed (exit code 0).
  - Full server suite: 14 test files, 87 passed (exit code 0).
  - Full client suite: 10 test files, 53 passed (exit code 0).
- **Regression / Data Preservation**:
  - Existing `Category`, `RelatedSystem`, `RequesterUser` (mapped to `User`), `Ticket`, and `Attachment` tables preserved.
  - Existing ticket IDs, numbers, and attachment metadata preserved.
- **Exit Gate Status**: F2 / P03 completed and verified. Ready for F2 (P04).

## 2026-09-17 — Phase F2 (P04) Authentication Backend & Session Lifecycle

- **Date / Contributor / Model**: 2026-09-17 | yuminnini (b4ymin) | Claude / Gemini
- **Phase & Work Packages**: F2 (P04) | Issue #28 | Branch: `codex/lab3-p04-auth-backend` | Base: `codex/lab3-p03-migration-seed`
- **Requirements & ACs**: AC-01, AC-02, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10, AC-11
- **Files Changed**:
  - `server/src/auth-types.ts`: Defined `SafeUser`, `SessionData`, and augmented Express Request types.
  - `server/src/rate-limiter.ts`: Implemented `LoginRateLimiter` with 5 attempts/15-min rolling window and `Retry-After` calculation.
  - `server/src/session-service.ts`: Implemented session creation, SHA-256 token hashing, HttpOnly cookie configuration, and revocation.
  - `server/src/auth-middleware.ts`: Implemented `authenticateSession`, `requireAuth`, `requireCompletedPasswordChange`, `requireRole`, and `verifyCsrf`.
  - `server/src/auth-routes.ts`: Implemented `/api/auth/login`, `/api/auth/me`, `/api/auth/csrf`, `/api/auth/change-password`, and `/api/auth/logout`.
  - `server/src/app.ts`: Mounted `cookieParser()`, `authenticateSession`, and `/api/auth` router.
  - `server/tests/lab-03/password.unit.test.ts`: Unit tests for password policy boundaries, Argon2id, and rate limiter (11 passed).
  - `server/tests/lab-03/auth.api.test.ts`: Integration tests for auth APIs, sessions, CSRF, forced password change, and rate limits (8 passed).
- **Test Results**:
  - `server/tests/lab-03/password.unit.test.ts`: 11 passed (exit code 0).
  - `server/tests/lab-03/auth.api.test.ts`: 8 passed (exit code 0).
  - Full server suite: 16 test files, 106 passed (exit code 0).
  - Full client suite: 10 test files, 53 passed (exit code 0).
- **Regression / Data Preservation**:
  - All existing routes remain functional.
  - Sensitive credentials (passwordHash, sessionVersion, tokenHash) are never leaked in API responses.
- **Exit Gate Status**: F2 / P04 completed and verified. Ready for F2 (P05).


