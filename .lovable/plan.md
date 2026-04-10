

## Craft v2: Restore All Original Functionality

The current `/craft-v2` page has the new split-layout design but is missing significant functionality from the original `/craft` page. Here's what needs to be added back and adjusted.

### Missing Features to Restore

1. **Inbox (CraftNav + CraftInbox)** — The original has a Create/Inbox tab bar with draft count badge and full inbox (drafts/sent/received tabs). V2 has none of this.

2. **Theme Picker (CraftThemePicker)** — Occasion selection (birthday, anniversary, travel, etc.) with reveal message templates, word pre-fill suggestions, and accent styling. V2 has no theme support.

3. **Color Picker (CraftColorPicker)** — Palette selector that applies CSS custom properties for puzzle cell colors. Missing entirely.

4. **Draft System** — Auto-save drafts on content changes, manual "Save draft" button, resume from draft, draft dirty/saved indicators, active draft ID tracking. V2 has no draft support.

5. **Type Cards with Assigned Colors** — Original uses `CraftTypeCards` component with per-type accent colors (sky for word-search, emerald for word-fill, primary for crossword, violet for cryptogram), hover states, and detailed cards. V2 uses plain tab buttons.

6. **Solve-First / Challenge Timer** — Creator can solve their own puzzle to set a "time to beat" challenge. V2 has no challenge mode.

7. **Dropped Words Warning** — Original checks `droppedWords` from generator and shows a destructive toast. V2 skips this check.

8. **Stepper Progress** — `CraftStepper` component showing type → content → preview progression. V2 has no step indicator.

9. **Limit Indicator** — Compact `{remaining}/{limit} free · Unlimited with Plus` strip. V2 only shows limit info after generation.

10. **Start Over / Back Navigation** — Original has back buttons at each step and a "Start over" action on preview. V2 has no navigation between states.

11. **"Send one back" prefill** — Original reads `location.state.prefillTitle` for reply flows.

12. **Theme in payload** — Original includes `selectedTheme` and `colorPalette` in the DB payload. V2 omits these.

### Plan

**Single file change: `src/pages/CraftPreviewPage.tsx`** — Full rewrite that keeps the v2 split-layout shell but integrates all original functionality:

- **Add CraftNav** at top with Create/Inbox toggle and draft count badge
- **Add CraftInbox** view for drafts/sent/received management
- **Replace plain type tabs** with `CraftTypeCards` component (keeps hover colors, taglines, difficulty badges)
- **Add CraftStepper** progress bar between type → content → preview
- **Add CraftThemePicker** in left panel (content step) — occasion selection, reveal templates, word pre-fill
- **Add CraftColorPicker** in left panel below theme picker
- **Add draft system** — auto-save via `useEffect` timer, manual save button, `handleResumeDraft`, dirty/saved indicators, using `craftHistory` helpers
- **Add challenge/solve-first flow** — `CraftSolveFirst`-style UI on preview step, creator solve time tracking, DB update
- **Add dropped words check** in `handleGenerate` before DB insert
- **Add back/start-over navigation** at each step
- **Add limit indicator strip** (compact, under nav)
- **Include theme + colorPalette in payload** when saving to DB
- **Remove admin gate** (or keep as optional flag) so this becomes the production-ready page
- **Adjust spacing** — tighter vertical gaps (`py-6` not `py-8`), consistent `max-w-2xl` for left panel on mobile, proper gap between sections

### Layout Structure (v2 with all features)

```text
┌─────────────────────────────────────────┐
│  Header: "Create a Puzzle"              │
│  CraftNav: [Create] [Inbox (3)]         │
│  Limit indicator (free users)           │
├─────────────────────────────────────────┤
│  CraftStepper: type → content → preview │
├───────────────────┬─────────────────────┤
│  LEFT: Inputs     │  RIGHT: Preview     │
│  - Type cards     │  - Live preview     │
│  - Theme picker   │  - or Final puzzle  │
│  - Color picker   │  - Share actions    │
│  - Word/clue input│                     │
│  - Settings       │                     │
│  - Save draft     │                     │
│  - Generate CTA   │                     │
└───────────────────┴─────────────────────┘
```

On mobile, this collapses to single-column with the step-based flow preserved (type → content → preview, no split).

