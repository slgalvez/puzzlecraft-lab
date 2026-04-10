

## Problem

The iPad keyboard doesn't appear for number fill-in (and potentially other puzzles) because:

1. **`MobileLetterInput.tsx` was never updated** — it still has the old broken styles from the original code (`opacity: 0`, `pointerEvents: "none"`, `zIndex: -1`, `tabIndex: -1`). The fixes discussed earlier (z-index 9999, opacity 0.01, pointerEvents auto, fontSize 16px) were not applied.

2. **`MobileNumberPad.tsx` was never updated** — it still has `sm:hidden` which hides the number pad on iPad-sized screens (≥640px). Number fill-in and Sudoku rely on this pad instead of the OS keyboard.

These are the same two files from step 2 and step 3 of the earlier "Apply order" that were supposed to be replaced but weren't saved.

## Fix Plan

### File 1: `src/components/puzzles/MobileLetterInput.tsx`
Apply the iPad-safe hidden input fixes:
- `zIndex: -1` → `9999`
- `opacity: 0` → `0.01`
- `pointerEvents: "none"` → `"auto"`
- `tabIndex: -1` → `0`
- `width/height: "1px"` → `"2px"`
- `position: fixed; bottom: 0; left: 50%` → `top: "50%", left: "50%"`
- Add `fontSize: "16px"` (prevents iOS auto-zoom)
- Add `enterKeyHint: "done"`

### File 2: `src/components/puzzles/MobileNumberPad.tsx`
- Remove `sm:hidden` from the grid container class
- Change `h-11` to `min-h-[44px]` for proper touch targets
- Visibility is already controlled by the `visible` prop from the parent (which uses `needsKeyboard`), so removing `sm:hidden` is the only change needed to make it appear on iPads

### No other files need changes
The `needsKeyboard` substitutions in CrosswordGrid, FillInGrid, SudokuGrid, and CryptogramPuzzle are already in place (confirmed by search). The issue is purely that the two input components themselves were never patched.

