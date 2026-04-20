

# Refine Craft content step

Tighten copy, add color palette inside Personalize, and add subtle preview framing. No layout/flow changes.

## File: `src/pages/CraftPuzzle.tsx`

### 1. Primary CTA
`"Preview Puzzle"` → `"Continue"`. Loading label unchanged.

### 2. Input label + placeholder examples
- Label: `"Your words (one per line or comma-separated)"` → `"Your words (names, memories, inside jokes)"`.
- Placeholders for word-search and word-fill: `"birthday\nnashville\nbeach\ntravel\nsummer"`.

### 3. Reintroduce color palette inside Personalize
Add imports:
```tsx
import { CraftColorPicker, CRAFT_PALETTES, applyPalette } from "@/components/craft/CraftColorPicker";
```
Add state:
```tsx
const [colorPalette, setColorPalette] = useState<string>("default");
```
Render `<CraftColorPicker selected={colorPalette} onSelect={...} />` inside the Personalize panel, below `CraftSettingsPanel`.

**Palette application safety**:
- The picker's `onSelect` handler only runs in response to a user click (already client-only), and calls `applyPalette` from the click handler — never inside render.
- Wrap the document mutation in a `typeof document !== "undefined"` guard inside the `onSelect` handler before calling `applyPalette`.
- Cleanup `useEffect` on unmount restores the default palette, but **guarded**: only call `applyPalette(CRAFT_PALETTES[0])` if `colorPalette !== "default"` at unmount time (read via ref to avoid stale closure). This prevents redundant DOM writes during rapid step transitions and avoids flicker when the user never changed the palette.
- `handleStartOver` and `resetToCreate` reset state to `"default"` and call the guarded restore (only if currently non-default).

**Payload consistency — shared helper**:
Add a single helper used by both generate and regenerate:
```tsx
const attachPaletteToPayload = (payload: Record<string, unknown>) => {
  if (colorPalette && colorPalette !== "default") {
    (payload as Record<string, unknown>).colorPalette = colorPalette;
  }
  return payload;
};
```
Both `handleGenerate` and `handleRegenerate` call `attachPaletteToPayload(payload)` immediately before persisting to Supabase, so the two paths cannot diverge.

### 4. Personalize summary copy — accuracy check
Difficulty IS rendered inside the Personalize panel today (via `CraftSettingsPanel`). With color now added, summary line 556 becomes:
`"title · reveal message · theme · color · difficulty"`.

## File: `src/components/craft/CraftLivePreview.tsx`

### 5. Preview framing label
Replace `"Live Preview"` header label with `"This is what they'll see"`. Keep `text-[10px] font-semibold uppercase tracking-wider` and use `text-muted-foreground/70` for subtlety. Loader spinner stays.

### 6. Helper feedback copy
In `validateWords`, the 5–8 words case message: `"Perfect for a satisfying puzzle"` → `"Nice balance — fun to solve"`.

## Out of scope
- Step flow, header, nav, share/inbox/preview steps.
- `CraftColorPicker` swatch UI (already swatch-style).
- `CraftThemePicker`, `CraftSettingsPanel` internals.

## Verification
1. `/craft` → pick type → Step 2.
2. Input label reads "Your words (names, memories, inside jokes)"; placeholder shows the new examples.
3. Live preview header reads "This is what they'll see" (subtle).
4. Entering 5–8 words shows "Nice balance — fun to solve".
5. Personalize → expand → swatch color picker visible; selecting Ocean instantly recolors the live preview grid; collapsed summary reads "title · reveal message · theme · color · difficulty".
6. Primary CTA reads "Continue".
7. Generate → recipient page renders chosen palette; Regenerate preserves the same palette (shared helper path).
8. Start over / unmount with default palette → no DOM mutation (no flicker); start over with non-default → palette resets cleanly.

