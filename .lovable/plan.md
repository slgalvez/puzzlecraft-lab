

# Activity Calendar Redesign — Ring Indicators

## Overview
Rewrite `ActivityCalendar.tsx` with triple-ring day cells showing Daily/Played/Crafted activity. Add it to the Stats page right column sidebar.

## Data Extension

Extend `DayData` with `hasDaily`, `hasPlayed`, `hasCrafted` booleans. In `buildMonthGrid`:
- `hasDaily`: `!!getDailyCompletion(dateStr)` (already used as `completed`)
- `hasPlayed`: check if any `getProgressStats().recentCompletions` has a matching date string
- `hasCrafted`: check if any `loadSentItems()` has a `sentAt` on that date

Pre-compute completion dates and craft dates as `Set<string>` outside the loop for performance.

## Day Cell Design

Replace current background-highlight cells with SVG-based ring indicators:
- Each cell is `aspect-square` (~36px) with a centered `<svg>` containing three concentric circle tracks
- **Outer ring** — primary/orange — Daily Challenge
- **Middle ring** — emerald — Puzzle played
- **Inner ring** — violet — Crafted/shared
- Radii: 15, 11, 7 with `strokeWidth` ~2
- Unfilled: `stroke-opacity: 0.08` (extremely subtle)
- Filled: full opacity with `strokeLinecap: round`
- Day number centered as text overlay
- Future days: no rings, just muted number
- Today: subtle primary dot or ring highlight
- Selected: `ring-2 ring-primary` with slight scale

## Selected Day Detail Panel

Update to show three activity indicators:
- Three inline items with colored dots + labels ("Daily ✓", "Played ✓", "Crafted —")
- Keep existing Replay/Play/Catch-up button unchanged

## Legend

Small row below the grid with three colored dots and labels: "Daily", "Played", "Crafted" — using `text-[9px]` muted styling.

## Stats Page Integration

In `src/pages/Stats.tsx` right column (line ~527), add `ActivityCalendar` wrapped in:
```tsx
<div className="rounded-2xl border bg-card overflow-hidden">
  <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
    <Calendar size={13} className="text-primary" />
    <h2 className="font-display text-sm font-semibold text-foreground">Activity</h2>
  </div>
  <div className="px-4 py-3">
    <ActivityCalendar />
  </div>
</div>
```

Place it as the first item in the right column, above "By Puzzle Type".

## Files Changed

| File | Change |
|------|--------|
| `src/components/stats/ActivityCalendar.tsx` | Full rewrite — SVG rings, triple data sources, legend |
| `src/pages/Stats.tsx` | Import + add ActivityCalendar in right column sidebar |

## Unchanged
- Month navigation, streak display, replay/catch-up buttons
- No new hooks, persistence, or backend logic
- AdminPreview continues to render the component automatically

