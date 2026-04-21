

# Craft polish — preview elevation, copy rewrites, reveal promotion

Apply the uploaded refactor's intent on top of the CURRENT codebase. Preserve recent work (chevron-less type cards, share cascade with toasts, palette safety, unread badge).

## File 1: `src/components/craft/CraftLivePreview.tsx` — replace

Adopt the uploaded version wholesale. Brings:
- Elevated preview panel: `bg-card border-primary/15 shadow-sm` (was muted `bg-secondary/30`).
- Panel header bar with contextual label: **"Building…"** / **"Your puzzle so far"** / **"Preview unavailable"** (replaces "This is what they'll see").
- Row-staggered cell entrance via `craftCellIn` keyframes (28ms per row for grids, 20ms for word-search). `animKey` increments after each successful generation to replay the stagger.
- Animated bouncing dots `BuildingIndicator` with **"Building your puzzle…"** copy (replaces spinner + "Generating…").
- Letters render at full foreground opacity (was 70%).
- Subtle 3-dot shimmer in header when regenerating with an existing preview.
- Feedback copy rewritten: "keep going, the grid gets richer" / "your puzzle is ready to build" / "this will be a great puzzle".
- Cryptogram caption: "Your encoded message — solution shown in colour".

Inject `<style>` block with `craftCellIn` + `craftDotPulse` keyframes (scoped to the component, no global CSS edits).

## File 2: `src/components/craft/CraftSolveFirst.tsx` — replace

Adopt the uploaded copy rewrite verbatim:
- Header: "Set a challenge time" → **"Race them"**.
- Description: → **"Play it yourself and set a time they have to beat."**
- Primary button: "Solve it first" → **"Play it now"**.
- Secondary button: "Skip for now" → **"Send without a time"**.
- Solved state: → **"You set the bar: 2:14"** + **"They'll see your time when they start. Game on."**

Layout, co-equal button arrangement, and emerald solved-state styling unchanged.

## File 3: `src/components/craft/CraftTypeCards.tsx` — copy-only edit

