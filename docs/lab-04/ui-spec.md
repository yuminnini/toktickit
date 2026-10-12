# TokTickIT — Lab 4 UI Specification

- **Version:** 1.0-draft
- **Date:** 2026-10-12
- **Status:** Planned (Spec DD Stage)
- **Design Language:** Zen Green Design System

---

## 1. Zen Green Design Language & Tokens

Preserve and reuse the established Zen Green CSS tokens from `client/src/styles/theme.css`:
- **Primary Brand:** `--color-primary: #006B3C`, `--color-secondary: #0B7A46`, `--color-accent: #2E7D32`
- **Neutrals & Surfaces:** `--color-bg: #F5F7F6`, `--color-surface: #FFFFFF`, `--color-text: #1F2E27`, `--color-text-muted: #5C6E66`
- **Border & Dividers:** `--color-border: #DDE3E0`, `--color-border-subtle: #EDF1EF`
- **Form States:**
  - Editable Background: `--color-editable-bg: #FFFFFF`, Border: `--color-editable-border: #C9D3CE`
  - Read-Only Background: `--color-readonly-bg: #F1F0E8`, Text: `--color-readonly-text: #4A5751`
- **Status Badges (Text + Non-Color Icon/Label):**
  - `NEW`: Sky Blue (`#0D6EFD`, bg: `#E7F1FF`)
  - `OPEN`: Teal (`#0AA2C0`, bg: `#E0F7FA`)
  - `IN_PROGRESS`: Amber (`#D97706`, bg: `#FEF3C7`)
  - `WAITING_FOR_REQUESTER`: Purple (`#6F42C1`, bg: `#F3E8FF`)
  - `RESOLVED`: Green (`#198754`, bg: `#D1E7DD`)
  - `CLOSED`: Gray (`#6C757D`, bg: `#E2E3E5`)
  - `REOPENED`: Coral (`#FD7E14`, bg: `#FFEAD9`)
  - `CANCELLED`: Slate Gray (`#495057`, bg: `#E9ECEF`)
- **Focus Indicator:** Visible 2px outline in `--color-primary` with 2px offset on all interactive elements.

---

## 2. Navigation & Role Routes

- Top Navigation Bar includes active-page indicators:
  - **Requester Navigation:** `Dashboard` (`/dashboard`), `My Tickets` (`/my-tickets`), `Create Ticket` (`/tickets/new`), `Profile / Logout`.
  - **IT Staff Navigation:** `Dashboard` (`/dashboard`), `Staff Queue` (`/staff/tickets`), `Create Ticket` (`/tickets/new`), `Profile / Logout`.
  - **Administrator Navigation:** `Dashboard` (`/dashboard`), `Staff Queue` (`/staff/tickets`), `User Management` (`/admin/users`), `Profile / Logout`.
- Deep Linking & Route Guards:
  - Root route `/` dynamically routes authenticated users to `/dashboard`.
  - Unauthenticated users attempting to access `/dashboard` or protected screens are redirected to `/login`.

---

## 3. IT Staff & Admin Dashboard Screen (`/dashboard`)

Based on the layout in Handout Section 8.1:
```
+-----------------------------------------------------------------------------------+
|  [Logo] TokTickIT    [Dashboard]   [Create Ticket]               [Profile (Staff)]|
+-----------------------------------------------------------------------------------+
|  Welcome back, Michael!                                            [Refresh]      |
|  Here's what's happening with your queue today.                                   |
|                                                                                   |
|  +-----------+  +-----------+  +-----------+  +-----------+  +-----------------+  |
|  | New       |  | Open      |  |In Progress|  |Waiting Req|  | My Assigned     |  |
|  |    14     |  |    23     |  |    18     |  |     7     |  |       16        |  |
|  +-----------+  +-----------+  +-----------+  +-----------+  +-----------------+  |
|                                                                                   |
|  [My Recent Tickets]               [View all]  |  [Quick Actions]                 |
|  TKT-2026-00034 Laptop battery... [In Prog]   |  [+] Create Ticket               |
|  TKT-2026-00030 Printer offline   [Open]      |  [Q] Search Tickets              |
|  TKT-2026-00028 Outlook freezing  [In Prog]   |  [#] My Queue                    |
|  TKT-2026-00023 Phone not ringing [Open]      |                                  |
|  TKT-2026-00015 VPN drops         [Resolved]  |                                  |
+-----------------------------------------------------------------------------------+
```

