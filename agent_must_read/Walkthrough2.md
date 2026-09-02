# Walkthrough 2: Phase 2, 3, and 4 Implementations

This document summarizes the work completed for TokTickIT lab 2 features, specifically focusing on the requester context, ticket creation, and ticket list viewing.

## Phase 2: Session & Requester Context (Completed)

1. **Bug Fixes (P0 & P1)**: 
   - Moved CSS variables from the backend `server/src/styles/theme.css` to the frontend `client/src/styles/theme.css`.
   - Prevented TypeScript compile artifacts (added `"noEmit": true` in `client/tsconfig.json`).
2. **Context Setup**: 
   - Created `RequesterContext.tsx` to handle `sessionStorage` securely, redirecting appropriately.
3. **Reference Data API**: 
   - Built backend endpoints `GET /api/categories`, `GET /api/related-systems`, and `GET /api/requesters` to provide essential dropdown data to the frontend.
4. **Requester Selection UI**: 
   - Implemented `RequesterSelection.tsx` supporting empty states and validation.

## Phase 3: Create Ticket (Completed)

1. **Ticket Number Generator**: 
   - Created a service to format auto-incrementing IDs into `TKT-YYYY-XXXXXX` formatted ticket numbers. Covered by strict unit tests.
2. **API Endpoint (`POST /api/tickets`)**: 
   - Implemented ticket creation wrapped in Prisma transactions.
   - Strict validations applied to block missing or excessively long inputs (Summary max 150 chars, Description max 2000 chars), and reject inactive requesters.
3. **Frontend UI (`CreateTicket.tsx`)**: 
   - Developed form featuring synchronous validation, double-submission protection, and accessible field-level error messages (`aria-describedby`).
   - Replaced placeholder component and successfully connected React hook data (requester details and reference data).

## Phase 4: My Tickets and Details (Completed)

1. **Ticket Listing API (`GET /api/tickets`)**:
   - Supports search logic across both Ticket Number and Summary.
   - Built to filter strictly based on ownership (`requesterId`) alongside Category, Priority, and Status filters.
   - Implemented stable pagination ensuring no shifting rows.
2. **Ticket Detail API (`GET /api/tickets/:id`)**:
   - Enforces ownership: Prevents Requesters from viewing tickets that they do not own by emitting `404 Not Found`.
3. **Frontend Views**: 
   - Built **My Tickets** UI (`MyTickets.tsx`) utilizing a full responsive data table for desktop and stacked cards for mobile, equipped with Empty / No Results states.
   - Added interactive `Badge.tsx` styled to signify Status and Priority properties clearly.
   - Developed **Ticket Detail** UI (`TicketDetail.tsx`) showing comprehensive, read-only specifics.

## Verification

**Status**: `100% Passed`

- All 21 Server Tests successfully ran via `vitest`.
- All 24 Client Tests verified (including rigorous tests for UI elements and empty states).

## Next Steps
The backend and frontend features for creating and reviewing tickets are entirely implemented. The development servers are restarted and running. We are ready to merge or push `feature/lab2-3-requester-context` as planned!