**Do NOT re-add the chevron** (user explicitly removed it earlier; the upload's chevron is a regression). Apply only:
- Question above grid: → **"What kind of experience do you want to give them?"**
- All four taglines, recipient-framed:
  - word-search → **"They hunt for every word you hid"**
  - word-fill → **"A grid only your words can complete"**
  - crossword → **"Your knowledge, your clues — only you could write this"**
  - cryptogram → **"Your message, encoded — they have to earn it"**
- Footer copy: → **"Every type lets you include a personal message they read after solving"**

Keep current chevron-less single-row layout, hover accent line, all styling.

## File 4: `src/pages/CraftPuzzle.tsx` — targeted edits

Keep ALL recent infrastructure intact (`executeShare` cascade with sonner toasts, `shareState`/`copyLinkState` button-label flips, `attachPaletteToPayload` helper, palette ref + guarded restore, `unreadCount` badge, no manual save-draft button). Apply only:

### Step 2 (content) changes

**a. Word input copy** (line 517):
- Label: "Your words (names, memories, inside jokes)" → **"Words from their world"**
- Placeholder for both `word-fill` and `word-search`: → **"BARCELONA\nOCTOBER\nTHE BRIDGE\nPATRICK\nMIDNIGHT SWIM"** (use a `WORD_PLACEHOLDERS` const at file top so each type can diverge later; word-fill uses `"SUNDAY MORNING\nCOFFEE\nYOUR BACKYARD\nLATE SUMMER"`).

**b. Cryptogram placeholder** (line 537): → **"HAPPY BIRTHDAY FROM YOUR FAVOURITE PERSON"**.

**c. Promote reveal message OUT of the Personalize disclosure**. Insert directly between `CraftLivePreview` and the Personalize panel:
```tsx
<div className="space-y-1.5">
  <label className="text-xs font-medium text-foreground">What they'll read when they finish</label>
  <Input value={revealMessage} onChange={...} placeholder="Happy birthday — I hid the words just for you 🎂" maxLength={500} />
  <p className="text-[10px] text-muted-foreground/50">Optional — a personal message revealed only after solving</p>
</div>
```
Remove the duplicate reveal-message field from inside the Personalize panel (current lines 619–627).

**d. Personalize summary copy** (line 597): With reveal removed and color still inside, becomes:
**"title · theme · color · difficulty"**.

**e. Theme suggestion chip** — derive `activeTheme` and `showWordSuggestionChip` near other state, then render the chip directly under the word textarea (only for word-fill / word-search):
```tsx
const activeTheme = selectedTheme !== "none" ? getTheme(selectedTheme) : null;
const showWordSuggestionChip = !!activeTheme && (selectedType === "word-fill" || selectedType === "word-search");
```
Chip uses `activeTheme.wordSuggestions.join("\n")` via a small `handleWordSuggestions` helper (additive merge, dedupe). Renders as `text-[11px] text-primary` pill: **"✨ Fill {label} words"**.

**f. CTA label** stays **"Continue"** (already correct).

### Step 3 (preview) changes

**g. Personalized headline** — add above the puzzle preview hero card, replacing the small "Preview" label in the nav row's center cell with a full headline below the nav:
```tsx
<div className="text-center">
  <h2 className="font-display text-xl font-bold text-foreground">
    {puzzleTitle.trim() ? `"${puzzleTitle.trim()}" is ready` : "Your puzzle is ready to send"}
  </h2>
  {puzzleTitle.trim() && (
    <p className="text-xs text-muted-foreground mt-1">Here's exactly what they'll see</p>
  )}
</div>
```
Keep the nav row (Edit / Start over) but drop the centered "Preview" label since the headline now provides identity. Keep all subsequent ordering: hero → share block → CraftSolveFirst → reveal preview → limit → regenerate.

### Explicit non-changes (keep current behavior)

- `executeShare` + sonner toast cascade (`handleShare`, `handleCopyLink`).
- `shareButtonLabel` + `ShareIcon` flip-to-Check pattern.
- `attachPaletteToPayload` shared helper + guarded `restoreDefaultPalette`.
- `CraftColorPicker` inside Personalize panel.
- `CraftThemePicker` props (`onPrefillWords`, `showWordSection`) — do NOT revert to deleted `onWordSuggestions` / `showWordSuggestions` / `CraftTemplateSelector`.
- `unreadCount` badge logic.
- No manual "Save draft" button.

## Out of scope
- `CraftNav`, `CraftInbox`, `CraftSettingsPanel`, `CraftPreviewGrid`, `CraftThemePicker`, `CraftColorPicker`.
- `shareUtils.ts`, `craftShare.ts`, `craftHistory.ts`, `customPuzzles.ts`.
- Routes, layout, premium hooks.

## Verification
1. `/craft` step 1 — question reads "What kind of experience do you want to give them?"; cards have NO chevron; new taglines visible; footer mentions reveal message.
2. Step 2 — word label is "Words from their world"; placeholder shows BARCELONA / OCTOBER / THE BRIDGE; reveal message field is visible above Personalize, labeled "What they'll read when they finish".
3. Pick a theme → "✨ Fill Birthday words" chip appears under the word textarea; tapping it merges suggestions into the textarea.
4. Live preview panel: elevated card with header bar; cells stagger row-by-row on each new generation; "Building your puzzle…" with bouncing dots on first generation; subtle shimmer when regenerating over an existing preview; letters at full opacity.
5. Personalize summary reads "title · theme · color · difficulty" (reveal removed).
6. Step 3 — with title set: headline reads `"Happy Birthday" is ready` + "Here's exactly what they'll see"; without title: "Your puzzle is ready to send".
7. Send Puzzle on macOS → Messages opens AND "Sent ✓" toast AND button flips to "Sent ✓" (cascade preserved).
8. CraftSolveFirst reads "Race them" / "Play it now" / "Send without a time"; solved state reads "You set the bar: m:ss / They'll see your time when they start. Game on."
9. Palette: change color in Personalize → live preview recolors; Start over → palette restores once (no flicker if it was default).

