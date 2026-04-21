

# Milestones become a progress board

Replace the Up Next + In Progress + Achieved + Coming Up vertical list inside `<MilestonesSection />` with a single continuous tile grid under a refined Up Next card. One file edited: `src/components/stats/MilestonesSection.tsx`. No changes to `milestones.ts`, no new files, no animation libraries, no black buttons.

## 1. Up Next card refinements

- Helper line `"You're starting here"` → **`"Closest to unlock"`**.
- Add a new helper paragraph below it: **`"You're close"`** in `text-[11px] text-primary/70 mt-1`.
- CTA copy: `"Start solving →"` / `"Start crafting →"` → **`"Play now →"`** (solver/ranked/social) and **`"Create now →"`** (crafter). Outline + primary text, unchanged styling.
- For trackable milestones with progress, replace the percent row with a "remaining" string derived from milestone id:
  - `off-the-bench` → `${10 - solves} more solves to go`
  - `on-a-roll` → `${3 - days} more days to go`
  - `iron-habit` → `${30 - days} more days to go`
  - `the-long-game` → `${8 - typesPlayed} more types to go`
  - `puzzle-maker` → `${5 - sent} more puzzles to go`
  - tier-* → `${threshold - rating} rating to go`
  - Fallback (moment-based) → existing `"Moment-based — you'll know when it happens"`
  - Implementation: small local helper `remainingLine(m)` parsing `m.progressLabel` (e.g. `"3 of 10 solves"` → `"7 more solves to go"`) so we don't touch `milestones.ts`.
- Keep the `Progress` bar above the remaining line for trackable milestones with `progressRatio > 0`.
- For zero-progress Up Next: hide bar, show only encouragement + goal line (existing) + outline CTA. No `0%`, no `0 of X`.

## 2. Remove "In Progress", "Achieved", "Coming Up" sections

Delete the three labeled blocks inside `TabContent`. Replace with a single grid below the Up Next card.

## 3. New Progress Grid (the core change)

Below the Up Next card, render every other milestone in the active tab (i.e., all milestones in tab minus the Up Next one) inside:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
  {tiles.map(m => <MilestoneTile key={m.id} m={m} />)}
</div>
```

Sort order inside the grid:
1. Active (state `in-progress`, ratio > 0 and < 1)
2. Not started (state `locked`, ratio === 0, no prior tier locked) — split below
3. Locked future (ratio === 0, depends on prior tier — `tier-skilled/advanced/expert` and `iron-habit` once lower thresholds unmet count as future)
4. Completed (state `achieved`)

For simplicity and without new data, "future" is identified by id heuristic: `tier-advanced` and `tier-expert` are "future" until `tier-skilled` is achieved; `iron-habit` is "future" until `on-a-roll` is achieved. All others with zero progress = "not started".

Compact mode (Stats embed): cap the grid to **6 tiles total** (Up Next is rendered separately above). Full mode (`/milestones`): no cap.

## 4. New `MilestoneTile` (inline subcomponent)

Replaces `InProgressCard`, `AchievedCard`, `LockedCard`. One inline component inside `MilestonesSection.tsx`, no new file. Branches on derived tile state:

### Active (in-progress, 0 < ratio < 1)
```
rounded-2xl border border-border/60 bg-card px-4 py-3
hover:shadow-sm hover:-translate-y-[1px] transition-all
```
Icon top-right · title · description · `<Progress value={ratio*100} className="h-1.5">` · `progressLabel` · `<p className="text-[11px] text-muted-foreground mt-1">Keep going</p>`.

### Not started (zero progress, not "future")
Same container styling as active (no opacity dim — feels available).
Icon · title · description · `<p className="text-[11px] text-muted-foreground mt-2">Start to unlock this</p>`.
**No** progress bar, no `0 of X`, no `0%`.

### Completed
```
rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3
```
Icon container `bg-primary/15` · `CheckCircle2` accent · title · description · `<span className="text-[11px] text-primary mt-1">Completed</span>`. Glow class `animate-milestone-glow` retained when in `uncelebratedIds` (existing CSS keyframe untouched).

### Locked / future
```
rounded-2xl border border-border/40 bg-card px-4 py-3 opacity-85
```
Lock icon (no title gray-out beyond opacity) · title · description · `<p className="text-[11px] text-muted-foreground mt-2">Unlocks after previous tier</p>`. No progress bar, no "Locked —" prefix.

All four variants share the same dimensions / icon placement so the grid is visually uniform.

## 5. Tab pill row — unchanged

Already uses `bg-primary text-primary-foreground` for active state from prior pass. Verified no black fills remain.

## 6. Empty state behavior — unchanged

The global "no progress anywhere" branch (dashed CTA) stays as-is — it only shows when literally every milestone has `state === "locked"` and `progressRatio === 0`. The new grid means even truly fresh users with one solve will see Up Next + tiles for First Crack (active or completed), Off the Bench (active), On a Roll (not started), etc.

## 7. Compact vs full

| Mode | Up Next | Grid columns | Grid cap |
|---|---|---|---|
| `compact` (Stats) | yes | 1 / 2 / 3 | 6 tiles |
| full (`/milestones`) | yes | 1 / 2 / 3 | no cap |

## 8. What stays untouched

- `src/lib/milestones.ts` — descriptions, logic, snapshot, `getAllMilestones`, `checkMilestones`, all unchanged.
- `MilestoneShareCard`, `MilestoneModalManager`, `AdminPreview`, `PremiumPreview` — read legacy fields, untouched.
- `@keyframes milestone-glow` and the new-unlock glow trigger — untouched.
- Routing, `useNavigate`, smart default tab, intro card, ready-gate skeletons, "new" dot on tab pills — all preserved.

## Verification

1. Stats with zero progress, 1 solve recorded → Up Next: Off the Bench with `"9 more solves to go"`, "Closest to unlock" + "You're close" + "Play now →"; grid shows First Crack (Completed), On a Roll (Not started — "Start to unlock this"), Clean Sheet, Long Game, Skilled, Advanced (Future — "Unlocks after previous tier").
2. Solver tab with mid-streak → Up Next: On a Roll with bar + "1 more day to go"; grid shows other solver milestones as Active/Not started/Completed.
3. Completed tiles render with primary tint + checkmark + "Completed" label; new unlocks animate the existing glow keyframe.
4. Locked future tiles show 85% opacity, lock icon, "Unlocks after previous tier" — no "Locked —" prefix, no `0%`.
5. Hovering any tile lifts ~1px with subtle shadow; no new animation libs introduced.
6. Tab pill active state remains primary orange — no black fills.
7. `/milestones` standalone page shows the same grid uncapped, all tiles visible.

