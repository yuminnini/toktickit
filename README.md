# TokTickIT — IT Service Desk (Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens)

A full-stack enterprise IT service desk platform built with **React**, **Node.js/Express**, **Prisma ORM**, and **PostgreSQL**, styled with **Bootstrap 5** and custom **Zen Green Design System**, fully verified with **Vitest**, **Supertest**, and **Playwright**.

Lab 3 replaces the temporary development requester switcher with real authentication, session management, role-based authorization, IT Staff shared queue and ticket lifecycle workflows, communication feeds (public comments and private internal notes), and minimalist Administrator user management.

---

## Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Vite, React Router 7, Bootstrap 5, Zen Green Design System tokens (`--color-*`, `--badge-*`).
- **Backend**: Node.js, Express, TypeScript, Prisma ORM 5, PostgreSQL 16.
- **Security & Authentication**:
  - Argon2id password hashing (`@node-rs/argon2`, memory: 19456 KiB, iterations: 2, parallelism: 1).
  - 12–128 character password policy with mandatory first-login password change (`mustChangePassword`).
  - Rolling window rate limiter (5 failed attempts per 15 min per email+IP $\rightarrow$ HTTP 429 with `Retry-After`).
  - Cryptographically secure 32-byte session tokens stored as SHA-256 hash in DB with 8-hour lifetime and HttpOnly cookies.
  - Strict Origin and CSRF token (`X-CSRF-Token`) verification on state-changing requests.
  - Transaction-level advisory lock (`pg_advisory_xact_lock`) and PostgreSQL row-level locks (`FOR UPDATE`) for deterministic concurrency without deadlocks.
- **File Upload & Storage**: Multer with localized filesystem storage, binary magic bytes content inspection (PNG, JPEG, PDF, WEBP), disk compensation cleanup, and authenticated download continuity.
- **Testing**:
  - **Server**: Vitest 2 + Supertest (**170 tests across 24 files**: Auth, RBAC, Staff Queue, Staff Detail, Communications, Admin User Management, Safe Errors, Concurrency, Seed idempotency, Migration data preservation).
  - **Client**: Vitest 2 + React Testing Library + jsdom (**86 tests across 15 files**: AuthContext, Login, Change Password, RouteGuard, Staff Ticket Queue, Staff Ticket Detail, User Management, Theme styling).
  - **E2E & Responsive**: Playwright Chromium (**33 tests across 5 files**: Full staff lifecycle flow, Admin user lifecycle, Accessibility WCAG compliance, Viewport responsive verification across 375px, 768px, 1024px, and 1280px).
  - **Total**: **289 automated tests passing with 100% pass rate**.

---

## Roles and Access Matrix

| Role | Primary Permissions & Navigation | Default Landing Route |
|---|---|---|
| **Requester** | Create tickets with attachments; view and manage own tickets; post public comments; indicate problem appears resolved. Cannot view internal notes or change formal ticket status. | `/my-tickets` |
| **IT Staff** | View shared IT Staff Ticket Queue with search, multi-filter, semantic priority sort, and pagination; claim unassigned tickets; reassign tickets; update IT Priority; transition statuses according to 8-state matrix; post public comments and private internal notes. | `/staff/tickets` |
| **Administrator** | Minimalist User Management: list users, search by name/email, filter by role, create users with initial passwords, edit profile info, activate/deactivate accounts, reset initial passwords. Protected by self-deactivation block and last-active-admin lock. | `/admin/users` |

---

## Seed Accounts (Local Development & Demo)

All seeded test accounts are configured with `mustChangePassword = true` upon initial setup:

| Role | Email | Initial Password Policy | Notes |
|---|---|---|---|
| **Administrator** | `admin@toktickit.com` | Set via seed (`AdminPassword123!`) | Primary system admin |
| **IT Staff** | `michaels@toktickit.com` | Set via seed (`StaffPassword123!`) | Senior Support |
| **IT Staff** | `sarahj@toktickit.com` | Set via seed (`StaffPassword123!`) | Network & Hardware |
| **IT Staff** | `davidl@toktickit.com` | Set via seed (`StaffPassword123!`) | Software & Access |
| **IT Staff** | `inactive.staff@toktickit.com` | Set via seed (`StaffPassword123!`) | Inactive account (login rejected) |
| **Requester** | `janderson@toktickit.com` | Set via seed (`RequesterPassword123!`) | Active Requester (owns legacy tickets) |
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
# Apply Prisma forward migrations (creates User, Session, PublicComment, InternalNote, etc.)
npm run db:migrate

# Seed categories, systems, test users, and 24 fictional tickets spanning all statuses
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
1. Log in as an Administrator (`admin@toktickit.com`) to manage users in `/admin/users`.
2. Log in as an IT Staff (`michaels@toktickit.com`) to triage tickets in `/staff/tickets` and operate in `/staff/tickets/:id`.
3. Log in as a Requester (`janderson@toktickit.com`) to view and submit tickets in `/my-tickets`.

---

## Running Automated Tests

The complete turnkey test suite consists of **289 automated tests** with 100% pass rate.

### Run All Tests
```bash
npm test
```
*(Runs server tests $\rightarrow$ client tests $\rightarrow$ Playwright E2E tests in sequence with HARNESS-01 isolated environment).*

### Run Individual Test Suites

```bash
# Server API, unit, and concurrency tests (170 tests across 24 files)
npm run test:server

# Client component, style, and integration tests (86 tests across 15 files)
npm run test:client

# Playwright End-to-End, Accessibility, and Responsive tests (33 tests across 5 files)
npm run test:e2e
```

---

## Verification & Test Breakdown

| Suite | Runner | Test Files | Total Tests | Status | Coverage Areas |
|---|---|---|---|---|---|
| **Server** | Vitest + Supertest | 24 | 170 | ✅ Pass | Argon2id hashing, Password policy, Rate limiting, Session rotation/revocation, CSRF protection, Role-based access control, Requester regression, Staff Queue search/filter/sort/pagination, Claim/reassign/priority/status matrix, Optimistic concurrency (409), Transaction advisory locks (deadlock prevention), Public comments, Private internal notes (403/404 isolation), Admin user CRUD, Self-deactivation block, Last-admin invariant, Atomic ticket unassignment, Safe error handling (non-disclosure) |
| **Client** | Vitest + React Testing Library | 15 | 86 | ✅ Pass | AuthContext state management, Login page validation & rate-limit feedback, Change Password policy & forced redirect, RouteGuard RBAC, Staff Ticket Queue table & card responsive views, Filter toolbar & pagination, Staff Ticket Detail operational controls, Status transition modal, Comments & Notes feeds, Admin User Management modals, Zen Green style tokens & status badge pairs |
| **E2E** | Playwright Chromium | 5 | 33 | ✅ Pass | Full IT Staff ticket lifecycle (`staff-ticket-flow.spec.ts`), Full Administrator user lifecycle (`user-administration.spec.ts`), Accessibility & touch targets $\ge$44px (`accessibility.spec.ts`), Responsive visual inspection across 375px, 768px, 1024px, and 1280px (`responsive.spec.ts`), Legacy requester ticket flow regression (`requester-ticket-flow.spec.ts`) |
| **Total** | | **44** | **289** | **✅ 100% Pass** | **Zero test failures, zero flaky tests, clean production builds** |
