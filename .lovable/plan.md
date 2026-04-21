

# Milestones system rewrite + page

Replace the milestone library with the new 13-milestone, 4-tab system, build the `/milestones` page, and wire up the two event-based triggers — without breaking existing consumers (`PremiumStats`, `MilestoneModalManager`, `MilestoneShareCard`, `AdminPreview`).

## What ships

### File 1 — `src/lib/milestones.ts` — REPLACE

Adopt the uploaded rewrite. Preserves these existing exports for back-compat:
- `MilestoneIcon` type union
- `MILESTONE_ICON_EMOJI` map
- `getUncelebratedIds()` / `markCelebrated()` (signatures unchanged — same `puzzlecraft-milestones-celebrated` localStorage key)
- `getAllMilestones()` (return shape now `MilestoneResult[]` — see compat below)
- `checkMilestones()` (no return signature changes)

Adds:
- `MilestoneTab` type + `MILESTONE_TABS`
- `MilestoneState`, `MilestoneResult`
- `getMilestonesForTab(tab)`
- `recordFirstRecipientSolve()`, `recordBeatChallengeTime()`, `setFlag()`
- `FLAG_FIRST_RECIPIENT_SOLVE`, `FLAG_BEAT_CHALLENGE_TIME` constants
- 13 milestone specs across `ranked` / `solver` / `crafter` / `social`

**Compat shim — appended to the new file**: To keep `PremiumStats` and `MilestoneModalManager` working without refactor, add a derivation layer that maps `MilestoneResult → MilestoneWithProgress` (the old shape with `label`, `icon: MilestoneIcon`, `emoji`, `current`, `target`, `progressText`, `isNext`):
- Each spec gets an internal `icon: MilestoneIcon` field (e.g. `tier-expert → "trophy"`, `iron-habit → "flame"`, `clean-sheet → "medal"`, `made-something → "puzzle"`, etc.) used only by the legacy emoji map.
- Re-export `getAllMilestones()` returning the **new** `MilestoneResult[]` (since both new page and existing call sites only read `id`, `state`, `progressRatio`/`current`/`target`, `name`/`label`).
- To avoid touching `PremiumStats` and `MilestoneModal`, expose `name` AND `label` (alias) on the result, expose `icon: MilestoneIcon`, expose `current`/`target` derived from progress (current = `Math.round(progressRatio*100)`, target = `100` when progressLabel exists; both `0` when moment-based), and `emoji`.

This means `PremiumStats`, `MilestoneModal`, `MilestoneShareCard`, and `AdminPreview` continue to compile. They will silently start showing the new milestone names and copy — acceptable, that's the goal.

`getAllMilestones(overrideRecords?: SolveRecord[])` keeps the optional arg signature; ignored internally for now (snapshot reads real solve records). The admin demo path in `PremiumStats` will simply mirror the real-user view.

### File 2 — `src/pages/Milestones.tsx` — CREATE

Adopt the uploaded page wholesale. Imports work against the new exports. Includes:
- 4 pill tabs with achievement count chips and new-unlock dots
- `NextCard` (elevated `border-primary/25`), `InProgressCard`, `AchievedCard`, `LockedCard`
- `@keyframes milestone-glow` injected via inline `<style>` (component-scoped, no global CSS)
- Empty-state CTA → `/daily`
- All-complete copy: "You've done everything. That's all of them."

### File 3 — `src/App.tsx` — patch

Add inside `<PublicRoutes>` Routes block:
```tsx
import Milestones from "@/pages/Milestones";
<Route path="/milestones" element={<Milestones />} />
```

### File 4 — `src/components/craft/CraftInbox.tsx` — surgical patch

Inside `fetchSentStatuses`, at the existing `freshNewSolves.add(row.id)` site:
```tsx
import { recordFirstRecipientSolve } from "@/lib/milestones";
// after freshNewSolves.add(row.id):
recordFirstRecipientSolve();
```
The existing `prevCompleted.current.has(row.id)` guard already ensures fire-once-per-puzzle. The flag inside `recordFirstRecipientSolve` adds a second cross-session guard.

### File 5 — `src/pages/SharedCraftPuzzle.tsx` — surgical patch

In `handleComplete`, after the DB write (line ~218), add:
```tsx
import { recordBeatChallengeTime } from "@/lib/milestones";
// after the supabase update:
if (creatorSolveTime !== null && finalTime > 0 && finalTime < creatorSolveTime) {
  recordBeatChallengeTime();
}
```
Also append `recordBeatChallengeTime` not relevant to the creator self-test branch (`isCreatorMode` returns early) — correct.

### File 6 — `src/pages/Stats.tsx` — small addition

Add a "View Milestones" outline button in the Stats header area (near the rating card) that navigates to `/milestones`. One line via existing `useNavigate()`.

## Out of scope

- Refactoring `PremiumStats` away from `getAllMilestones()` legacy shape (compat shim covers it).
- Refactoring `MilestoneModal` / `MilestoneShareCard` (still consume `MilestoneIcon` + emoji map — preserved).
- iOS tab bar dot for new milestones (mentioned as optional in notes — defer).
- Removing the existing `MilestoneModalManager` toast/modal flow. The new system fires a sonner toast from `checkMilestones()` AND the existing modal manager polls `getUncelebratedIds()` and pops a modal. Both will fire. **Decision: keep the modal manager — it's the celebration centerpiece for the major moments.** The page glow + dot is for users who navigate after the toast/modal already played.

## Verification

1. Visit `/milestones` — page renders with 4 tabs; default tab is `solver`; counts and locks display correctly.
2. Solve a puzzle → "First Crack" toast fires (sonner) AND existing modal celebrates AND visiting `/milestones` shows the card with glow ring.
3. Trigger 3-day streak → "On a Roll" appears as Next on Solver tab; progress bar shows `2 of 3 days` at day 2.
4. `Stats` page shows "View Milestones" button → routes to `/milestones`.
5. Send a craft → "Made Something" achieved on Crafter tab.
6. Recipient solves a sent craft → on next inbox refresh, "They Solved It" achieved and toast fires.
7. Solve a shared puzzle faster than the creator → "Game On" achieved on Social tab.
8. `PremiumStats` Milestones section still renders without runtime errors (legacy shape derived from new specs).
9. Tab badge dot appears next to a tab when it has at least one uncelebrated milestone; disappears 2s after the page is opened.

