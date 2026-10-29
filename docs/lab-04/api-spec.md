# TokTickIT — Lab 4 REST API Specification

- **Version:** 1.0-draft
- **Date:** 2026-10-12
- **Status:** Planned (Spec DD Stage)
- **Base URL:** `/api`
- **Format:** JSON (`application/json`), ISO-8601 UTC dates, camelCase fields

---

## 1. Authentication, Security & Error Handling

### 1.1 Session & Security Standards
- **Authentication:** HTTP-only cookie (`toktickit_session`), SameSite=Lax.
- **CSRF Protection:** State-changing requests (`POST`, `PATCH`, `DELETE`) require header `X-CSRF-Token` matching the session CSRF token.
- **Actor Identity:** Performer IDs (`performedById`) are extracted strictly from the validated session. Client-submitted spoofed performer IDs are ignored.
- **Safe Failure:** Error responses never expose stack traces, database schema specifics, or internal paths.

### 1.2 Error Response Format
All error responses adhere to the standard JSON structure:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable safe explanation.",
  "fields": {
    "fieldName": "Specific validation failure explanation"
  }
}
```

| HTTP Status | Error Code | Description / Usage |
|---|---|---|
| **400 Bad Request** | `VALIDATION_ERROR` / `INVALID_TRANSITION` | Missing required fields, invalid date format, or disallowed status transition. |
| **401 Unauthorized** | `UNAUTHENTICATED` | Missing, expired, or invalid session cookie. |
| **403 Forbidden** | `FORBIDDEN` / `RESOLUTION_RESTRICTED` | Attempted write by Requester or inactive user, or direct resolution attempt. |
| **404 Not Found** | `NOT_FOUND` | Resource does not exist, or foreign ticket for a Requester (privacy preservation). |
| **409 Conflict** | `VERSION_CONFLICT` / `STALE_UPDATE` | Submitted `expectedVersion` does not match the current database version. |
| **500 Server Error** | `INTERNAL_ERROR` | Unexpected server failure. |

---

## 2. Actions Taken Endpoints

### 2.1 List Actions Taken for Ticket
- **Method & Path:** `GET /api/tickets/:id/actions`
- **Access Control:**
  - `REQUESTER`: Permitted ONLY if ticket is owned by the requester (`requesterId = session.userId`). Otherwise returns `404 Not Found`.
  - `IT_STAFF` & `ADMINISTRATOR`: Permitted on any existing ticket.
- **Query Parameters:** None.
- **Success Response (200 OK):**
```json
[
  {
    "id": 101,
    "ticketId": 12,
    "actionDateTime": "2026-10-12T09:30:00.000Z",
    "description": "Inspected network switch ports and ran diagnostics.",
    "result": "Switch port 4 failed loopback test; replaced patch cable.",
    "performedBy": {
      "id": 3,
      "name": "Alex Technician",
      "email": "alex@toktickit.local",
      "role": "IT_STAFF"
    },
    "followUpRequired": true,
    "followUpNote": "Monitor ping latency over the next 24 hours.",
    "attachmentNotes": "See switch-diagnostic-log.txt in ticket attachments.",
    "version": 1,
    "createdAt": "2026-10-12T09:45:12.000Z",
    "updatedAt": "2026-10-12T09:45:12.000Z"
  }
]
```
- **Error Responses:**
  - `401 UNAUTHENTICATED`: Session missing.
  - `404 NOT_FOUND`: Ticket not found, or ticket belongs to another requester.

---

### 2.2 Create Action Taken
- **Method & Path:** `POST /api/tickets/:id/actions`
- **Access Control:** `IT_STAFF`, `ADMINISTRATOR` (Active users only). Requesters return `403 FORBIDDEN`.
- **Headers:** `Content-Type: application/json`, `X-CSRF-Token: <token>`
- **Request Body:**
```json
{
  "actionDateTime": "2026-10-12T09:30:00.000Z",
  "description": "Inspected network switch ports and ran diagnostics.",
  "result": "Switch port 4 failed loopback test; replaced patch cable.",
  "followUpRequired": true,
  "followUpNote": "Monitor ping latency over the next 24 hours.",
  "attachmentNotes": "See switch-diagnostic-log.txt"
}
```
- **Validation & Business Rules:**
  - `actionDateTime`: Optional string. If provided, must be valid ISO-8601 date and cannot be in the future (must be $\le$ current time with 5-min skew tolerance); defaults to `now()`.
  - `description`: Required string, 3 to 2000 characters.
  - `result`: Required string, 3 to 2000 characters.
  - `followUpRequired`: Required boolean (defaults to `false` if omitted).
  - `followUpNote`: **Mandatory** if `followUpRequired` is `true` (min 3 characters). If `false`, can be omitted or null.
  - `attachmentNotes`: Optional string, max 500 characters.
  - `performedById`: Extracted automatically from session user.
  - **Ticket Status Gate (Decision D5):** Actions Taken cannot be created on tickets in `RESOLVED`, `CLOSED`, or `CANCELLED` status. Returns `400 TICKET_LOCKED`.
- **Success Response (201 Created):**
```json
{
  "id": 102,
  "ticketId": 12,
  "actionDateTime": "2026-10-12T09:30:00.000Z",
  "description": "Inspected network switch ports and ran diagnostics.",
  "result": "Switch port 4 failed loopback test; replaced patch cable.",
  "performedBy": {
    "id": 3,
    "name": "Alex Technician",
    "email": "alex@toktickit.local",
    "role": "IT_STAFF"
  },
  "followUpRequired": true,
  "followUpNote": "Monitor ping latency over the next 24 hours.",
  "attachmentNotes": "See switch-diagnostic-log.txt",
  "version": 1,
  "createdAt": "2026-10-12T09:45:12.000Z",
  "updatedAt": "2026-10-12T09:45:12.000Z"
}
```
- **Error Responses:**
  - `400 VALIDATION_ERROR`: Missing description, result, invalid date, or missing followUpNote when followUpRequired is true.
  - `400 TICKET_LOCKED`: Ticket is in `RESOLVED`, `CLOSED`, or `CANCELLED` status (Decision D5).
  - `403 FORBIDDEN`: User role is `REQUESTER` or staff user is inactive.
  - `404 NOT_FOUND`: Target ticket does not exist.

---

### 2.3 Update Action Taken
- **Method & Path:** `PATCH /api/actions/:id`
- **Access Control:** The original creator (`performedById`) or an active `ADMINISTRATOR` (Decision D4). Other IT Staff attempting to edit a colleague's action receive `403 ACTION_EDIT_FORBIDDEN`. Requesters receive `403 FORBIDDEN`.
- **Headers:** `Content-Type: application/json`, `X-CSRF-Token: <token>`
- **Request Body (Partial Update with OCC):**
```json
{
  "description": "Updated description with further details.",
  "result": "Verified cable replacement resolved packet drops.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": null,
  "expectedVersion": 1
}
```
- **Validation & Business Rules:**
  - Same field validation rules as Create.
  - If `followUpRequired` is updated to `true`, `followUpNote` must be non-empty.
  - `expectedVersion`: Required positive integer (Decision D7).
  - **Ticket Status Gate (Decision D5):** Actions Taken cannot be edited on tickets in `RESOLVED`, `CLOSED`, or `CANCELLED` status. Returns `400 TICKET_LOCKED`.
  - **Optimistic Concurrency Check (Decision D7):** If `expectedVersion != actionTaken.version`, transaction aborts and returns `409 VERSION_CONFLICT`.
- **Success Response (200 OK):**
```json
{
  "id": 102,
  "ticketId": 12,
  "actionDateTime": "2026-10-12T09:30:00.000Z",
  "description": "Updated description with further details.",
  "result": "Verified cable replacement resolved packet drops.",
  "performedBy": {
    "id": 3,
    "name": "Alex Technician",
    "email": "alex@toktickit.local",
    "role": "IT_STAFF"
  },
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": null,
  "version": 2,
  "createdAt": "2026-10-12T09:45:12.000Z",
  "updatedAt": "2026-10-12T09:50:00.000Z"
}
```
- **Error Responses:**
  - `400 VALIDATION_ERROR`: Field validation failed.
  - `400 TICKET_LOCKED`: Ticket is in `RESOLVED`, `CLOSED`, or `CANCELLED` status (Decision D5).
  - `403 ACTION_EDIT_FORBIDDEN`: Attempted edit by an IT Staff member who is not the original creator (`performedById`) and not an Administrator (Decision D4).
  - `403 FORBIDDEN`: Unauthorized role (`REQUESTER`) or inactive user.
  - `404 NOT_FOUND`: Action Taken record with given ID does not exist.
  - `409 VERSION_CONFLICT`: `expectedVersion` does not match the database version (Decision D7).

---

## 3. Dashboard Endpoints

### 3.1 Requester Dashboard API
- **Method & Path:** `GET /api/dashboard/requester`
- **Access Control:** Authenticated `REQUESTER`. (Staff/Admin calling this endpoint receive their own requester data if tickets exist or zero counts).
- **Success Response (200 OK):**
```json
{
  "myOpenTickets": 3,
  "inProgress": 2,
  "resolved": 5,
  "closed": 12,
  "waitingForRequester": 1,
  "recentlyUpdated": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-00012",
      "summary": "Laptop battery drains quickly",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "updatedAt": "2026-10-12T09:45:12.000Z",
      "category": { "id": 1, "name": "Hardware" }
    }
  ]
}
```
- **Calculation Specifications:**
  - `myOpenTickets`: `COUNT(*)` where `requesterId = user.id` AND `currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`.
  - `inProgress`: `COUNT(*)` where `requesterId = user.id` AND `currentStatus = 'IN_PROGRESS'`.
  - `resolved`: `COUNT(*)` where `requesterId = user.id` AND `currentStatus = 'RESOLVED'`.
  - `closed`: `COUNT(*)` where `requesterId = user.id` AND `currentStatus = 'CLOSED'`.
  - `waitingForRequester`: `COUNT(*)` where `requesterId = user.id` AND `currentStatus = 'WAITING_FOR_REQUESTER'`.
  - `recentlyUpdated`: Top 5 tickets ordered by `updatedAt DESC` for the authenticated requester.

---

### 3.2 IT Staff & Admin Dashboard API
- **Method & Path:** `GET /api/dashboard/staff`
- **Access Control:** `IT_STAFF`, `ADMINISTRATOR`. Requesters return `403 FORBIDDEN`.
- **Success Response (200 OK) for IT Staff:**
```json
{
  "new": 14,
  "open": 23,
  "inProgress": 18,
  "waitingForRequester": 7,
  "myAssigned": 16,
  "byStatus": {
    "NEW": 14,
    "OPEN": 23,
    "IN_PROGRESS": 18,
    "WAITING_FOR_REQUESTER": 7,
    "RESOLVED": 35,
    "CLOSED": 50,
    "REOPENED": 2,
    "CANCELLED": 5
  },
  "byPriority": {
    "HIGH": 12,
    "MEDIUM": 28,
    "LOW": 22
  },
  "recentQueue": [
    {
      "id": 15,
      "ticketNumber": "TKT-2026-00015",
      "summary": "Printer toner smearing on floor 3",
      "currentStatus": "OPEN",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "ticketOwner": null,
      "updatedAt": "2026-10-12T10:15:00.000Z"
    }
  ]
}
```
- **Success Response (200 OK) for Administrator (Includes `userStats`):**
```json
{
  "new": 14,
  "open": 23,
  "inProgress": 18,
  "waitingForRequester": 7,
  "myAssigned": 16,
  "byStatus": { ... },
  "byPriority": { ... },
  "recentQueue": [ ... ],
  "userStats": {
    "totalUsers": 25,
    "activeStaff": 6,
    "inactiveUsers": 2
  }
}
```
- **Calculation Specifications:**
  - `new`: `COUNT(*)` where `currentStatus = 'NEW'`.
  - `open`: `COUNT(*)` where `currentStatus = 'OPEN'`.
  - `inProgress`: `COUNT(*)` where `currentStatus = 'IN_PROGRESS'`.
  - `waitingForRequester`: `COUNT(*)` where `currentStatus = 'WAITING_FOR_REQUESTER'`.
  - `myAssigned`: `COUNT(*)` where `ticketOwnerId = user.id` AND `currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`.
  - `byStatus`: Aggregated counts grouped by all 8 `currentStatus` enum values.
  - `byPriority`: Aggregated counts of active tickets (`currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`) grouped by `itPriority`.
  - `recentQueue`: Top 5 active tickets (`currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`) ordered by `updatedAt DESC`.

---

## 4. Ticket Status Workflow, Resolution Gate & Concurrency

### 4.1 Status Transition Endpoint
- **Method & Path:** `PATCH /api/staff/tickets/:id/status`
- **Access Control:** `IT_STAFF`, `ADMINISTRATOR` (Updated in Lab 4 per Decision D6; baseline Lab 3 code had `IT_STAFF` only). Requesters receive `403 FORBIDDEN`.
- **Headers:** `Content-Type: application/json`, `X-CSRF-Token: <token>`
- **Request Body:**
```json
{
  "currentStatus": "RESOLVED",
  "expectedVersion": 2
}
```
- **Validation Rules:**
  - `currentStatus`: Required string, must be a valid `TicketStatus` enum value.
  - `expectedVersion`: Required positive integer.
  - *(Note: Per Decision D3, `resolutionNote` is omitted from the status payload schema; technical work context is recorded in Actions Taken).*
- **Resolution Gate Rule:**
  - Transitioning to `RESOLVED` requires authenticated IT Staff or Administrator through this endpoint (Decision D6). Requesters have no access to `/api/staff/*` endpoints and receive `403 FORBIDDEN`.
- **Precondition & Transition Checks:**
  - **Permitted Transition (Decision D1):** `currentStatus` must be an allowed target from the ticket's current status per baseline matrix. Invalid transitions return `400 INVALID_TRANSITION`.
  - **Owner Precondition (`OWNER_REQUIRED`):** Target statuses `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, and `RESOLVED` require the ticket to have an assigned active owner (`IT_STAFF` or `ADMINISTRATOR`). Otherwise returns `400 OWNER_REQUIRED`.
  - **Actions Taken Precondition (`ACTION_REQUIRED` - Decision D2):** Transitioning to `RESOLVED` strictly requires that at least one `ActionTaken` record exists under the ticket. If zero actions exist, the update is rejected with `400 ACTION_REQUIRED`.
- **Optimistic Concurrency Check (Decision D7):**
  - If `expectedVersion != ticket.version`, transaction aborts and returns `409 VERSION_CONFLICT`.
  - On success, `version` is incremented by 1.
- **Success Response (200 OK):**
  - Returns complete formatted staff ticket detail with updated `currentStatus`, incremented `version`, and refreshed `updatedAt`.

---

## 5. Preservation of Existing APIs (Lab 1–3)
The following approved endpoints remain functional and unmodified, matching existing routes and role guards:

| Endpoint | Method | Authorized Role(s) in Code | Source File |
|---|---|---|---|
| `/api/health` | `GET` | Public | `app.ts` |
| `/api/auth/login` | `POST` | Public | `auth.ts` |
| `/api/auth/me` | `GET` | Authenticated (Any) | `auth.ts` |
| `/api/auth/csrf` | `GET` | Authenticated (Any) | `auth.ts` |
| `/api/auth/change-password` | `POST` | Authenticated (Any) | `auth.ts` |
| `/api/auth/logout` | `POST` | Authenticated (Any) | `auth.ts` |
| `/api/categories` | `GET` | Authenticated (Any) | `app.ts` |
| `/api/related-systems` | `GET` | Authenticated (Any) | `app.ts` |
| `/api/tickets` | `GET` | `REQUESTER` | `app.ts` |
| `/api/tickets` | `POST` | `REQUESTER` | `app.ts` |
| `/api/tickets/:id` | `GET` | `REQUESTER` (own), `IT_STAFF`, `ADMINISTRATOR` | `app.ts` |
| `/api/tickets/:id/attachments` | `POST` | `REQUESTER` (own) | `app.ts` |
| `/api/attachments/:id/download` | `GET` | `REQUESTER` (own), `IT_STAFF`, `ADMINISTRATOR` | `app.ts` |
| `/api/attachments/:id` | `DELETE` | `REQUESTER` (own) | `app.ts` |
| `/api/tickets/:id/comments` | `GET`, `POST` | `REQUESTER` (own), `IT_STAFF`, `ADMINISTRATOR` (POST: Requester/Staff) | `communications.ts` |
| `/api/tickets/:id/internal-notes` | `GET` | `IT_STAFF`, `ADMINISTRATOR` | `communications.ts` |
| `/api/tickets/:id/internal-notes` | `POST` | `IT_STAFF` | `communications.ts` |
| `/api/tickets/:id/appears-resolved` | `POST` | `REQUESTER` (own) | `communications.ts` |
| `/api/staff/tickets` | `GET` | `IT_STAFF` | `staff.ts` |
| `/api/staff/tickets/:id` | `GET` | `IT_STAFF`, `ADMINISTRATOR` | `staff.ts` |
| `/api/staff/tickets/:id/claim` | `POST` | `IT_STAFF` | `staff.ts` |
| `/api/staff/tickets/:id/owner` | `PATCH` | `IT_STAFF` | `staff.ts` |
| `/api/staff/tickets/:id/priority` | `PATCH` | `IT_STAFF` | `staff.ts` |
| `/api/staff/tickets/:id/status` | `PATCH` | `IT_STAFF` (Baseline) / `IT_STAFF`, `ADMINISTRATOR` (Lab 4 per D6; status transition only) | `staff.ts` |
| `/api/admin/users` | `GET`, `POST` | `ADMINISTRATOR` | `admin.ts` |
| `/api/admin/users/:id` | `PATCH` | `ADMINISTRATOR` | `admin.ts` |
| `/api/admin/users/:id/reset-password` | `POST` | `ADMINISTRATOR` | `admin.ts` |

> **Note on Decision D6 Scope:**  
> Administrator role authorization is strictly expanded for the status transition endpoint (`PATCH /api/staff/tickets/:id/status`) to enforce the formal Resolution Gate and ticket lifecycle evaluation (FR-04, BR-09, Handout Section 4.3).  
> Operational ticket assignment endpoints (`/claim`, `/owner`, `/priority`) are **not** expanded to Administrator and remain strictly restricted to `IT_STAFF`, preserving the Lab 3 baseline access matrix and preventing unnecessary scope changes.



