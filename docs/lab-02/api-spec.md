# Lab 2 API Contract Specification

## 1. Conventions
- Base path: `/api`
- JSON endpoints: `Content-Type: application/json`
- Upload endpoint: `multipart/form-data`, file field name `file`
- **Ownership parameter (`requesterId`):** query parameter on every Requester-scoped
  request. Body field only on `POST /api/tickets`, since that request already carries a
  JSON body — every other endpoint (GET, DELETE, multipart upload) has no natural JSON
  body, so `requesterId` stays a query parameter there for consistency.
- Standard error shape: `{ "error": "<MACHINE_CODE>", "message": "<human-readable>" }`
  (validation errors add a `fields` object, see §3.4)
- Per BR-03: `requesterId` is a **testing mechanism, not authentication** — every
  ownership check documented below is a placeholder for what Lab 3's real auth will
  enforce from a verified session instead.

## 2. HTTP Status Reference
| Status | Meaning | Used by |
|---|---|---|
| 200 | Successful retrieval / update | all GET, DELETE (soft-remove) |
| 201 | Resource created | POST ticket, POST attachment |
| 400 | Malformed request: missing/invalid field, missing `requesterId`, missing removal reason, invalid attachment type, attachment too large | most endpoints |
| 404 | Resource doesn't exist **or** exists but isn't owned by `requesterId` (indistinguishable, per BR-13) | ticket detail, attachments |
| 409 | Conflict: 5 active attachments already present; attachment already removed | attachment upload, soft-remove |
| 500 | Unexpected server error (DB down, etc.) — never leaks stack traces to the client | all |

## 3. Endpoints

### 3.1 `GET /api/requesters`
Active Development Requesters for the Selection screen.
- **Query:** none
- **200:** `[{ "id": 1, "name": "Jennifer Anderson" }, ...]` (only `active: true`, no `email`/other fields exposed)
- **500:** `{ "error": "INTERNAL_ERROR", "message": "Unable to load requesters" }`

### 3.2 `GET /api/related-systems`
- **Query:** none
- **200:** `[{ "id": 1, "name": "Corporate Laptop" }, ...]` (`active: true` only)
- **500:** same shape as above

### 3.3 `GET /api/categories`
Reused unchanged from Lab 1 — see `docs/lab-01` for original contract; response shape identical.

### 3.4 `POST /api/tickets`
Create a Ticket for the given Requester.
- **Body:**
```json
  { "requesterId": 1, "categoryId": 2, "relatedSystemId": 3,
    "summary": "Laptop battery drains quickly",
    "description": "Battery drains fast even when idle.",
    "requestedPriority": "MEDIUM" }
```
- **201:** full Ticket object incl. server-generated `id`, `ticketNumber`, `currentStatus: "NEW"`, `createdAt`, `updatedAt`, `attachments: []`
- **400 (validation):**
```json
  { "error": "VALIDATION_ERROR", "message": "One or more fields are invalid",
    "fields": { "summary": "Required, 1-150 characters" } }
```
  Triggers: missing/empty `summary` or `description` after trim, over length limit (BR-08), invalid `requestedPriority` enum, `categoryId`/`relatedSystemId` not found
- **400 (bad requester):** `requesterId` missing, not found, or belongs to an inactive Requester (BR-11)
- **500:** unexpected error

### 3.5 `GET /api/tickets` — list (My Tickets)
**Query:** `requesterId` (required) `search` `categoryId` `requestedPriority` `status` `sort` `order` `page` `pageSize` — full contract in §4 below
- **200:**
```json
  { "data": [ { "id": 1, "ticketNumber": "TKT-2026-000001", "summary": "...",
      "category": "Hardware", "requestedPriority": "MEDIUM", "currentStatus": "NEW",
      "createdAt": "2026-08-15T10:00:00Z" } ],
    "page": 1, "pageSize": 10, "total": 42, "totalPages": 5 }
```
- **400:** `requesterId` missing — `{ "error": "MISSING_REQUESTER", "message": "requesterId is required" }`