### 3.1 Metric Cards (5 Cards)
- Card 1: **New** (Count, badge, click drill-down to `/staff/tickets?status=NEW`)
- Card 2: **Open** (Count, click drill-down to `/staff/tickets?status=OPEN`)
- Card 3: **In Progress** (Count, click drill-down to `/staff/tickets?status=IN_PROGRESS`)
- Card 4: **Waiting for Requester** (Count, click drill-down to `/staff/tickets?status=WAITING_FOR_REQUESTER`)
- Card 5: **My Assigned** (Count, highlight background, click drill-down to `/staff/tickets?owner=me`)
- Accessible attributes: `role="button"`, `tabindex="0"`, descriptive `aria-label`.

### 3.2 My Recent Tickets Panel
- Compact table displaying: Ticket Number (link to detail), Summary, Status Badge, Updated timestamp.
- "View all" link in the header routes to full `/staff/tickets`.
- Empty state: "No recent tickets in queue" with clean SVG icon.

### 3.3 Quick Actions Panel
- Action 1: **Create Ticket** -> `/tickets/new`
- Action 2: **Search Tickets** -> `/staff/tickets` (focus search input)
- Action 3: **My Queue** -> `/staff/tickets?owner=me`

### 3.4 Administrator Extension
- If logged in as `ADMINISTRATOR`, an additional concise card or summary block displays **System User Accounts**: Total Users, Active Staff, Inactive Accounts with link to `/admin/users`.

---

## 4. Requester Dashboard Screen (`/dashboard`)

Based on the layout in Handout Section 8.2:
```
+-----------------------------------------------------------------------------------+
|  [Logo] TokTickIT    [My Tickets]  [Create Ticket]           [Profile (Requester)]|
+-----------------------------------------------------------------------------------+
|  Welcome, Jennifer!                                                               |
|  Here's the latest on your requests.                                              |
|                                                                                   |
|  +----------------+  +----------------+  +----------------+  +-----------------+  |
|  | My Open Tickets|  | In Progress    |  | Resolved       |  | Closed          |  |
|  |       3        |  |       2        |  |       5        |  |       12        |  |
|  | [View all]     |  | [View all]     |  | [View all]     |  | [View all]      |  |
|  +----------------+  +----------------+  +----------------+  +-----------------+  |
|                                                                                   |
|  [My Recent Tickets]               [View all]  |  [Quick Actions]                 |
|  TKT-2026-00034 Laptop battery... [In Prog]   |  [+] Create Ticket               |
|  TKT-2026-00022 Request software  [Resolved]  |      Submit a new request        |
|  TKT-2026-00021 Need new monitor  [In Prog]   |                                  |
|  TKT-2026-00005 Email not syncing [Resolved]  |  [o] View My Tickets             |
|  TKT-2026-00001 Password reset    [Closed]    |      Track existing requests     |
+-----------------------------------------------------------------------------------+
```

### 4.1 Metric Cards (4 Cards)
- Card 1: **My Open Tickets** (Count, click drill-down to `/my-tickets?status=open`)
- Card 2: **In Progress** (Count, click drill-down to `/my-tickets?status=IN_PROGRESS`)
- Card 3: **Resolved** (Count, click drill-down to `/my-tickets?status=RESOLVED`)
- Card 4: **Closed** (Count, click drill-down to `/my-tickets?status=CLOSED`)

### 4.2 My Recent Tickets Panel
- Compact table displaying tickets owned exclusively by the authenticated requester.
- Columns: Ticket Number, Summary, Status Badge, Updated timestamp, Action link.
- Empty state: "You have not submitted any tickets yet." with a direct button to "Submit a Ticket".

### 4.3 Quick Actions Panel
- Action 1: **Create Ticket** -> `/tickets/new`
- Action 2: **View My Tickets** -> `/my-tickets`

---

## 5. Actions Taken on Ticket Detail Screen

### 5.1 Placement & Structure
- Section Title: **Actions Taken**
- Subtitle: "Technical maintenance logs and operational records performed by IT Staff."
- Action Button (IT Staff/Admin only): `+ Record Action Taken`

