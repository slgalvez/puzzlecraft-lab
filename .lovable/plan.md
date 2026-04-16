

# Calendar Activity Audit — Final Implementation Plan

## Summary
Create `src/lib/calendarActivity.ts` as the single source of truth for calendar activity aggregation. Add `getAllDailyCompletions()` to `dailyChallenge.ts`. Replace `ActivityCalendar` component with inline calendar rendering in Stats. Enforce strict visual hierarchy, premium differentiation, and cleanup all dead references.

## Files

### 1. ADD `getAllDailyCompletions()` to `src/lib/dailyChallenge.ts`
- New export: `getAllDailyCompletions(): Record<string, DailyCompletion>` — single localStorage read, returns the full map
- No other changes to this file

### 2. CREATE `src/lib/calendarActivity.ts`
Single source of truth for calendar data aggregation:
- **Inputs** (read once per call):
  - `getAllDailyCompletions()` from dailyChallenge.ts
  - `getProgressStats().recentCompletions` from progressTracker.ts
  - `loadSentItems()` from craftHistory.ts
- **Output**: `ActivityMap = Map<string, ActivityDay>` where `ActivityDay = { dateStr, dailyCompletion?, puzzleCount, craftCount, status }`
- **Status hierarchy** (strict): `'daily-complete'` > `'puzzle-played'` > `'craft-only'` > `'none'`
- **Exports**:
  - `getCalendarActivity(days: number): ActivityMap` — builds map for last N days, pre-filling every date in range with `{ status: 'none' }` before merging sources
  - `buildCalendarWeeks(map: ActivityMap, days: number): CalendarWeek[]` — Sun–Sat grid for Plus users
  - `DOW_LABELS: string[]` — `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']`
  - `ActivityDay`, `CalendarWeek` types

### 3. REWRITE calendar section in `src/pages/Stats.tsx`
- **Remove** `ActivityCalendar` import and all references
- **Add** imports from `calendarActivity.ts`
- **Memoize** activity data: `useMemo(() => getCalendarActivity(isPlus ? 60 : 7), [dataVersion, isPlus])`
- **View-as mode**: Render calendar card shell with empty state: `"Activity calendar unavailable in view-as mode."` — no local data shown, section not hidden
- **Free users (7 days)**: Flat horizontal row, no month nav, upgrade nudge
- **Plus users (60 days)**: `buildCalendarWeeks()` → true Sun–Sat grid with DOW headers, month label, navigation
- **Cell styling** via `getCellStyle(status)`:
  - `daily-complete` → solid primary (dominant)
  - `puzzle-played` → light primary/10 (secondary)
  - `craft-only` → small amber dot (accent)
  - Craft coexisting with higher status → tiny amber dot overlay
- **Day detail panel** (tap cell, Plus only): date, daily result, quick-play count, craft count, replay CTA (Plus + past dates only)
- **All other Stats content unchanged**: tier card, recent solves, premium stats, social tab, endless mode, view-as overrides for non-calendar sections

### 4. UPDATE `src/pages/AdminPreview.tsx`
- Remove `ActivityCalendar` import
- Replace calendar preview section with placeholder note

### 5. DELETE `src/components/stats/ActivityCalendar.tsx`

### 6. CLEANUP VERIFICATION
- Search for remaining `ActivityCalendar` imports/references → remove all
- Remove `overridePlayedDates`, `overrideCraftedDates`, `overrideDailyFn` prop patterns

## Constraints

### Visual hierarchy (strict)
- Daily completion = dominant visual state (solid primary)
- Quick-play = secondary (light primary)
- Craft = accent only (amber dot), never overpowers daily

### Premium differentiation
- Free: 7 days. Plus: 60 days in Sun–Sat grid
- Replay: Plus-only, past dates only, today unaffected

### Performance
- Calendar data computed once per view via `useMemo`, no per-cell storage reads or async fetches

### View-as mode
- Show calendar shell with `"Activity calendar unavailable in view-as mode."` — do not show local data, do not hide section

### Helper safety
- All internal helpers return null if data missing; builders filter nulls before joining

### Missing day handling
- `getCalendarActivity(days)` must pre-fill every date in the requested range into the `ActivityMap` with `{ status: 'none', puzzleCount: 0, craftCount: 0 }` before merging data sources
- Calendar rendering must never check for missing keys — every cell renders deterministically from a guaranteed entry in the map

### Date normalization
- All date keys (`dateStr`) normalized to `YYYY-MM-DD` in **local time** using `new Date().toISOString().slice(0,10)` replacement: `const pad = (n: number) => String(n).padStart(2,'0'); const localDateStr = (d: Date) => \`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}\``
- Applied uniformly across all three sources:
  - Daily completions (already YYYY-MM-DD local — verify)
  - Quick-play records (`CompletionRecord.date` — normalize on read)
  - Craft history (`CraftSentItem.sentAt` epoch → local dateStr conversion)
- No mixing of UTC and local dates. All map keys and comparisons use the same `localDateStr()` helper
- This prevents off-by-one-day errors near midnight in non-UTC timezones

