

## Craft v2: "Builder Canvas" Layout Redesign

### Concept

Flip the hierarchy: the **live preview is the hero**, not the form. The page feels like a workbench where you watch your puzzle materialize in real-time as you type. Clean, spacious, interactive — no visual clutter.

### Layout

```text
┌──────────────────────────────────────────────────┐
│  [← Back]   Create a Puzzle   [Inbox (3)]        │  Compact header row
├──────────────────────────────────────────────────┤
│                                                  │
│  ╔══ Type Selector ════════════════════════╗     │  Horizontal pill row
│  ║ 🔍 Word Search  ✏️ Fill-In  🧩 Cross...║     │  with type accent colors
│  ╚═════════════════════════════════════════╝     │  + difficulty badge
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │                                         │     │
│  │         🔲  LIVE PREVIEW CANVAS  🔲     │     │  Large centered preview
│  │         (puzzle builds in real-time)     │     │  with subtle grid animation
│  │                                         │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  ┌── Expandable Tool Panels ───────────────┐     │  Accordion sections below
│  │ ▸ Words / Content          [5 words]    │     │  the canvas, not beside it
│  │ ▸ Theme & Colors           🎂 Birthday  │     │
│  │ ▸ Settings                 Medium       │     │
│  │ ▸ Personal Touch           "From Mariah"│     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  ════════════════════════════════════════════     │
│  [Save Draft]    [ ✨ Generate Puzzle ]          │  Sticky bottom bar
│  ════════════════════════════════════════════     │
└──────────────────────────────────────────────────┘
```

**Post-generate (preview step):** The canvas stays in place but shows the final puzzle. Tool panels collapse and are replaced by share/challenge actions.

**On desktop (lg+):** The tool panels sit in a 2-column grid below the canvas for less scrolling. On mobile, they stack vertically as accordions.

### What changes

**Single file: `src/pages/CraftPreviewPage.tsx`** — full UI rewrite, same state/logic.

1. **Header row** — Inline `Back`, title, and Inbox button (replaces CraftNav pill + separate heading). Limit indicator as subtle text in the header.

2. **Type selector** — Horizontal scrollable row of compact pills (icon + label + accent color dot), not the large `CraftTypeCards`. On first visit (no type selected), show `CraftTypeCards` as the full-page hero. Once a type is picked, collapse to the pill bar so you can switch types without losing content.

3. **Canvas area** — Centered, padded card (~400px max on desktop) housing `CraftLivePreview` during content entry and `CraftPreviewGrid` after generation. Title/from shown as overlay text on the card. Subtle border glow using type accent color.

4. **Tool panels** — 4 collapsible `Accordion` sections below the canvas:
   - **Content** (words/phrase/clues input) — open by default
   - **Theme & Colors** (CraftThemePicker + CraftColorPicker)
   - **Settings** (CraftSettingsPanel)
   - **Personal Touch** (title, from, reveal message)
   
   Each shows a summary chip when collapsed (e.g., "5 words", "🎂 Birthday", "Medium").

5. **Sticky action bar** — Fixed bottom bar with Save Draft (left) and Generate (right). After generation: Share + Copy + Regenerate + Solve First.

6. **CraftStepper removed** — The flow is now fluid (no discrete steps). Type → fill content → generate → share all on one scrollable page. Back button returns to type cards if no content entered, otherwise confirms "start over."

7. **Animations** — Canvas pulses subtly when content changes (scale micro-bounce). Type pills animate on selection. Tool panels use accordion slide. Generate button has a sparkle shimmer.

### All preserved functionality

- CraftNav/Inbox (moved to header inline button)
- CraftTypeCards (shown on first visit, then compact pills)
- CraftThemePicker + word pre-fill + reveal templates
- CraftColorPicker + palette application
- CraftSettingsPanel (difficulty + toggles)
- Draft system (auto-save, manual save, resume, dirty indicators)
- Solve-First challenge mode
- Dropped words validation
- Regenerate with DB update
- Share/Copy with sent tracking
- Limit indicator + upgrade modal
- "Send one back" prefill from router state
- Theme + colorPalette in DB payload
- Start over / back navigation

### Technical details

- Uses existing `Accordion` from `@/components/ui/accordion`
- Type pills reuse `TYPE_OPTIONS` from `CraftTypeCards` for colors/labels
- Canvas border uses CSS variable `--craft-accent` from theme system
- Sticky bar uses `sticky bottom-0` with backdrop blur
- Mobile: single column, tool panels as full-width accordions
- Desktop: tool panels in 2-col grid, canvas max-width constrained

