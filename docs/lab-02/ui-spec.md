# Lab 2 UI Specification — Zen Green Theme

## 1. Color Tokens

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#006B3C` | App header background, primary buttons, strong emphasis |
| `--color-secondary` | `#0B7A46` | Active tab, focus ring accent, links, hover state |
| `--color-pale-green` | `#EAF6EF` | Selected row, success banner background, subtle section emphasis |
| `--color-bg` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Cards/panels, 1px `#E2E8E5` border, `box-shadow: 0 1px 3px rgba(0,0,0,.06)` |
| `--color-text` | `#1F2E27` | Body text (dark charcoal-green, not pure black) |
| `--color-error` | `#B3261E` | Error text/border |
| `--color-warning` | `#B7791F` (amber) | Warning callout/badge — never used as decoration |
| `--color-editable-bg` | `#FFFFFF` | Editable field background, `1px solid #C9D3CE` border |
| `--color-readonly-bg` | `#F1F0E8` | Read-only field background (warm ivory) — distinct from editable at a glance |

These live in `client/src/styles/theme.css` as CSS custom properties. No screen hardcodes a
hex value — every color reference goes through a token.

## 2. Typography and Spacing
- Font: system UI stack (`-apple-system, "Segoe UI", Roboto, sans-serif`)
- Base size 16px; `h1` 24px/700, `h2` 20px/600, label 14px/600, body 14px/400, helper/error text 13px/400
- Spacing scale: 4/8/12/16/24/32px — field vertical gap 16px, section gap 32px, card padding 24px

## 3. Field States
| State | Style |
|---|---|
| Editable | `--color-editable-bg`, `--color-editable` border, standard height (40px) |
| Read-only | `--color-readonly-bg`, no border-hover, cursor `default`, no focus ring |
| Invalid | Red (`--color-error`) border; message directly below the field, 13px, red text, prefixed with a small icon (not color alone) |
| Disabled | 50% opacity, `cursor: not-allowed`, no hover/focus state |
| Focused | 2px `--color-secondary` outline ring, visible for keyboard nav (never `outline: none` without a visible replacement) |

**Required-field marker:** red asterisk immediately after the label text. The asterisk
alone is never the only validation signal — the inline message below the field is
required regardless.

## 4. Button Hierarchy
| Type | Style | Example |
|---|---|---|
| Primary | Solid `--color-primary` bg, white text | Submit, Continue |
| Secondary | White bg, `--color-primary` border+text | Cancel, Clear Filters |
| Tertiary | Text-only, `--color-secondary` | "Change Requester" link |
| Destructive | White bg, `--color-error` border+text | Remove Attachment |
| Disabled | Any variant at 50% opacity, no pointer events | Submit while invalid |
| Busy | Primary style + inline spinner + label changes to "Submitting…", disabled | Submit while request in flight |

Icon-only buttons (e.g. attachment remove ✕) always carry an `aria-label` and a native
`title` tooltip — icons support, never replace, a text label per labsheet §8.3.

## 5. Application Shell & Navigation
- Header bar: `--color-primary` background, white "TokTickIT" wordmark (left), "My
  Tickets" / "Create Ticket" links (center), current Requester name + "Change" action +
  profile icon (right)
- Active page indicator: active nav link gets a `--color-secondary` underline + bold weight
- **Mobile (<768px):** header collapses to hamburger menu; nav links move into a slide-out
  panel; current Requester name stays visible in the collapsed bar

