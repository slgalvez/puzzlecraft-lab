

# Calendar + Daily Replay Audit and Refactor

## Summary
Refactor the Stats activity calendar to a monthly ring-based view, fix the replay recording bug in `usePuzzleTimer.ts` with robust key parsing, and enforce strict navigation/replay constraints including a today guard.

## Replay Audit Findings

**Working correctly:**
- `/daily?date=YYYY-MM-DD` loads the correct historical puzzle deterministically
- `writeDailyScore` in `DailyPuzzle.tsx` writes to the correct past `date_str` in DB
- Plus gating enforced in `handleReplay` — line 130 checks `isViewAs`, `isPlus`, and `day.dateStr === today`
- Today's daily flow is unaffected by replays

**Bug — `usePuzzleTimer.ts` line 141:**
Calls `getTodaysChallenge()` (always today), so replay keys like `daily-2026-04-10-sudoku-medium` never match. `recordDailyCompletion` is silently skipped for past dates. DB score IS saved, but localStorage daily history misses replays.

## Files

### 1. `src/hooks/usePuzzleTimer.ts` — Replay recording fix
- When `puzzleKey` starts with `daily-`, extract the `YYYY-MM-DD` segment (indices 1–3 after splitting on `-`)
- **Validate** the parsed date: check it produces a valid `Date` object and matches `YYYY-MM-DD` format. If parsing fails, skip daily recording entirely and fall through to the existing non-daily logic
- Call `getChallengeForDate(new Date(parsedDateStr + "T12:00:00"))` to resolve the expected challenge — same deterministic logic used by `DailyPuzzle.tsx`
- Compare `puzzleKey` against the resolved challenge key, not today's
- Call `recordDailyCompletion(parsedDateStr, ...)` with the correct historical date

### 2. `src/lib/calendarActivity.ts` — Monthly grid builder
- **Replace** `buildCalendarWeeks(map, days)` with `buildMonthGrid(map, year, month): MonthGrid`
- `MonthGrid = { year, month, rows: (ActivityDay | null)[][] }` — rows of 7 cells, leading/trailing nulls for Sun–Sat alignment
- **Add** helper `getReplayBounds(isPlus): { earliest: string }` — returns the earliest date in the supported 60-day window
- Keep `getCalendarActivity`, `getCalendarActivityFrom`, `localDateStr`, all types unchanged
- Remove `CalendarWeek` type

### 3. `src/pages/Stats.tsx` — Monthly ring-based calendar

**Month navigation state:**
- `{ year, month }` defaulting to current month
- Prev/next month chevron buttons
- **Plus users**: nav bounded to months intersecting the 60-day window — disable prev if the prior month has zero days in range; disable next if already at current month
- **Free users**: locked to current month, nav buttons hidden

**Monthly grid:**
- Single month at a time with month/year header
- Sun–Sat column headers
- Leading/trailing empty cells via `buildMonthGrid` nulls

**Ring-based cells (SVG, replacing filled squares):**
- Each cell: ~28×28 SVG with a background circle, optional activity ring, centered day number
- `daily-complete` → full ring (360°), 2px solid primary stroke — strongest visual
- `puzzle-played` → partial ring via `stroke-dasharray`, proportional to puzzle count:
  - Minimum visible threshold: ~10–15% (~36–54° arc) so even 1 solve is perceptible
  - Capped at ~270° (75%) so partial ring never equals a full daily ring
- `craft-only` → no ring, small amber accent dot only
- Craft + higher status → accent dot preserved alongside the ring
- `none` → no ring, subtle border
- Today → inner glow dot
- Selected → scale + ring-offset highlight

**Day detail panel:** Unchanged content (date, daily result, quick-play count, craft count)

**Replay CTA rules:**
- Shown only when: Plus user AND selected day is strictly in the past AND that date has a daily completion
- **Today guard (logic + UI)**: In `handleReplay`, block navigation if `day.dateStr === today`. In `DayDetail`, hide Replay button for today. This is defense-in-depth — even if someone constructs a direct URL, the existing `DailyPuzzle.tsx` already handles today correctly via `getTodaysChallenge()`, but the Stats UI will never suggest it.

**View-as mode:** Unchanged — uses `getCalendarActivityFrom`, 60-day grid, no replay CTA

### 4. `src/pages/DailyPuzzle.tsx` — Today guard (programmatic)
- Add a check: if `dateOverride` equals today's date string, clear it (treat as normal daily). This prevents `/daily?date=2026-04-16` from being treated as a "replay" when it's actually today.

### 5. Cleanup
- Remove `buildCalendarWeeks`, `CalendarWeek` exports from `calendarActivity.ts`
- Remove old 60-day rolling grid code, `getCellStyle` function from Stats
- Remove dead month-range label logic

## Constraints Summary

| Rule | Enforcement |
|------|-------------|
| PuzzleKey parsing | Validate YYYY-MM-DD segment; fall back to non-daily on failure |
| Replay recording | Resolve via `getChallengeForDate`, never compare against today |
| Ring min/max | 10–15% floor, 270° cap; daily = full 360° only |
| Today guard (UI) | Hide Replay CTA when `isToday` |
| Today guard (logic) | `handleReplay` blocks navigation for today; `DailyPuzzle.tsx` normalizes today's date param |
| Month nav (Plus) | Disable into months with zero days in 60-day window |
| Month nav (Free) | Locked to current month |
| Visual hierarchy | daily (full ring) > puzzle (partial ring) > craft (amber dot only) |
| Performance | Memoized aggregation, no per-cell reads |
| Date normalization | All keys via `localDateStr()` in local time |
| Missing days | Pre-filled `{ status: 'none' }`, deterministic rendering |

