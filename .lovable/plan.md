

## Craft History/Inbox System — Plan

### Overview

Add a lightweight, localStorage-based history system to the Craft page with two views: **Create** (existing flow) and **Inbox** (Drafts + Sent). No authentication required, no changes to the private lab.

### Storage

All data lives in `localStorage` — no new database tables needed for v1.

- **Drafts**: Auto-saved snapshots of in-progress puzzles (type, title, from, content inputs, reveal message)
- **Sent**: Recorded after successful share/copy, storing metadata + share URL

### New Files

1. **`src/lib/craftHistory.ts`** — Storage utility
   - Types: `CraftDraft`, `CraftSentItem`
   - `CraftDraft`: `{ id, type, title, from, wordInput, phraseInput, clueEntries, revealMessage, updatedAt }`
   - `CraftSentItem`: `{ id, shareId, type, title, from, revealMessage, shareUrl, sentAt }`
   - Functions: `saveDraft`, `loadDrafts`, `deleteDraft`, `loadDraft`, `addSentItem`, `loadSentItems`, `deleteSentItem`
   - Keys: `puzzlecraft-craft-drafts`, `puzzlecraft-craft-sent`

2. **`src/components/craft/CraftInbox.tsx`** — Inbox view component
   - Two tabs: **Drafts** | **Sent**
   - Drafts tab: list of saved drafts with type label, title (or "Untitled"), last edited time, actions (resume editing, delete)
   - Sent tab: list of sent puzzles with title, type, sent date, copy-link-again button
   - Empty states for both tabs
   - "Received" tab placeholder (disabled, labeled "Coming soon")

3. **`src/components/craft/CraftNav.tsx`** — Simple secondary nav
   - Two buttons: **Create** | **Inbox**
   - Badge on Inbox showing draft count (if > 0)
   - Sits below the page header, above the stepper/content

### Modified Files

4. **`src/pages/CraftPuzzle.tsx`**
   - Add `view` state: `"create" | "inbox"` (default `"create"`)
   - Render `CraftNav` to toggle between views
   - When `view === "inbox"`, render `CraftInbox` instead of the create stepper flow
   - **Auto-save draft**: debounced save (2s) whenever content fields change during `step === "content"`. Generate a draft ID on entering content step (or reuse if editing a draft)
   - **Resume draft**: `CraftInbox` calls `onResumeDraft(draft)` which populates all fields and sets `step = "content"`
   - **On successful send/share**: move draft to sent list (call `addSentItem`, `deleteDraft`), auto-save sent record with shareUrl
   - **Delete draft**: remove from localStorage, refresh list

5. **`src/lib/craftShare.ts`**
   - No changes needed; reuse `buildCraftShareUrl` for sent item URLs

### UI Details

- CraftNav is a minimal pill/tab bar: two equal-width buttons, active state uses `bg-primary/10 text-primary`
- Inbox draft cards: rounded border cards showing puzzle type badge, title, "edited 2 min ago" relative time, with Resume and Delete actions
- Inbox sent cards: similar cards showing type badge, title, sent date, and a small "Copy link" button
- Delete uses a simple confirmation (click once = "Delete?", click again = confirmed)
- Draft count badge: small primary-colored dot/number on the Inbox tab

### Auto-Save Logic

- On entering content step, create or reuse a draft ID
- Every 2 seconds (debounced), save current form state to localStorage under that draft ID
- When user completes generation + share, convert draft to sent item
- When user navigates away (back to type step), keep draft saved
- When user taps "Start over", delete the active draft

### Behavior Summary

| Action | Result |
|--------|--------|
| Start creating, leave mid-way | Draft auto-saved |
| Open Inbox > Drafts > Resume | Fields restored, back to content step |
| Complete + Send/Copy | Draft removed, added to Sent list |
| Inbox > Sent > Copy link | Copies shareUrl again |
| Start over | Active draft deleted |

### Technical Details

- Drafts stored as array in localStorage, max 20 (oldest auto-pruned)
- Sent items stored as array, max 50
- Relative time formatting: use simple helper (seconds/minutes/hours/days ago)
- No database changes, no new routes, no auth required
- Does not touch private lab routes or gameplay engine

