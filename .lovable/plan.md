

# Standardize Difficulty Color System Across the App

## Issues Found

### 1. PuzzleHeader badge uses orange (`text-primary` / `bg-primary/10`) for difficulty
**File:** `src/components/puzzles/PuzzleHeader.tsx`, line 149
The combined badge `"Sudoku · Hard"` renders entirely in `bg-primary/10 text-primary` (orange). Difficulty should use its own semantic color, not the brand orange.

**Fix:** Split the badge into two parts — puzzle type in neutral text, difficulty in a separate pill using `DIFFICULTY_SELECTED` colors. Import `DIFFICULTY_SELECTED` from `puzzleTypes.ts` and look up the difficulty color. If no difficulty is provided, render just the type label neutrally.

### 2. DailyPuzzle difficulty pill uses generic `bg-secondary` instead of difficulty color
**File:** `src/pages/DailyPuzzle.tsx`, line 224
The difficulty label renders as `bg-secondary text-secondary-foreground capitalize` — a gray pill with no semantic color.

**Fix:** Import `DIFFICULTY_SELECTED` and apply the correct per-difficulty color to the pill.

### 3. IOSPlayTab Daily Challenge difficulty text is plain `text-muted-foreground capitalize`
**File:** `src/components/ios/IOSPlayTab.tsx`, line 280-281
The difficulty on the Daily Challenge card is just plain muted text with `capitalize`. No semantic color.

**Fix:** Wrap the difficulty text in a small pill/span using `DIFFICULTY_SELECTED` for the challenge difficulty.

### 4. QuickPlay surprise/endless difficulty text uses plain `text-foreground capitalize`
**File:** `src/pages/QuickPlay.tsx`, lines 349 and 355
In surprise mode: `text-muted-foreground capitalize`. In endless mode: `font-medium text-foreground capitalize`. Neither uses difficulty-specific colors.

**Fix:** Apply the difficulty color to the difficulty label text in both modes.

### 5. CraftSettingsPanel uses orange (`bg-primary/10 text-primary`) for selected difficulty
**File:** `src/components/craft/CraftSettingsPanel.tsx`, line 71
The layout difficulty selector (easy/medium/hard) uses `bg-primary/10 text-primary` — orange for selected state.

**Fix:** Map craft difficulties (easy/medium/hard) to the standard difficulty colors (emerald/amber/orange) using `DIFFICULTY_SELECTED`. Keep the segmented pill layout structure unchanged.

## Files to Modify

1. **`src/components/puzzles/PuzzleHeader.tsx`** — Split badge: neutral type label + colored difficulty pill
2. **`src/pages/DailyPuzzle.tsx`** — Apply difficulty color to the difficulty pill (line 224)
3. **`src/components/ios/IOSPlayTab.tsx`** — Apply difficulty color to daily challenge difficulty text
4. **`src/pages/QuickPlay.tsx`** — Apply difficulty color to surprise/endless difficulty labels
5. **`src/components/craft/CraftSettingsPanel.tsx`** — Replace `bg-primary/10 text-primary` with per-difficulty colors

## What Does NOT Change
- No layout or structural changes
- No icon, navigation, or feature changes
- No changes to already-standardized difficulty selectors (DifficultySelector, PuzzleGenerator, PuzzleLibrary, IOSCustomizeSheet, RandomPuzzleGenerator)
- `DIFFICULTY_HOVER` and `DIFFICULTY_SELECTED` maps in `puzzleTypes.ts` remain as-is

