# TokTickIT
# TokTickIT — IT Service Desk (Lab 1: Full-Stack Hello World)

Full-stack vertical slice: React + TS + Vite + Bootstrap → Express + TS API → Prisma → PostgreSQL.

## Prerequisites
- Node.js 18+
- Docker

## Setup
1. Start PostgreSQL:
   \`\`\`
   docker run --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5233:5432 -d postgres:16
   \`\`\`
2. Install dependencies:
   \`\`\`
   cd client && npm install
   cd ../server && npm install
   \`\`\`
3. Copy env files, then set DATABASE_URL to port 5233 in server/.env:
   \`\`\`
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   \`\`\`
4. Generate Prisma client:
   \`\`\`
   cd server && npx prisma generate
   \`\`\`

## Run
- Server: `cd server && npm run dev` → http://localhost:3000
- Client: `cd client && npm run dev` → http://localhost:5173

## Test
- `cd client && npx vitest run`
- `cd server && npx vitest run`