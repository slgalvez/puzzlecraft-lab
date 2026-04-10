

# Standardize Difficulty Selector Styling

## Current Inconsistencies

| Location | Default | Hover | Selected |
|---|---|---|---|
| **DifficultySelector** (QuickPlay) | Colored border+bg+text always | `hover:opacity-80` | Same colors + ring + shadow |
| **PuzzleLibrary** pills | Neutral text, no border/bg | `hover:text-foreground` | `bg-primary/15 text-primary` (generic, no per-difficulty color) |
| **PuzzleGenerator** desktop pills | Neutral border, neutral text | `hover:border-primary/40` | `border-primary bg-primary/10 text-primary` (generic) |
| **PuzzleGenerator** mobile rows | Neutral border, card bg | `hover:border-primary/40` | `border-primary bg-primary/5` (generic) |
| **IOSCustomizeSheet** pills | Neutral border, neutral text | `hover:border-primary/40` | `border-primary bg-primary text-primary-foreground` (solid fill!) |
| **RandomPuzzleGenerator** pills | Neutral border, neutral text | `hover:text-foreground` | `border-primary bg-primary text-primary-foreground` (solid fill!) |

**Key problems:**
1. DifficultySelector shows colors on ALL pills by default (violates "color only as feedback")
2. IOSCustomizeSheet and RandomPuzzleGenerator use solid primary fill for selected state
3. PuzzleLibrary/PuzzleGenerator use generic `primary` color instead of per-difficulty colors
4. No consistent hover state across any of them
5. Six different visual treatments for the same concept

## Unified Design System

Shared color map (matching existing Play tab hues):

```text
Difficulty  | Hover (border + bg)                    | Selected (border + bg + text)
------------|----------------------------------------|------------------------------------
Easy        | border-emerald-400/40 bg-emerald-400/5 | border-emerald-500/60 bg-emerald-500/15 text-emerald-700
Medium      | border-amber-400/40   bg-amber-400/5   | border-amber-500/60   bg-amber-500/15   text-amber-700
Hard        | border-orange-500/40  bg-orange-500/5   | border-orange-500/60  bg-orange-500/15  text-orange-700
Extreme     | border-rose-500/40    bg-rose-500/5     | border-rose-500/60    bg-rose-500/15    text-rose-700
Insane      | border-violet-600/40  bg-violet-600/5   | border-violet-600/60  bg-violet-600/15  text-violet-700
```

Default state for all: `border-border text-muted-foreground` (neutral, no color)

## Files Changed

### 1. `src/components/puzzles/DifficultySelector.tsx`
- Remove `DIFFICULTY_COLORS` map (was applying color to ALL states)
- Change default to neutral `border-border text-muted-foreground`
- Add per-difficulty hover: `hover:border-{color}/40 hover:bg-{color}/5`
- Change selected to soft fill: `border-{color}/60 bg-{color}/15 text-{color}-700`
- Remove `shadow-sm ring-1` from selected (too heavy)

### 2. `src/pages/PuzzleGenerator.tsx` (desktop pills, ~line 727)
- Replace generic `border-primary bg-primary/10 text-primary` selected state with per-difficulty colors
- Add per-difficulty hover colors
- Keep disabled state unchanged

### 3. `src/pages/PuzzleGenerator.tsx` (mobile rows, ~line 574)
- Replace generic `border-primary bg-primary/5` with per-difficulty `border-{color}/60 bg-{color}/10`
- Add per-difficulty text color on selected label

### 4. `src/pages/PuzzleLibrary.tsx` (inline pills, ~line 323)
- Replace generic `bg-primary/15 text-primary` with per-difficulty colors
- Add per-difficulty hover

### 5. `src/components/ios/IOSCustomizeSheet.tsx` (~line 133)
- Replace solid `bg-primary text-primary-foreground` with soft per-difficulty colors
- Add per-difficulty hover

### 6. `src/components/puzzles/RandomPuzzleGenerator.tsx` (~line 130)
- Replace solid `bg-primary text-primary-foreground` with soft per-difficulty colors
- Add per-difficulty hover

### 7. `src/components/ios/PuzzleTypePicker.tsx` (row-based, not pills — keep structural difference but align colors)
- The icon colors already match the system — no change needed here since it's a different interaction pattern (full rows, not pills)

## Technical Detail

To avoid duplicating the color maps across 6 files, I'll export shared constants from `src/lib/puzzleTypes.ts`:

```ts
export const DIFFICULTY_HOVER: Record<Difficulty, string> = { ... };
export const DIFFICULTY_SELECTED: Record<Difficulty, string> = { ... };
```

All 6 locations will import and use these shared maps.

## What Does NOT Change
- No layout or structural changes
- No icon changes
- No feature additions or removals
- No changes to locked/premium gating logic
- PuzzleTypePicker bottom sheet keeps its row-based layout
- CraftSettingsPanel keeps its existing 3-option segmented control (it's for easy/medium/hard layout density, not the same concept)

