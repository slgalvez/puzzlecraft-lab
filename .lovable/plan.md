

# Align Right-Side Bank Panels with Puzzle Grid

Add `lg:pt-[88px] lg:self-start` to the desktop side-panel container in all three puzzle grid components, offsetting past the PuzzleHeader so the bank content aligns with the top of the grid.

## Changes

### 1. `src/components/puzzles/CrosswordGrid.tsx` (line 543)
```diff
- <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:max-w-xs">
+ <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:max-w-xs lg:pt-[88px] lg:self-start">
```

### 2. `src/components/puzzles/FillInGrid.tsx` (line 570)
```diff
- <div className="lg:max-w-xs">
+ <div className="lg:max-w-xs lg:pt-[88px] lg:self-start">
```

### 3. `src/components/puzzles/WordSearchGrid.tsx` (line 453)
```diff
- <div className="lg:max-w-xs min-w-0">
+ <div className="lg:max-w-xs min-w-0 lg:pt-[88px] lg:self-start">
```

## What Does NOT Change
- No layout structure, grid sizing, or component moves
- Mobile layout unaffected (`lg:` prefix)
- No new elements or redesign

