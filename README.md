# TokTickIT — IT Service Desk (Lab 4: Actions Taken, Ticket Resolution Gates, and Role-Tailored Dashboards)

A full-stack enterprise IT service desk platform built with **React**, **Node.js/Express**, **Prisma ORM**, and **PostgreSQL**, styled with **Bootstrap 5** and custom **Zen Green Design System**, fully verified with **Vitest**, **Supertest**, and **Playwright**.

**Lab 4** extends the Lab 3 authenticated role-based service desk with:
- **Parent–Child Actions Taken (`ActionTaken`)**: IT Staff and Administrators record chronological troubleshooting actions (`actionDateTime`, `actionDescription`, `actionResult`, conditional `followUpRequired` + `followUpNote`, and `attachmentNotes`) with automatic performer binding (`performedBy`), Author/Admin edit authorization (Decision D4), terminal-status locking on `RESOLVED`/`CLOSED`/`CANCELLED` tickets (Decision D5), and optimistic concurrency control (`expectedVersion`, Decision D7). Requesters view the full chronological Actions Taken timeline on their own tickets in strict read-only mode.
- **Ticket Resolution Gates & Concurrency Protection**: Enforces the 8-state Status Transition Matrix (Decision D1), Requester advisory `Problem Appears Resolved` signal (`appearsResolvedAt`) without altering formal status, and Staff/Admin formal `RESOLVED` gate requiring an active ticket owner and at least one recorded `ActionTaken` (`400 ACTION_REQUIRED`, Decision D2 & D6) protected by PostgreSQL row-level `SELECT ... FOR UPDATE` locks.
- **Authoritative Role-Tailored Dashboards (`/dashboard`)**:
  - **Requester Dashboard (`GET /api/dashboard/requester`)**: Strictly isolated metrics (`myOpenTickets`, `inProgress`, `resolved`, `closed`, `waitingForRequester`), interactive drill-down cards to `/my-tickets?status=...`, and 5 most recently updated tickets.
  - **IT Staff Dashboard (`GET /api/dashboard/staff`)**: Shared queue metrics (`new`, `open`, `inProgress`, `waitingForRequester`, `myAssigned`), status & priority distributions, interactive drill-down cards to `/staff/tickets?status=...` or `/staff/tickets?owner=mine`, and 10 most recent active queue tickets.
  - **Administrator Dashboard (`GET /api/dashboard/staff`)**: All IT Staff queue metrics plus live `userStats` (`total`, `active`, `inactive`) and quick navigation to `/admin/users`.
- **Accessibility & Non-Color Status Cues**: Every status and priority badge pairs distinct iconography (`data-testid="badge-icon"`) with explicit text labels (`AC-25`), keyboard-accessible metric cards (`role="button"`, `tabIndex={0}`, `Enter`/`Space`), and zero horizontal overflow across Desktop (`1280px`), Tablet (`768px`), and Mobile (`375px`).

---

## Lab 4 Engineering Contracts & Documentation (`docs/lab-04/`)

- **Master Roadmap**: [`Plan_lab4.md`](Plan_lab4.md)
- **Baseline Audit**: [`docs/lab-04/baseline.md`](docs/lab-04/baseline.md)
- **Product & Functional Specification (Spec DD)**: [`docs/lab-04/specification.md`](docs/lab-04/specification.md)
- **REST API Contract**: [`docs/lab-04/api-spec.md`](docs/lab-04/api-spec.md)
- **Zen Green UI, Responsive & Accessibility Contract**: [`docs/lab-04/ui-spec.md`](docs/lab-04/ui-spec.md)
- **Test Plan & AC-01–AC-28 Traceability Matrix (Test DD)**: [`docs/lab-04/tests.md`](docs/lab-04/tests.md)
- **AI Use Record & Reflection**: [`docs/lab-04/ai-use.md`](docs/lab-04/ai-use.md)
- **Peer Review Log & Merge SHAs**: [`docs/lab-04/reviewer.md`](docs/lab-04/reviewer.md)
- **Responsive Screenshots (15 PNGs)**: [`artifacts/lab-04/screenshots/`](artifacts/lab-04/screenshots/)

---

## Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Vite, React Router 7, Bootstrap 5, Zen Green Design System tokens (`--color-primary: #006B3C`, `--badge-*`), non-color status & priority icons.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM 5, PostgreSQL 16.
- **Security & Authentication**:
  - Argon2id password hashing (`@node-rs/argon2`, memory: 19456 KiB, iterations: 2, parallelism: 1).
  - 12–128 character password policy with mandatory first-login password change (`mustChangePassword`).
  - Rolling window rate limiter (5 failed attempts per 15 min per email+IP $\rightarrow$ HTTP 429 with `Retry-After`).
  - Cryptographically secure 32-byte session tokens stored as SHA-256 hash in DB with 8-hour lifetime and HttpOnly cookies, with immediate session revocation and `403 FORBIDDEN` enforcement when a staff account is deactivated (`AC-08`).
  - Strict Origin and CSRF token (`X-CSRF-Token`) verification on state-changing requests.
  - Transaction-level advisory lock (`pg_advisory_xact_lock`) and PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) for deterministic concurrency without TOCTOU races or deadlocks.
- **File Upload & Storage**: Multer with localized filesystem storage, binary magic bytes content inspection (PNG, JPEG, PDF, WEBP), disk compensation cleanup, and authenticated download continuity.
- **Testing**:
  - **Server**: Vitest 2 + Supertest (**197 tests across 29 files**: Lab 1–3 suites + Lab 4 Actions Taken API, Ticket Workflow & Resolution Gate, Requester Dashboard API, Staff/Admin Dashboard API, and Seed Integration).
  - **Client**: Vitest 2 + React Testing Library + jsdom (**102 tests across 19 files**: Lab 1–3 suites + Lab 4 `ActionsTaken.test.tsx`, `TicketWorkflow.test.tsx`, `StaffDashboard.test.tsx`, `RequesterDashboard.test.tsx`).
  - **E2E & Responsive**: Playwright Chromium (**47 tests across 9 files**: 14 Lab 4 E2E tests in `e2e/lab-04/` covering Actions Taken lifecycle, Ticket Resolution Gate, Role Dashboards, and 3-viewport Responsive checks, plus 33 Lab 3 E2E regression tests in `e2e/lab-03/`).
  - **Total**: **346 automated tests passing with 100% pass rate (313+ core verification tests)**.

---

## Roles and Access Matrix

| Role | Primary Permissions & Navigation | Default Landing & Dashboard Routes |
|---|---|---|
| **Requester** | View personal Requester Dashboard (`/dashboard`) with drill-down to `/my-tickets?status=...`; create tickets with attachments; view own tickets and read-only Actions Taken history; post public comments; click advisory `Problem Appears Resolved`. Cannot view internal notes, record actions, or formally resolve tickets. | `/my-tickets` & `/dashboard` |
| **IT Staff** | View IT Staff Dashboard (`/dashboard`) with queue metrics and drill-down to `/staff/tickets`; claim unassigned tickets; reassign tickets; update IT Priority; record and edit own `ActionTaken` entries; transition statuses according to 8-state matrix (requiring $\ge 1$ `ActionTaken` for `RESOLVED`); post public comments and internal notes. | `/staff/tickets` & `/dashboard` |
| **Administrator** | View Administrator Dashboard (`/dashboard`) with full queue metrics plus system `userStats` (`total`, `active`, `inactive`); record or edit any `ActionTaken` entry (Decision D4); transition ticket statuses (Decision D6); manage user accounts in `/admin/users` (create, edit, activate/deactivate, reset initial passwords). | `/admin/users` & `/dashboard` |

---

## Seed Accounts (Local Development & Demo)

All seeded test accounts are configured with `mustChangePassword = true` upon initial setup (except dedicated ready-to-use E2E/demo accounts where noted in `seed.ts`):

| Role | Email | Initial Password Policy | Notes |
|---|---|---|---|
| **Administrator** | `admin@toktickit.com` | Set via seed (`AdminPassword123!`) | Primary system admin |
| **IT Staff** | `michaels@toktickit.com` | Set via seed (`StaffPassword123!`) | Senior Support |
| **IT Staff** | `sarahj@toktickit.com` | Set via seed (`StaffPassword123!`) | Network & Hardware |
| **IT Staff** | `davidl@toktickit.com` | Set via seed (`StaffPassword123!`) | Software & Access |
| **IT Staff** | `inactive.staff@toktickit.com` | Set via seed (`StaffPassword123!`) | Inactive account (login/mutations rejected) |
| **Requester** | `janderson@toktickit.com` | Set via seed (`RequesterPassword123!`) | Active Requester (owns seeded tickets) |
| **Requester** | `mbrown@toktickit.com` | Set via seed (`RequesterPassword123!`) | Active Requester |
| **Requester** | `inactive.requester@toktickit.com`| Set via seed (`RequesterPassword123!`) | Inactive account (login rejected) |

---

## Quick Start (Fresh Machine Setup)

Follow these reproducible steps to set up, build, seed, and test the project from scratch.

### 1. Configure Environment Files

Copy example configuration files into local active files:

