# TokTickIT — IT Service Desk (Lab 2: Requester Portal)

A full-stack IT service desk requester portal built with **React**, **Node.js/Express**, **Prisma ORM**, and **PostgreSQL**, styled with **Bootstrap 5** and custom **Zen Green Design System**, fully verified with **Vitest**, **Supertest**, and **Playwright**.

---

## Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Vite, React Router 7, Bootstrap 5, Zen Green Design System.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM 5.
- **Database**: PostgreSQL 16 (hosted via Docker container).
- **File Upload & Storage**: Multer with localized filesystem storage, binary magic bytes content inspection (PNG, JPEG, PDF, WEBP), and disk compensation cleanup.
- **Testing**:
  - **Server**: Vitest 2 + Supertest (60 tests: API contracts, data model constraints, soft removal, ownership isolation, path traversal security).
  - **Client**: Vitest 2 + React Testing Library + jsdom (53 tests: RouteGuard, Create Ticket form validation, My Tickets filters/sorting/pagination, AttachmentSection lifecycle, Zen Green style tokens).
  - **E2E & Responsive**: Playwright Chromium (4 tests: full user journey, real download byte verification, multi-layer ownership isolation, and 9-screenshot visual inspection across mobile, tablet, and desktop).

---

## Prerequisites

- **Node.js**: `v18.0.0` or higher (`node -v`)
- **npm**: `v9.0.0` or higher (`npm -v`)
- **Docker**: Docker Desktop or Docker Engine running locally

---

## Quick Start (Fresh Machine Setup)

Follow these reproducible steps to set up, build, seed, and test the project from scratch.

### 1. Configure Environment Files

Copy example configuration files into local active files:

```bash
# Server environment for development (Port 3000, connects to DB port 5233)
cp server/.env.example server/.env

# Server environment for automated test runs
cp server/.env.test.example server/.env.test

# Client environment (points to backend API on http://localhost:3000)
cp client/.env.example client/.env
```

> **Note on Port 5233**: `server/.env` and `server/.env.test` are pre-configured to connect to port `5233` (`postgresql://toktickit:toktickit@localhost:5233/toktickit?schema=public`) to prevent conflicts with any locally running PostgreSQL instance on port 5432.

### 2. Start PostgreSQL via Docker

Run the PostgreSQL 16 container mapped to port `5233`:

```bash
docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5233:5432 -d postgres:16
```

Verify the database container is healthy:

```bash
docker ps --filter "name=toktickit-db"
```

### 3. Install Dependencies & Playwright Browser

Install the root runner, backend, frontend dependencies, and Chromium browser binary:

```bash
# Install root test orchestration dependencies
npm install

# Install backend and frontend dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..

# Install Playwright Chromium browser binary
npx playwright install chromium
```

### 4. Apply Database Migrations & Idempotent Seed

Run Prisma migrations to create all database tables (`Category`, `RelatedSystem`, `RequesterUser`, `Ticket`, `Attachment`), then run the idempotent seed:

```bash
# Apply migrations
npm run db:migrate

# Seed categories, related systems, and test requesters
npm run db:seed
```

*(Alternatively: `cd server && npx prisma migrate dev && npx prisma db seed`)*

### 5. Build Production Bundles

Compile backend TypeScript code and frontend Vite bundle to verify build validity:

```bash
npm run build
```

*(Alternatively: `npm run build:server && npm run build:client`)*

### 6. Run the Application

Start the backend and frontend development servers:

```bash
# Terminal 1: Backend API (http://localhost:3000)
npm run dev:server

# Terminal 2: Frontend App (http://localhost:5173)
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser:
1. Select an active requester (e.g. **Jennifer Anderson**).
2. Arrive at **My Tickets** to view, search, filter, and paginate tickets.
3. Click **+ Create Ticket** to submit an IT ticket with attachments.
4. Click into any ticket to inspect **Ticket Detail**, download attachments, or soft-remove attachments.
5. Use the navbar **Change** button to switch requesters and verify ticket isolation.

---

## Running Tests

The test suite consists of **117 automated tests** with 100% pass rate.

### Run All Tests
```bash
npm test
```
*(Runs server tests → client tests → Playwright E2E tests in sequence).*

### Run Individual Test Suites

```bash
# Server API and unit tests (60 tests)
npm run test:server

# Client component, style, and integration tests (53 tests)
npm run test:client

# Playwright End-to-End and Responsive tests (4 tests)
npm run test:e2e
```

---

## Test & Behavioral Verification Strategy

Tests are intentionally designed to **fail when real behaviors break**, avoiding superficial assertions:

1. **Attachment Download Verification**:
   - E2E tests click the download link, capture the browser's `download` event, verify the suggested filename (`sample-attachment.png`), and validate that the downloaded binary bytes exactly match the uploaded file fixture.
   - Tests assert that soft-removed attachments immediately revoke download access in both the UI and backend API (`404 NOT_FOUND`).
2. **Ownership & Non-Disclosure Isolation (BR-10, BR-13, AC-03)**:
   - When switching requesters, foreign tickets are hidden from the ticket table and mobile cards.
   - Direct URL access to another user's ticket renders a secure "Ticket Not Found" page.
   - Cross-requester API calls to `GET /api/tickets/:id`, `GET /api/attachments/:id`, `GET /api/attachments/:id/download`, and `DELETE /api/attachments/:id` strictly return `404 NOT_FOUND` (never `403` or leaking ticket existence).
   - Ticket list API payloads strictly exclude foreign tickets.
3. **Screenshot & Visual Integrity Verification**:
   - Responsive E2E tests assert that all required interactive and layout elements are rendered on the page before capturing full-page screenshots.
   - All 9 captured screenshot files are validated on disk: they must exist, exceed non-trivial size (>10 KB to prevent blank page false passes), and begin with valid PNG magic header bytes (`\x89PNG\r\n\x1a\n`).

---

## Visual Evidence Artifacts

Screenshots generated automatically across 3 responsive breakpoints (Mobile: 375px, Tablet: 1024px, Desktop: 1280px) are saved in:

```
artifacts/lab-02/screenshots/
├── create-ticket/
│   ├── mobile.png
│   ├── tablet.png
│   └── desktop.png
├── my-tickets/
│   ├── mobile.png
│   ├── tablet.png
│   └── desktop.png
└── ticket-detail/
    ├── mobile.png
    ├── tablet.png
    └── desktop.png
```

---

## Automated Test Summary

| Suite | Runner | Test Files | Total Tests | Status | Coverage Areas |
|---|---|---|---|---|---|
| **Server** | Vitest + Supertest | 11 | 60 | ✅ Pass | API contracts, Ticket generator, Requester constraints, Seed idempotency, Multi-file upload, Magic bytes validation, 5 active file quota, Soft removal, Download security, Path traversal prevention, Requester isolation |
| **Client** | Vitest + React Testing Library | 10 | 53 | ✅ Pass | RouteGuard context enforcement, CreateTicket validation & dual-phase submission, MyTickets filtering, column header sorting, numbered pagination, BR-12 empty/no-results states, AttachmentSection modal focus & error handling, Badge color tokens, Mobile card vs Desktop table layout |
| **E2E** | Playwright Chromium | 2 | 4 | ✅ Pass | `E2E-01` complete ticket flow with real file download & soft-removal, `E2E-02` requester switching & multi-layer ownership isolation, `RESP-01` 375px mobile visual inspection, `RESP-02` 1024px & 1280px visual inspection |
| **Total** | | **23** | **117** | **✅ 100% Pass** | |
