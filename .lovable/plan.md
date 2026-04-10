

# Apply Difficulty Color to Daily Challenge Card on Index Page

## Issue
The difficulty pill on the homepage daily challenge card (line 407 in `src/pages/Index.tsx`) uses generic `bg-secondary text-secondary-foreground` styling — a plain gray pill with no semantic color. This is inconsistent with the updated difficulty color system applied everywhere else.

## Fix
**File:** `src/pages/Index.tsx`, line 407

Replace the generic styling with `DIFFICULTY_SELECTED` from `src/lib/puzzleTypes.ts`, matching the same approach already used in `DailyPuzzle.tsx` and `IOSPlayTab.tsx`.

Change:
```tsx
<span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize font-medium">
```
To:
```tsx
<span className={cn("text-xs px-2 py-0.5 rounded-full border capitalize font-medium", DIFFICULTY_SELECTED[challenge.difficulty as Difficulty])}>
```

Add imports for `DIFFICULTY_SELECTED` and `Difficulty` from `@/lib/puzzleTypes` (some may already be imported).

## What Does NOT Change
- No layout or structural changes
- Single class swap on one element

