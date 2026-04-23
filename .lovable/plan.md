

# Crossword + Fill-In UX Polish (Safe Tier)

UI clarity and accessibility improvements only — no changes to solving logic, scoring, validation, or puzzle behavior.

## Files

- `src/components/puzzles/CrosswordGrid.tsx`
- `src/components/puzzles/FillInGrid.tsx`
- `src/components/puzzles/PuzzleToolbar.tsx`

## Changes

### 1. Active clue bar — all devices
Lift the active-clue chip out of the `needsKeyboard` mobile gate in both grids. Render above the grid on every viewport as a `rounded-full bg-secondary/40 text-sm px-3 py-1` pill containing the clue number, direction, and text.

### 2. Direction toggle (Across / Down)
Render two small pill buttons next to the clue chip on all viewports. Active button gets `bg-primary/10 text-primary` (subtle, no heavy fill); inactive gets `text-muted-foreground hover:text-foreground`. Click flips `direction` state — reuses the existing toggle handler. Keyboard shortcuts (Tab, click-to-flip) untouched.

### 3. Desktop keyboard hint chips
Replace the dense one-line "Arrow keys to move • Tab for next word • Click cell to toggle direction" hint with three small kbd-styled chips: `← → Move`, `Tab Next`, `Click Toggle`. Component-local `useState` `hintsVisible` starts `true`, flips to `false` on first `keydown`. Desktop only (hidden when `needsKeyboard` is true). No persistence.

### 4. Sticky mobile clue bar
Wrap the active-clue + direction-toggle row in a `sticky top-0 z-10 bg-background/85 backdrop-blur-sm` container so it overlays the grid as the player scrolls. Applies on all viewports — innocuous on desktop where there's no scroll.

### 5. Mobile input stability
- **Crossword**: Move `<MobileLetterInput />` from the page-level wrapper into the grid container. Add `scroll-mt-24` to the active cell's `<div>` so iOS doesn't scroll the grid out of view when the keyboard mounts.
- **Fill-in (numbers)**: Wrap `<MobileNumberPad />` in `<div className="sticky bottom-[env(safe-area-inset-bottom)] z-10 bg-background/95 backdrop-blur-sm pt-2 pb-1">`.
- **Both**: Add `aria-label={\`Row ${activeRow + 1} Column ${activeCol + 1}, ${direction === "across" ? "Across" : "Down"}\`}` to the hidden input element.

### 6. Cell size responsiveness
Derive a single base-size class from the grid dimension and apply to every cell in both grids:
```ts
const baseSize = gridSize >= 15 ? "w-[26px] h-[26px]" : "w-8 h-8 sm:w-9 sm:h-9";
```
Replace the existing hard-coded `w-7 sm:w-9 md:w-11 lg:w-12` cell sizing.

### 7. Solved-word visual feedback
After a successful Check (or when all crossings of a word are confirmed correct via existing per-cell `correct` state), apply `opacity-85` to the cells of that word while keeping the `font-semibold` letter weight. Pure visual — no logic change. Computed inline by checking each cell's existing `correct` flag against the word's slot membership.

### 8. Toolbar — add Erase
Add an optional `onErase?: () => void` action wired into `PuzzleToolbar` between Check and Reveal (already supported in the toolbar's action ordering). In both grids, pass `onErase={() => clearActiveCell()}` reusing the existing single-cell clear path. Final toolbar order: `Hint · Check · Erase · Reveal`. **No "Next" button.**

## Untouched
- All solving logic, autosave, completion sheet, scoring, hints/reveal counts.
- Sudoku, word-search, kakuro, nonogram, cryptogram grids.
- `PuzzleHeader`, `PuzzleControls`, `GroupedEntryList`, `PuzzleSession`.

## Verification
1. Desktop crossword (1280px): active-clue pill + Across/Down toggle visible above grid; three keyboard hint chips show on load and disappear after first keypress.
2. Mobile crossword (375px): clue bar stays sticky while scrolling the grid; tapping a cell focuses input without scrolling the active row out of view.
3. Mobile fill-in (numbers): number pad stays docked above the safe-area inset; doesn't overlap toolbar.
4. 15×15 crossword on 360px: cells render at 26px, no horizontal scroll. 7×7 fill-in: cells stay at 32–36px for comfortable taps.
5. After Check on a fully-correct word: that word's cells dim to 85% opacity, letters stay bold.
6. Toolbar shows `Hint · Check · Erase · Reveal`. Erase clears only the active cell.
7. VoiceOver on iOS announces "Row 3 Column 5, Across" on the hidden input.