### 5.2 Actions Taken List / Table
Each Action Taken line displays:
- **Action Date/Time:** Localized format (e.g. `Oct 12, 2026, 09:30 AM`).
- **Performed By:** Name + Role badge (e.g. `Alex Technician [IT Staff]`).
- **Description:** Clear technical description of work done.
- **Result:** Result or diagnosis outcome.
- **Follow-Up Flag & Note:**
  - If `followUpRequired=true`: Yellow/Amber badge `Follow-Up Required` followed by a callout box containing the `followUpNote`.
  - If `followUpRequired=false`: Subtle gray badge `No Follow-Up`.
- **Attachment Notes:** Italicized note indicating related file (e.g. `Attachment: switch-diagnostic-log.txt`).
- **Edit Action:** `Edit` button (IT Staff/Admin only).

### 5.3 Create / Edit Action Form (Modal or Inline Drawer)
- **Performed By:** Read-only indicator showing the logged-in user name (Cannot be changed).
- **Action Date & Time:** `<input type="datetime-local">` pre-filled with current date/time.
- **Action Description:** `<textarea>` (Required, min 3 chars).
- **Result:** `<textarea>` (Required, min 3 chars).
- **Follow-Up Required? Toggle:** Checkbox or switch toggle (`followUpRequired`).
- **Follow-Up Note:** `<textarea>` (Conditionally enabled).
  - When switch is ON: Required with red asterisk `*`, error validation message if submitted empty.
  - When switch is OFF: Disabled and grayed out.
- **Attachment Notes:** `<input type="text">` placeholder "e.g., refer to screenshot diagnostic.png".
- **Form Controls:** `Save Action` (with loading spinner on submission) and `Cancel`.

### 5.4 Requester View Mode
- Requesters see all Actions Taken lines for their own ticket in full read-only mode.
- The `+ Record Action Taken` and `Edit` buttons are strictly hidden from the DOM.

---

## 6. Ticket Workflow & Resolution Feedback

- **Status Transition Controls:**
  - Dropdown or button group displaying only valid transitions from the current status (BR-10).
  - Status change confirmation displaying: "Change status from [Current Status] to [New Status]?".
- **Resolution Gate Feedback:**
  - Requester screen shows "Problem Appears Resolved" toggle button. Clicking displays an informative message: "Thank you for confirming! An IT Staff member will review and formally resolve the ticket." The status badge remains in its current status.
  - IT Staff screen enables the "Resolve Ticket" action when appropriate.
- **Stale Concurrency Handling (HTTP 409):**
  - When a status change or ticket mutation returns HTTP 409, a warning banner appears: "This ticket was modified by another user while you were viewing it. Please reload to see the latest changes."
  - Button `Reload Latest Data` refreshes ticket state from server safely without losing unsaved form drafts where possible.

---

## 7. Responsive Breakpoints & Rules

1. **Desktop (≥1024px / 1280px):**
   - 4 or 5 metric cards aligned horizontally in a single responsive CSS grid row (`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`).
   - Two-column dashboard layout: 70% Recent Tickets table, 30% Quick Actions sidebar.
   - Actions Taken displayed as a full-width structured table with expanded columns.
2. **Tablet (768px – 1023px):**
   - Metric cards display in a 2x2 or 2x3 grid.
   - Dashboard layout stacks vertically: Recent Tickets table on top, Quick Actions beneath.
   - Actions Taken table enables responsive card/row wrap.
3. **Mobile (375px – 767px):**
   - Metric cards stack vertically (1 column), full width, with large touch targets (min 44px height).
   - Recent Tickets display as compact card items instead of multi-column table to eliminate horizontal window scrolling.
   - Actions Taken display as stacked event cards with clear border dividers.
   - Form inputs and action buttons expand to 100% width.

---

## 8. Accessibility & Quality Checklist

- [ ] **Color Contrast:** All text meets WCAG AA standard (contrast ratio ≥ 4.5:1 against surface background).
- [ ] **Visible Focus:** All buttons, cards, links, and form controls have a high-contrast visible focus outline (`outline: 2px solid #006B3C; outline-offset: 2px;`).
- [ ] **Screen Reader Support:** Metric cards have descriptive `aria-label`s (e.g. `aria-label="14 New Tickets, click to view"`).
- [ ] **Non-Color Status Cues:** All badges use distinct text labels and iconography, never color alone.
- [ ] **Overflow Prevention:** `overflow-x: hidden` on viewport body; table containers use `overflow-x: auto` with internal wrapping so pages never horizontally scroll.
- [ ] **Double Submission Prevention:** Submit buttons disable and display loading spinner during pending API requests.
