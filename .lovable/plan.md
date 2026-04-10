

# Lower Right-Side Bank Panels: 96px → 108px

Increase desktop top padding from `lg:pt-[96px]` to `lg:pt-[108px]` so the word bank title aligns with the top of the puzzle grid (accounting for the direction toggles, active clue bar, and helper text above the grid).

## Changes

1. **`src/components/puzzles/CrosswordGrid.tsx`** (line 543) — `lg:pt-[96px]` → `lg:pt-[108px]`
2. **`src/components/puzzles/FillInGrid.tsx`** (line 570) — `lg:pt-[96px]` → `lg:pt-[108px]`
3. **`src/components/puzzles/WordSearchGrid.tsx`** (line 453) — `lg:pt-[96px]` → `lg:pt-[108px]`

No other changes.

