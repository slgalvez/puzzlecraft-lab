## Goal
Show a small Streak Shield pill on `/stats` so users see how many shields they have, with a tap/hover-accessible tooltip explaining what shields do.

## Placement
Inside the existing **Daily Challenge** card on `src/pages/Stats.tsx` (around line 1253–1254), just under the 3-stat grid (Completed / Streak / Best) and above the "Today's challenge" button. Keeps it adjacent to the streak number without adding a new card.

## Component (inline, no new file needed)

A small centered pill:

```
[ 🛡 2 shields left  ⓘ ]
```

- Uses existing `Shield` icon (already imported in Stats.tsx).
- Tailwind: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 text-[11px] text-muted-foreground`
- Wrapped in shadcn `Tooltip` (TooltipProvider already present at app root).
- Trigger is a `<button type="button">` so mobile tap opens tooltip (Radix tooltip handles touch via focus + click); min 28px hit area satisfied by py-1 + small icon.

## Tooltip copy
> Streak Shields protect your streak if you miss a day. One shield is automatically used when you miss a day and would lose your streak.
>
> Puzzlecraft+ members get a Streak Shield each month to help protect daily progress.

## Data source
- Import `useStreakShield` from `@/hooks/useStreakShield`.
- Read `shieldCount`. Render `${shieldCount} shield${shieldCount === 1 ? '' : 's'} left`.
- When `shieldCount === 0`, show "0 shields left" (muted styling already covers it).

## Behavior / constraints
- No changes to streak or shield-consumption logic.
- No new card; pill lives inside the existing Daily Challenge card.
- Free + Plus users both see the pill and tooltip; no gating added here (upgrade path remains via existing UpgradeModal flows).
- Hidden when the Stats page is in `viewAs` / `previewActive` mode (those use someone else's data — shield is current-user only). Easy check: only render when `!isViewAs && !previewActive`.

## Files touched
- `src/pages/Stats.tsx` — add `useStreakShield` import + ~15 lines of JSX inside the Daily Challenge card.

No other files, no schema, no new dependencies.