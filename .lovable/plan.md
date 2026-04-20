

# Calendar Ring Color Hierarchy + Date Parsing Safety

## Summary
Restore color-based visual hierarchy in the Stats calendar rings (daily = primary, solved = softened primary, craft = amber dot) and enforce safe local-midday date parsing for replay resolution. No layout changes.

## Files

### 1. `src/pages/Stats.tsx` — Ring color refinement
In the SVG cell renderer (`InlineCalendar`'s day cell):

- **`daily-complete`**: Full 360° ring, `stroke="hsl(var(--primary))"`, `stroke-width="2"`, `opacity="1"` — strongest visual
- **`puzzle-played`**: Partial ring, same `hsl(var(--primary))` stroke but with `opacity="0.45"` (softened/desaturated effect using opacity, no new color tokens)
  - Keep existing 12% floor / 75% (270°) cap on `stroke-dasharray`
  - Stroke weight stays at 2px to keep aesthetic consistent
- **`craft-only`**: No ring, existing small amber dot only — unchanged
- **Craft + higher status**: Amber dot preserved alongside the ring — unchanged
- **`none`**: No ring, subtle border — unchanged
- Today indicator and selected highlight states — unchanged

Contrast adjustment:
- Background "track" circle (rendered behind activity ring for cells with any ring) gets `opacity="0.15"` so the active ring reads more clearly against it
- No changes to cell size, spacing, grid columns, or month nav layout

### 2. `src/hooks/usePuzzleTimer.ts` — Verify midday parsing
Already implemented per prior plan — confirm `getChallengeForDate(new Date(parsedDate + "T12:00:00"))` is in place. No changes needed if already present.

### 3. `src/pages/DailyPuzzle.tsx` — Replay date parsing safety
Audit the `dateOverride` consumption path:
- Wherever `dateOverride` (the URL `?date=` param) is converted to a `Date` for `getTodaysChallenge` / `getChallengeForDate` resolution, ensure it uses `new Date(dateOverride + "T12:00:00")` — never bare `new Date(dateOverride)` (which parses as UTC midnight and can shift one day in negative-offset timezones)
- Apply the same midday convention to the today-normalization guard

### 4. `src/lib/calendarActivity.ts` — Audit only
- `localDateStr` already uses local components (no UTC) — no change
- No date construction from string happens here (dates come from `Date` objects already)

## Constraints Summary

| Rule | Enforcement |
|------|-------------|
| Daily ring | Full 360°, primary color, opacity 1 |
| Solved ring | Partial (12%–75%), primary color, opacity 0.45 |
| Craft | Amber dot only, no ring |
| Color palette | Primary + softened primary (via opacity) + amber — no new tokens |
| Date parsing | Always `+ "T12:00:00"` for YYYY-MM-DD → Date |
| Layout | Unchanged — no spacing, grid, or sizing edits |
| Ring caps | 12% floor, 270° cap preserved |

