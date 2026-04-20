

# Craft Audit Refactor — apply the 5-file overhaul

Apply the user's deep audit. Use the uploaded files as the design intent, but reconcile against current project APIs (no `CraftTemplateSelector`, current `CraftThemePicker` props, unified `executeShare` cascade). Plus two refinements: drop the chevron from type cards, and add subtle share confirmation.

## Files

### 1. `src/components/craft/CraftTypeCards.tsx` — replace
Single-row cards with icon + label + difficulty badge + tagline.
- **No chevron icon.** The card is already the tap surface.
- Hover accent line (bottom 0.5px colored bar, opacity-60 on hover) is the only hover affordance besides icon scale + card shadow.
- Vertically centered content, `min-h-[80px]`, generous tap target.
- `TYPE_OPTIONS` export preserved.

### 2. `src/components/craft/CraftSolveFirst.tsx` — replace
- "Solve it first" + "Skip for now" as co-equal side-by-side `Button`s.
- Solved state: compact emerald row showing "Your time: m:ss · Can they beat you?".
- Drop the chevron-footer skip path.

### 3. `src/components/craft/CraftNav.tsx` — replace
- Prop renamed `draftCount` → `unreadCount`.
- Badge clamps to `9+`.

### 4. `src/components/craft/CraftInbox.tsx` — replace
- Smart default tab (`useMemo`): `received` if unread > 0, else `sent` if any, else `drafts`.
- Newly-solved sent items render an emerald banner: "🎉 They solved it! In m:ss".
- Received tab: "Title — from {name}" inline; primary CTA on `not_started`.
- Pass `onNavigate={() => {}}` to `EmptyCraftDrafts` (current optional prop).

### 5. `src/pages/CraftPuzzle.tsx` — replace

**Removed**:
- `CraftStepper` import + render.
- Page subtitle.
- Manual `Save draft` button + `draftSaved`/`draftDirty` state.
- "No account needed" copy.
- `CraftColorPicker` usage + palette state + reset effect.

**Restructured**:
- Single h1 "Create a Puzzle", no subtitle.
- `CraftNav` receives `unreadCount` from `loadReceivedItems().filter(r => r.status === "not_started").length`.
- **Step 2 (content)**: primary input (words/phrase/clues) + Generate visible; everything else inside collapsed `Personalize` disclosure (`Palette` icon, ChevronDown/Up).
- **Step 3 (preview)** order: nav row → puzzle hero card → **Send Puzzle + Copy link block** → `CraftSolveFirst` → reveal preview → free-tier limit → Regenerate (outline button with `RefreshCw` icon).

**Reconciliation with current project APIs**:
- Drop `CraftTemplateSelector` (deleted from codebase). Use `CraftThemePicker` with current props: `onPrefillWords` and `showWordSection`.
- Use the project's share cascade: `executeShare(text, shareUrl)` from `@/lib/shareUtils`; build text via `buildCraftShareText(title, from, url, type, creatorSolveTime)` from `@/lib/craftShare` (positional args).
- `handleCopyLink` keeps direct clipboard (link only, no surrounding text).

**Share confirmation (NEW refinement)**:
- After `executeShare` returns:
  - `"shared"` → `toast.success("Sent ✓")` + briefly set `shareSuccess = "shared"` for 2s; button label flips to "Sent ✓" with `Check` icon during that window.
  - `"copied"` → `toast.success("Link copied")` + `shareSuccess = "copied"` for 2s; button label flips to "Copied ✓".
  - `"error"` → `toast.error("Couldn't share — try again")`.
- After `handleCopyLink` (the explicit copy-link button): `toast.success("Link copied")` + the copy button briefly shows `Check` icon + "Copied" for 2s.
- Use `sonner` `toast` (already mounted). Confirmation is non-blocking, no modal, no flow interruption. `recordSent()` still fires on `shared`/`copied`.

## Out of scope
- `CraftSettingsPanel`, `CraftLivePreview`, `CraftThemePicker`, `CraftPreviewGrid` internals.
- `shareUtils.ts` cascade implementation.
- Empty-state components.
- Routes, Layout, premium hooks.

## Verification
1. `/craft` step 1 — 4 single-row type cards, **no chevron**, hover shows only the bottom accent line + icon scale.
2. Step 2 — only primary input + Generate visible; "Personalize" expands to title/from/reveal/theme/settings.
3. Step 3 — Send Puzzle is the second visible element; Regenerate is a visible outline button.
4. Tap Send Puzzle on macOS Chrome → Messages.app opens AND a "Sent ✓" toast appears AND the button briefly shows "Sent ✓" with check icon.
5. Tap Send Puzzle on Windows → clipboard fallback fires AND a "Link copied" toast appears AND button briefly shows "Copied ✓".
6. Tap Copy link → "Link copied" toast + button briefly shows check icon.
7. Inbox defaults to Received when unread exists, Sent when not, Drafts as last fallback.
8. Newly-solved sent item shows emerald "They solved it!" banner.
9. Tab badge reflects unread received count.

