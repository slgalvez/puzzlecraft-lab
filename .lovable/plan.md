

# Show Calendar Data in Admin View-As Mode

## Problem
The calendar card shows "Activity calendar unavailable in view-as mode" because `calendarActivity.ts` reads localStorage, which only has the admin's own data. However, the `ViewAsPayload` already contains `completions` (quick-play records) and `dailyData` (daily challenge results) — enough to render a meaningful calendar.

## Solution
Add a new function to `calendarActivity.ts` that builds an `ActivityMap` from provided data arrays instead of localStorage. Use it in `InlineCalendar` when in view-as mode.

## Files

### 1. ADD `getCalendarActivityFrom()` to `src/lib/calendarActivity.ts`
- New export: `getCalendarActivityFrom(completions, dailyData, days)` — same logic as `getCalendarActivity` but accepts data directly instead of reading localStorage
- Pre-fills date range with `{ status: 'none' }`, merges daily and quick-play data, applies same hierarchy
- Craft count stays 0 (craft history is not synced to backend — acceptable gap)

### 2. UPDATE `InlineCalendar` in `src/pages/Stats.tsx`
- Accept optional `viewAsUser` prop
- When `isViewAs` and `viewAsUser` is provided, call `getCalendarActivityFrom(viewAsUser.completions, viewAsUser.dailyData, calendarDays)` instead of showing empty state
- Remove the "unavailable in view-as mode" empty state
- Day detail panel works the same way (minus replay CTA, which is already Plus-only and irrelevant in view-as)
- Treat as Plus view (60-day grid) since admin is viewing

## What stays the same
- All other Stats page content, view-as overrides, layout
- `getCalendarActivity()` (localStorage-based) unchanged
- Craft data not shown in view-as (not available server-side) — acceptable

