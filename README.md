# TokTickIT — IT Service Desk (Lab 1: Full-Stack Hello World)

Full-stack vertical slice proving the required tech stack works end-to-end:
React + TypeScript + Vite + Bootstrap (frontend) → Node.js + Express + TypeScript (backend)
→ Prisma ORM → PostgreSQL (database), tested with Vitest + Supertest.

## Prerequisites
- Node.js 18+
- Docker

## Setup

1. Start PostgreSQL (custom port 5233 to avoid a local port conflict with 5432):

docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5233:5432 -d postgres:16

2. Install dependencies:

cd client && npm install
cd ../server && npm install

3. Copy env files, then set `DATABASE_URL` to port 5233 in `server/.env`:

cp server/.env.example server/.env
cp client/.env.example client/.env

   `server/.env` → `DATABASE_URL="postgresql://toktickit:toktickit@localhost:5233/toktickit?schema=public"`
4. Generate Prisma client and apply migrations:

cd server && npx prisma migrate dev

   This also runs the seed automatically, inserting the 4 request categories.

## Run

- Server: `cd server && npm run dev` → http://localhost:3000
- Client: `cd client && npm run dev` → http://localhost:5173

Open `http://localhost:5173`, click **Check System** to see the live backend status and the
supported request categories loaded from PostgreSQL.

## Test

- `cd client && npx vitest run`
- `cd server && npx vitest run`

## Lab 1 Progress — All 4 Issues Complete ✅

### Issue 1 — Project foundation ✅
- React + TypeScript + Vite frontend starts successfully, Bootstrap styling visible.
- Node.js + Express + TypeScript backend starts successfully.
- PostgreSQL running via Docker on port 5233, reachable from the backend.
- Vitest and Supertest configured and runnable on both client and server.
- `.gitignore` and `.env.example` present; `.env` and `node_modules/` are not committed.

### Issue 2 — API health check ✅
- `GET /api/health` returns `200` with `{ status: "ok", service: "TokTickIT API" }`.
- React page calls the real endpoint and shows **Online** / **Offline** based on the response.
- Network-level failures (backend unreachable) are normalized to a useful message:
  `"Unable to connect to TokTickIT API"`.

### Issue 3 — Category model + seed ✅
- Prisma `Category` model added (`id`, unique `name`, `createdAt`).
- Migration `add_category` creates the table in PostgreSQL.
- Seed uses `upsert` to insert Account and Access, Hardware, Software, and Network —
  safe to run multiple times without creating duplicates (verified by seeding twice).

### Issue 4 — Category list ✅
- `GET /api/categories` reads from PostgreSQL via Prisma, ordered by `id` ascending.
- React fetches and displays the real category list (not hard-coded) after a successful check.
- Loading and error states are handled in the UI.

## Final Test Evidence

**Server — `npx vitest run`**

RUN v2.1.9 C:/Users/uesr/Downloads/toktickit/server
✓ tests/lab-01/health.test.ts (1)
✓ tests/lab-01/categories.test.ts (1)

Test Files 2 passed (2)
Tests 2 passed (2)


**Client — `npx vitest run`**

RUN v2.1.9 C:/Users/uesr/Downloads/toktickit/client
✓ tests/lab-01/App.test.tsx (3)
✓ App (3)
✓ renders the TokTickIT heading
✓ shows Online and the seeded categories on success
✓ shows an Offline error message when the API is unavailable

Test Files 1 passed (1)
Tests 3 passed (3)


All 5 required tests (API-01, API-02, UI-01, UI-02, UI-03 per the lab spec) pass.
See `docs/lab-01/tests.md` for the full test plan, `docs/lab-01/reviewer.md` for peer review
records, and `docs/lab-01/ai_use.md` for AI use and reflection.
commit และ push
powershell
git checkout main
git add README.md
git commit -m "docs: update README with final status for all 4 issues"
git push