### 3.6 `GET /api/tickets/:id`
- **Query:** `requesterId` (required)
- **200:** full Ticket + `attachments` array, each item:
```json
  { "id": 5, "originalName": "screenshot.png", "mimeType": "image/png",
    "sizeBytes": 204800, "uploadedAt": "...", "removedAt": null, "removalReason": null }
```
  (`removedAt`/`removalReason` populated, `downloadUrl` omitted client-side, when soft-removed)
- **400:** `requesterId` missing
- **404:** Ticket doesn't exist, or exists but `requesterId` doesn't own it (BR-13)

### 3.7 `POST /api/tickets/:id/attachments`
Multipart upload, one file per call.
- **Query:** `requesterId` (required)
- **Body:** `multipart/form-data`, field `file`
- **201:** attachment metadata (same shape as §3.6 item)
- **400 (missing requester):** `{ "error": "MISSING_REQUESTER", "message": "requesterId is required" }`
- **400 (invalid type):** `{ "error": "UNSUPPORTED_TYPE", "message": "Allowed types: JPG, JPEG, PNG, WEBP, PDF" }`
- **400 (too large):** `{ "error": "FILE_TOO_LARGE", "message": "File exceeds the 5 MB limit" }`
- **404:** Ticket not found / not owned
- **409:** `{ "error": "ATTACHMENT_LIMIT", "message": "This ticket already has 5 active attachments" }`

### 3.8 `GET /api/attachments/:id`
Metadata only (works for removed attachments too — metadata must stay visible per BR-10).
- **Query:** `requesterId` (required)
- **200:** same shape as §3.6 item
- **404:** not found / not owned (via its parent Ticket's `requesterId`)

### 3.9 `GET /api/attachments/:id/download`
- **Query:** `requesterId` (required)
- **200:** file stream, `Content-Disposition: attachment; filename="<originalName>"`
- **404:** not found / not owned / **removed** (BR-10 — removed files are never downloadable, indistinguishable from "doesn't exist" to avoid leaking removal state to an unauthorized caller)

### 3.10 `DELETE /api/attachments/:id`
Soft-remove.
- **Query:** `requesterId` (required)
- **Body:** `{ "reason": "Wrong file, re-uploading correct one" }`
- **200:** updated metadata with `removedAt`/`removalReason` set
- **400:** `reason` missing/empty — `{ "error": "REASON_REQUIRED", "message": "A removal reason is required" }`
- **404:** not found / not owned
- **409:** `{ "error": "ALREADY_REMOVED", "message": "This attachment was already removed" }` (prevents silently overwriting an existing removal reason)

## 4. Ticket-List Query Contract (§6.1 of the labsheet)
| Param | Values | Default | Invalid input behavior |
|---|---|---|---|
| `search` | free text, matches `ticketNumber` OR `summary` (case-insensitive substring) | none | ignored if empty string |
| `categoryId` | Category id | none | ignored if not a valid id (no filter applied, not an error — BR-07) |
| `requestedPriority` | `LOW\|MEDIUM\|HIGH` | none | ignored if invalid |
| `status` | `NEW\|OPEN\|IN_PROGRESS\|RESOLVED\|CLOSED` | none | ignored if invalid (in Lab 2 practice only `NEW` ever exists) |
| `sort` | `createdAt\|ticketNumber\|requestedPriority\|currentStatus` | `createdAt` | falls back to default if invalid |
| `order` | `asc\|desc` | `desc` | falls back to default if invalid |
| `page` | positive integer | `1` | clamps to `1` if `<1` or non-numeric |
| `pageSize` | 1–50 | `10` | clamps to `10` if invalid, clamps to `50` if `>50` |

## 5. Traceability
Every endpoint above maps to at least one AC in `specification.md` §9 and at least one
test in `tests.md` (AC↔test matrix lives there, not duplicated here).