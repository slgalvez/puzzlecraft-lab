

# Fix streak tracking for milestone system

## Root cause

Solver-tab streak milestones ("On a Roll" 3-day, "Iron Habit" 30-day) read `snapshot.streakCurrent`, which is currently sourced from `getDailyStreak()`. That only counts daily-challenge solves, so a user solving any other puzzle type sees 0 progress.

`progressTracker.calcStreak()` already tracks the correct overall solve streak (increments on consecutive days, resets on miss, starts at 1, supports Streak Shield). It's written by `recordCompletion(...)` on every solve, and `checkMilestones()` runs after that — so the data flow is correct, only the snapshot source is wrong.

## Fix — single file change

### `src/lib/milestones.ts`

1. Remove the `getDailyStreak` import. Import `getProgressStats` from `@/lib/progressTracker`.

2. In `snapshot()`, replace:
   ```ts
   let streakCurrent = 0;
   try { streakCurrent = getDailyStreak().current; } catch {}
   ```
   with:
   ```ts
   let streakCurrent = 0;
   try { streakCurrent = getProgressStats().currentStreak; } catch {}
   ```

3. **Implementation guard (per user):** `streakCurrent` MUST come only from `getProgressStats().currentStreak`. No fallback to `getDailyStreak()`, no combining the two. This keeps Solver streak semantics strictly "overall play streak" and prevents mixed daily-only/overall semantics from leaking back in.

4. No changes to milestone specs, check functions, progress labels, or `checkMilestones()` ordering (already runs post-`recordCompletion`).

## Out of scope

- Daily page streak header (still uses `getDailyStreak()` correctly — daily-only by design).
- Milestone definitions, copy, icons.
- Streak Shield logic.
- DB persistence (streak is derived, not stored).

## Verification

1. Solve any puzzle yesterday + today → `/milestones` Solver tab → "On a Roll" shows `2 of 3 days`, in-progress.
2. Third consecutive day → "On a Roll" achieved, toast fires, glow on card.
3. Skip a day → next solve resets to 1; milestone returns to in-progress.
4. Daily-only solvers progress identically (their solves also call `recordCompletion`).
5. `getDailyStreak` is no longer referenced anywhere in `milestones.ts` (grep clean).
6. PremiumStats still renders without errors (legacy compat shape unchanged).

