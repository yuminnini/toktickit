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
- **Validation Rules:**
  - `actionDateTime`: Optional string. If provided, must be valid ISO-8601 date; defaults to `now()`.
  - `description`: Required string, 3 to 2000 characters.
  - `result`: Required string, 3 to 2000 characters.
  - `followUpRequired`: Required boolean (defaults to `false` if omitted).
  - `followUpNote`: **Mandatory** if `followUpRequired` is `true` (min 3 characters). If `false`, can be omitted or null.
  - `attachmentNotes`: Optional string, max 500 characters.
  - `performedById`: Extracted automatically from session user.
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
  "createdAt": "2026-10-12T09:45:12.000Z",
  "updatedAt": "2026-10-12T09:45:12.000Z"
}
```
- **Error Responses:**
  - `400 VALIDATION_ERROR`: Missing description, result, or missing followUpNote when followUpRequired is true.
  - `403 FORBIDDEN`: User role is `REQUESTER` or staff user is inactive.
  - `404 NOT_FOUND`: Target ticket does not exist.

---

### 2.3 Update Action Taken
- **Method & Path:** `PATCH /api/actions/:id`
- **Access Control:** `IT_STAFF`, `ADMINISTRATOR` (Active users only). Requesters return `403 FORBIDDEN`.
- **Headers:** `Content-Type: application/json`, `X-CSRF-Token: <token>`
- **Request Body (Partial Update):**
```json
{
  "description": "Updated description with further details.",
  "result": "Verified cable replacement resolved packet drops.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": null
}
```
- **Validation Rules:**
  - Same field validation as Create.
  - If `followUpRequired` is updated to `true`, `followUpNote` must be non-empty.
- **Success Response (200 OK):**
  - Returns updated Action Taken record.
- **Error Responses:**
  - `400 VALIDATION_ERROR`: Field validation failed.
  - `403 FORBIDDEN`: Unauthorized role.
  - `404 NOT_FOUND`: Action Taken record with given ID does not exist.

---

## 3. Dashboard Endpoints

### 3.1 Requester Dashboard API
- **Method & Path:** `GET /api/dashboard/requester`
- **Access Control:** Authenticated `REQUESTER`. (Staff/Admin calling this endpoint receive their own requester data if tickets exist or empty counts).
- **Success Response (200 OK):**
```json
{
  "totalOpen": 3,
  "waitingForRequester": 1,
  "recentlyResolved": 5,
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
  - `totalOpen`: `COUNT(*)` where `requesterId = user.id` AND `currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`.
  - `waitingForRequester`: `COUNT(*)` where `requesterId = user.id` AND `currentStatus = 'WAITING_FOR_REQUESTER'`.
  - `recentlyResolved`: `COUNT(*)` where `requesterId = user.id` AND `currentStatus = 'RESOLVED'` within the past 30 days.
  - `recentlyUpdated`: Top 5 tickets ordered by `updatedAt DESC` for the authenticated requester.

---

### 3.2 IT Staff & Admin Dashboard API
- **Method & Path:** `GET /api/dashboard/staff`
- **Access Control:** `IT_STAFF`, `ADMINISTRATOR`. Requesters return `403 FORBIDDEN`.
- **Success Response (200 OK) for IT Staff:**
```json
{
  "unassigned": 14,
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
  "unassigned": 14,
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
  - `unassigned`: `COUNT(*)` where `ticketOwnerId IS NULL` AND `currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`.
  - `myAssigned`: `COUNT(*)` where `ticketOwnerId = user.id` AND `currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`.
  - `byStatus`: Aggregated counts grouped by `currentStatus`.
  - `byPriority`: Aggregated counts of active tickets grouped by `itPriority`.
  - `recentQueue`: Top 5 active tickets (`currentStatus NOT IN ('CLOSED', 'CANCELLED')`) ordered by `updatedAt DESC`.

---

## 4. Ticket Status Workflow, Resolution Gate & Concurrency

### 4.1 Status Transition Endpoint
- **Method & Path:** `PATCH /api/tickets/:id/status`
- **Access Control:** `IT_STAFF`, `ADMINISTRATOR`. Requesters are restricted.
- **Headers:** `Content-Type: application/json`, `X-CSRF-Token: <token>`
- **Request Body:**
```json
{
  "status": "RESOLVED",
  "expectedVersion": 2,
  "resolutionNote": "Replaced faulty switch; verified connection stable."
}
```
- **Resolution Gate Rule:**
  - Transitioning to `RESOLVED` requires `IT_STAFF` or `ADMINISTRATOR`. Requesters attempting to set status to `RESOLVED` receive `403 FORBIDDEN` (`RESOLUTION_RESTRICTED`).
- **Permitted Transition Check:**
  - The status transition must follow the permitted state machine (BR-10). If invalid (e.g. `NEW` -> `RESOLVED` directly), returns `400 INVALID_TRANSITION`.
- **Optimistic Concurrency Check:**
  - If `expectedVersion != ticket.version`, transaction aborts and returns `409 VERSION_CONFLICT`.
  - On success, `version` is incremented by 1.
- **Success Response (200 OK):**
```json
{
  "id": 12,
  "ticketNumber": "TKT-2026-00012",
  "currentStatus": "RESOLVED",
  "version": 3,
  "updatedAt": "2026-10-12T10:30:00.000Z"
}
```

---

## 5. Preservation of Existing APIs (Lab 1–3)
The following approved endpoints remain functional and unmodified:
- `GET /api/health`
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/auth/csrf`, `POST /api/auth/change-password`
- `GET /api/categories`, `GET /api/related-systems`
- `GET /api/tickets`, `POST /api/tickets`, `GET /api/tickets/:id`
- `GET /api/staff/queue`
- `POST /api/tickets/:id/comments`, `GET /api/tickets/:id/comments`
- `POST /api/tickets/:id/notes`, `GET /api/tickets/:id/notes`
- `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`, `DELETE /api/attachments/:id`
- `PATCH /api/tickets/:id/owner`, `PATCH /api/tickets/:id/priority`, `POST /api/tickets/:id/appears-resolved`
- `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`