## 6. Screen: Development Requester Selection
Reference: labsheet §8.1 mockup.
- Centered card, max-width 480px, on `--color-bg`
- Icon + "Select Development Requester" heading + 1-line explanation text (exact wording
  from labsheet §8.1: "Select a Development Requester to test requester-specific ticket
  behavior. This is not a login screen. Authentication and role-based access will be
  introduced in Lab 3.")
- Dropdown (native `<select>` for keyboard/screen-reader support), label "Development
  Requester *"
- Pale-green info banner: "Only active development requesters are shown."
- Neutral gray info card: "Authentication coming in Lab 3" note
- Primary "Continue" button (disabled until a Requester is chosen), Secondary "Cancel"

**States:**
- Loading: dropdown replaced by a skeleton/spinner placeholder, Continue disabled
- Empty (no active Requesters): dropdown replaced by message "No development requesters
  are available. Contact an administrator." — Continue disabled
- API failure: pale-red banner "Unable to load requesters. Check your connection and try
  again," with a Retry button

## 7. Screen: Create Ticket
Reference: labsheet §8.2/8.3, Figure 1 layout logic.

**Field order (top to bottom):** Ticket Date (read-only, populated after save),
Requester (read-only, from selected context) → Category, Related System (grouped side by
side, "classification" group) → Summary (single-line, full width) → Description (textarea,
full width, resizable vertically only, min-height 120px) → Requested Priority (segmented
control or select: Low/Medium/High) → Attachments (drag-drop zone + file list) →
action row (Submit primary, Cancel secondary).

**Screen modes:**
- **Initial:** empty form, Submit disabled until required fields are valid
- **Validation failure:** invalid fields get red border + message below; focus moves to
  the first invalid field on submit attempt
- **Submitting:** Submit shows busy state (§4), all fields disabled, no double-submit
  possible
- **Success:** form replaced by a pale-green success panel showing the generated
  **Ticket Number** prominently + "View Ticket" / "Create Another" actions
- **API failure:** red banner above the form: "Unable to save your ticket. Please try
  again." — all entered field values remain exactly as typed (BR-09)
- **Invalid attachment:** file rejected inline in the attachment list with a red row +
  reason ("File type not supported" / "File exceeds 5 MB" / "Maximum 5 attachments
  reached"), rest of the form unaffected

**Attachment picker:** shows a list of staged files with name, size, and a ✕ remove
button per file; accepted-type hint text ("JPG, PNG, WEBP, PDF — up to 5MB, max 5 files")
always visible below the drop zone, not just on error.

## 8. Screen: My Tickets
Reference: labsheet §8.4 mockup.

**Top row:** search input (placeholder "Search by ticket number or summary…") + 3 filter
dropdowns (Category / Requested Priority / Current Status) + "Clear Filters" (secondary) +
"Create Ticket" (primary), right-aligned.

**Desktop (≥992px):** table — columns Ticket No., Created Date, Summary, Category,
Requested Priority (badge), Current Status (badge), Last Updated. Sortable column headers
show a sort-direction caret.

**Tablet/Mobile (<992px):** table becomes a stacked card list — one card per ticket,
Ticket No. + Status badge on top row, Summary below, Category/Priority/Date as small
label-value pairs beneath.

**Pagination:** bottom-right, "Showing X to Y of Z tickets" + Previous/page-number/Next
controls, current page visually distinct (`--color-primary` filled).

**States:**
- Loading: skeleton rows/cards (3-5 placeholders)
- **Empty** (zero tickets ever): centered message "You haven't created any tickets yet"
  + primary "Create Ticket" CTA — no table/filters shown
- **No results** (filters matched nothing): table header stays, body shows "No tickets
  match your filters" + secondary "Clear Filters" CTA
- Failure: red banner replacing the table, "Unable to load your tickets," Retry button

## 9. Screen: Requester Ticket Detail
Reference: labsheet §8.5.
- All Ticket fields shown **read-only** (readonly-field styling from §3), grouped in a
  card at the top: Ticket No., Ticket Date, Category, Related System, Requester,
  Requested Priority (badge), Current Status (badge), Summary, Description
- Visually separated section below (clear divider + heading "Attachments") containing
  attachment list + "Add Attachment" control
- **No** Comments/Notes/Actions Taken sections exist on this screen (excluded by scope)

**Attachment states:**
- Active: filename + size + Download button + Remove button (destructive style) — clicking
- Remove opens an inline reason prompt; entering a reason and confirming is the only
confirmation step required (no separate "Are you sure?" modal, per §11 decision)
- Uploading: progress indicator, disabled actions until complete
- Invalid (client-side rejected before upload): same inline red row as Create Ticket §7
- Removed: filename still shown, grayed out, "Removed — <reason>" label, no
  Download/Remove actions available (metadata retained per BR-10, not deletable further)
- Unavailable (download attempt on a removed/foreign file returns 404): toast "This file
  is no longer available"

## 10. Badge Rules (Requested Priority / Current Status)
| Value | Background | Text | Note |
|---|---|---|---|
| Priority: Low | pale green | dark green | |
| Priority: Medium | pale amber | dark amber | |
| Priority: High | pale red | dark red | |
| Status: New | pale blue-gray | dark gray | only status reachable in Lab 2 |

Every badge always shows its text label — color is never the sole indicator (accessibility
requirement, §8.8).

## 11. Responsive Rules
| Viewport | Behavior |
|---|---|
| Desktop ≥992px | Multi-column as described above; content max-width 1140px, centered |
| Tablet 768–991px | Two-column where practical (e.g. Category+Related System stay side by side); Summary/Description keep full width |
| Mobile <768px | Everything stacks vertically; buttons min touch target 44px; **no horizontal page scroll under any circumstance** |
| All sizes | No clipped labels, no overlapping messages, no hidden buttons, attachment filenames truncate with ellipsis + full name on hover/focus, never overflow |

## 12. Accessibility
- All form controls have a associated `<label>` (native `for`/`id`, not placeholder-only)
- Icon-only buttons: `aria-label` + tooltip (§4)
- Focus order follows visual/reading order; focus ring always visible (§3)
- Error messages are associated to their field via `aria-describedby`
- Status/priority conveyed by text label, not color alone (§10)
- Native `<select>` for dropdowns (screen-reader/keyboard support over custom widgets)

## 13. Visual Inspection Checklist
(Executed in Phase 7 against Playwright screenshots — same items as `tests.md` §4)
- [ ] No clipping, overlap, or unintended horizontal scroll at any of the 3 breakpoints
- [ ] Badge colors/labels consistent across Create Ticket, My Tickets, Ticket Detail
- [ ] Editable vs read-only fields visually distinguishable
- [ ] Validation message placement matches §3
- [ ] Button hierarchy matches §4 on every screen
- [ ] Screenshots match this document and the labsheet mockups, not personal memory

## 14. Screenshot Paths
```
artifacts/lab-02/screenshots/
├── create-ticket/    (desktop.png, tablet.png, mobile.png)
├── my-tickets/       (desktop.png, tablet.png, mobile.png)
└── ticket-detail/    (desktop.png, tablet.png, mobile.png)
```