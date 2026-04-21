

# Milestones become part of Stats

Promote the upgraded milestone UI (4 tabs, Up Next, descriptions, empty states, skeletons, intro card) into the Stats page as the primary milestone surface. Replace the legacy 3-tab compact grid currently rendered inside `PremiumStats`. Keep `/milestones` reachable as an optional expanded view.

## What changes

### 1. New shared component — `src/components/stats/MilestonesSection.tsx`

Extract every UI piece from `src/pages/Milestones.tsx` (TAB_META, MilestoneIconView, NextCard, AchievedCard, InProgressCard, LockedCard, EMPTY_TAB_COPY, TabContent, the `@keyframes milestone-glow` style block, the intro-card logic, the 4-tab pill row, the skeleton ready-gate) into a single self-contained `<MilestonesSection />` component.

Props (all optional):
- `defaultTab?: MilestoneTab` — default `"solver"`
- `compact?: boolean` — when `true`: hide the "Coming Up" list (keeps Up Next + In Progress + Achieved), tighter top spacing, no own heading. Used inside Stats.
- `showViewAllLink?: boolean` — renders a small right-aligned "View all →" link to `/milestones`.

Internals stay 1:1 with current Milestones page logic: `getAllMilestones()`, per-tab counts on pill row, "new" dot, one-shot skeleton ready-gate via `useRef`, intro-card gated by `localStorage.getItem("milestones_seen_intro")`.

### 2. `src/components/account/PremiumStats.tsx`

- Remove the entire current Milestones block (lines ~202–318): `getMilestoneCategory`, `CATEGORY_TABS`, `MILESTONE_ICONS`, the `<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">` tile grid, and related imports (`Puzzle`, `Flame`, `Crown`, `Medal`, `Bolt`, `MilestoneIcon`, `getUncelebratedIds`, `markCelebrated`).
- In its place render `<MilestonesSection compact showViewAllLink />` wrapped in the same `rounded-xl border bg-card p-5` shell, with the existing `Award` icon + "Milestones" heading on top. Keep section first-in-order (Milestones → Accuracy → Performance → Solve History).
- Pass nothing else; the component reads its own data via existing `getAllMilestones()`. The current `overrideSolveRecords` prop on PremiumStats only feeds Accuracy/Performance — milestones already source live data globally, same behavior as the standalone page today.

### 3. `src/pages/Milestones.tsx`

Reduce to a thin wrapper: render `<Layout><div className="container py-6 md:py-10 max-w-2xl">…<MilestonesSection /></div></Layout>` (non-compact, no view-all link, full tab including Coming Up). Keep page heading + total achieved count copy that already lives there. All previously-inlined pieces now come from the shared component.

### 4. `src/pages/Stats.tsx` — surface for free users

Currently the milestones live inside `PremiumStats`, which only renders for `isPlus` users. Move the surface so free users see milestones too:

- Add `<MilestonesSection compact showViewAllLink />` directly on Stats just above the `StatsPremiumPreview` / `PremiumStats` block (around line 1050), gated only by `stats.totalSolved > 0` — i.e. anyone past the empty state sees it.
- Inside `PremiumStats`, the section is removed (per change #2) so we don't double-render.
- Keep the existing top-right "Milestones" button (line 856–864) — it now serves as the "see the full standalone page" entry; alternatively consolidate into the inline "View all →" link. Plan: keep the button; it's discoverable and consistent with current header layout.

### 5. Legacy compat

`MilestoneShareCard`, `MilestoneModalManager`, `AdminPreview` continue to read `getAllMilestones()` directly with the legacy `label`/`icon`/`emoji`/`current`/`target` fields — those fields stay on `MilestoneResult`, untouched.

## Layout impression on Stats

```text
Heading: Your Progress      [Milestones btn] [Admin]
Personal | Social
─────────────────────────────────────────
Stat cards (rating, streak, totals)
Activity calendar
Daily / Endless cards
Recent solves preview

┌─ Milestones ──────────────── View all → ┐
│ [Ranked] [Solver] [Crafter] [Social]    │
│                                         │
│ ┌─ Up Next ─────────────────┐           │
│ │ On a Roll                 │           │
│ │ Solve puzzles 3 days …    │           │
│ │ ▓▓▓░░ 2 of 3 days  66%    │           │
│ └───────────────────────────┘           │
│                                         │
│ Achieved                                │
│ • First Crack                           │
└─────────────────────────────────────────┘

Premium upsell / PremiumStats
Recent solves (full)
```

On a brand-new account the section shows the dashed empty-state CTA per tab (e.g. "Solve a puzzle to start unlocking milestones · Play Daily").

## Verification

1. `/stats` (free user, ≥1 solve) — Milestones section renders inline with 4 tabs; Up Next card visible; "View all →" link routes to `/milestones`.
2. `/stats` (Plus user) — same section appears once (not duplicated by PremiumStats).
3. `/stats` (zero solves) — no Milestones section (matches existing empty state).
4. Tab switch on Stats — no skeleton flicker (one-shot ready gate preserved).
5. `/milestones` — full version renders including "Coming Up" list, no intro card after dismissing once on Stats (shared `localStorage` key `milestones_seen_intro`).
6. Solve a puzzle → toast fires (unchanged) → Stats Milestones section animates glow on the new card.
7. `MilestoneShareCard`, `MilestoneModalManager`, `AdminPreview`, `PremiumPreview` continue to render without error (legacy field shape preserved).
8. Top-right "Milestones" button on Stats still navigates to `/milestones`.