```bash
# Server environment for development (Port 3000, connects to DB port 5233)
cp server/.env.example server/.env

# Server environment for automated test runs (Port 3103, connects to DB port 5233)
cp server/.env.test.example server/.env.test

# Client environment (points to backend API on http://localhost:3000)
cp client/.env.example client/.env
```

> **Note on Port 5233**: `server/.env` and `server/.env.test` connect to port `5233` (`postgresql://toktickit:toktickit@localhost:5233/toktickit?schema=public`) to prevent conflicts with default PostgreSQL on port 5432.

### 2. Start PostgreSQL via Docker

Run the PostgreSQL 16 container mapped to port `5233`:

```bash
docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5233:5432 -d postgres:16
```

### 3. Install Dependencies & Playwright Browser

```bash
# Install root dependencies
npm install

# Install backend and frontend dependencies
npm --prefix server install
npm --prefix client install

# Install Playwright Chromium browser binary
npx playwright install chromium
```

### 4. Apply Database Migrations & Idempotent Seed

```bash
# Apply Prisma forward migrations (includes Lab 4 ActionTaken model & compound index)
npm run db:migrate

# Seed categories, systems, test users, tickets, and 0 / 1 / multiple Actions Taken records
npm run db:seed
```

### 5. Build Production Bundles

```bash
npm run build
```

*(Compiles TypeScript backend into `server/dist` and builds client bundle via `vite build`).*

### 6. Run the Application

```bash
# Terminal 1: Backend API (http://localhost:3000)
npm run dev:server

# Terminal 2: Frontend App (http://localhost:5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser:
1. Navigate to `/dashboard` under any authenticated role to view the role-tailored Dashboard and drill down into filtered ticket lists.
2. Log in as IT Staff (`michaels@toktickit.com`) to record and edit **Actions Taken** and resolve tickets in `/staff/tickets/:id`.
3. Log in as a Requester (`janderson@toktickit.com`) to inspect read-only **Actions Taken** timelines and trigger `Problem Appears Resolved` in `/tickets/:id`.

---

## Running Automated Tests

All automated suites run against isolated test databases and scratch directories (`HARNESS-01`).

### Run Individual & Lab 4 Test Suites

```bash
# Server API, unit, and concurrency tests (197 tests across 29 files)
npm --prefix server test

# Client component, style, and integration tests (102 tests across 19 files)
npm --prefix client test -- --run

# Playwright Lab 4 End-to-End & Responsive suites (14 tests across 4 files)
npx playwright test e2e/lab-04

# Full Playwright E2E regression (Lab 3 + Lab 4)
npm run test:e2e
```

---

## Verification & Test Breakdown

| Suite | Runner | Test Files | Total Tests | Status | Coverage Areas |
|---|---|---|---|---|---|
| **Server (Labs 1–4)** | Vitest + Supertest | 29 | 197 | ✅ Pass | Lab 4 Actions Taken CRUD & validation (`actions-taken.api.test.ts`), Resolution Gate & 8-state transitions (`ticket-workflow.api.test.ts`), Requester Dashboard isolation (`requester-dashboard.api.test.ts`), IT Staff & Admin Dashboard aggregations (`staff-dashboard.api.test.ts`), Idempotent `ActionTaken` seeding (`seed.integration.test.ts`), Row-level `FOR UPDATE` locks, Inactive session revocation (`403`), plus full Lab 1–3 regression |
| **Client (Labs 1–4)** | Vitest + React Testing Library | 19 | 102 | ✅ Pass | Lab 4 `ActionsTakenSection` create/edit/lock/follow-up validation & keyboard accessibility (`ActionsTaken.test.tsx`), Non-color badge icons & Admin operations guard (`TicketWorkflow.test.tsx`), IT Staff & Admin Dashboard drill-down (`StaffDashboard.test.tsx`), Requester Dashboard drill-down & empty states (`RequesterDashboard.test.tsx`), plus full Lab 1–3 regression |
| **E2E (Lab 4 + Lab 3)** | Playwright Chromium | 9 (4 Lab 4 + 5 Lab 3) | 47 (14 Lab 4 + 33 Lab 3) | ✅ Pass | Lab 4 Actions Taken staff/requester E2E (`actions-taken-flow.spec.ts`), Advisory vs. Formal resolution gate (`ticket-resolution.spec.ts`), Requester/Staff/Admin Dashboard drill-downs (`dashboards.spec.ts`), Zero-overflow Responsive & Screenshot verification at `1280px`, `768px`, and `375px` (`e2e/lab-04/responsive.spec.ts`), plus Lab 3 E2E regression |
| **Total** | | **57** | **346** | **✅ 100% Pass** | **Zero test failures, zero flaky tests, clean production builds** |
