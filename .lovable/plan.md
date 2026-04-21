

# Make Stats milestones a real surface

The embedded `<MilestonesSection compact showViewAllLink />` on `/stats` collapses into a teaser whenever the default tab (`solver`) has no progress, even when other tabs have achieved or in-progress milestones. Fix it so Stats shows real cards inline.

All edits are in `src/components/stats/MilestonesSection.tsx` plus one prop change in `src/pages/Stats.tsx`. No data-layer changes.

## Changes

### 1. Smart default tab (replaces hardcoded `"solver"`)

In `MilestonesSection`, when no `defaultTab` is explicitly passed, compute the initial tab from live data:

Priority:
1. First tab (in canonical order: `ranked → solver → crafter → social`) with **any achieved or in-progress** milestone.
2. Otherwise, first tab with a milestone whose `progressRatio > 0` (locked-but-started).
3. Otherwise, fall back to `"solver"`.

Implemented as a `useState` initializer that calls `getAllMilestones()` once. If the caller passes `defaultTab` explicitly, honor it (the standalone `/milestones` page can keep `"solver"` if it wants — currently it passes nothing, so it gets the same smart default, which is fine).

### 2. Global "truly empty" check — empty-state CTA only when nothing exists anywhere

Replace the per-tab `hasNoData` collapse with a section-level check computed once at the top of `MilestonesSection`:

```
const hasAnyProgress = allMilestones.some(
  (m) => m.state === "achieved" || m.state === "in-progress" || m.progressRatio > 0
);
```

- If `!hasAnyProgress` → render a single section-level empty-state card (uses the active tab's `EMPTY_TAB_COPY` so the CTA still feels relevant) and skip the per-tab body. This is the only place the dashed CTA appears.
- If `hasAnyProgress` → always render the milestone grid in the active tab, even if that specific tab has zero progress.

### 3. Per-tab "no progress yet" tabs still show real cards

Inside `TabContent`, remove the `hasNoData` branch entirely. When a tab has no `next` / `inProgress` / `achieved`:
- Always render any locked milestones in that tab as `LockedCard`s (so Crafter shows "Made Something / They Solved It / Puzzle Maker" as locked previews, not a CTA).
- If `next` is `null` (no `isNext` flagged because all are locked with 0 progress), surface the **first locked milestone in tab order** as the "Up Next" card so the section always has a focal card. Use `NextCard` — it already handles `progressRatio === 0` with the "Not started" hint.

This guarantees every tab shows a real grid: Up Next + Coming Up (or just Coming Up if compact hides it).

### 4. Compact mode shows "Coming Up" too

Currently `showLocked={!compact}` hides locked cards in compact mode. Per the request, compact must still show locked/coming-up cards — just fewer. Change to:
- Always show `locked` in compact mode, but **cap at 2 cards** (`locked.slice(0, 2)`).
- Full mode (`/milestones`) shows all locked, unchanged.

This keeps Stats compact (Up Next + up to 2 in-progress + achieved + up to 2 locked) without collapsing into a single card.

### 5. Remove inline "View all" from Stats embed

In `src/pages/Stats.tsx` line 1059, change:
```
<MilestonesSection compact showViewAllLink />
```
to:
```
<MilestonesSection compact />
```

The top-right "Milestones" button on the Stats page header (already present at line 856-865) remains the route to `/milestones`. The `showViewAllLink` prop stays in the component API for any future use but is no longer set on Stats.

### 6. Standalone `/milestones` unchanged in behavior

`src/pages/Milestones.tsx` calls `<MilestonesSection />` with no props → it gets the smart default tab and full (non-compact) layout including all Coming Up cards. No edits needed there.

## Verification

1. **Stats, fresh user with 1 ranked solve, 0 streak, 0 crafted** → embedded section opens on Ranked tab (first with progress), shows Off the Bench as Up Next with progress bar; Solver/Crafter/Social tabs render Up Next + 2 Coming Up cards each (not the dashed CTA).
2. **Stats, user with only Crafter activity** → opens on Crafter tab; Ranked/Solver tabs still render real locked cards instead of CTA.
3. **Stats, true zero state (`totalSolved === 0`)** → Stats already short-circuits to `EmptyStats` before reaching the milestones block; section is not rendered. (Existing behavior preserved.)
4. **Stats, user with no progress in any tab but `totalSolved > 0`** (edge: solves filtered out under 10s) → section shows the single global empty-state CTA with the active tab's copy.
5. **Stats inline "View all →" link is gone**; top-right "Milestones" button still routes to `/milestones`.
6. **`/milestones` page** → renders all 4 tabs with full Coming Up lists, smart default tab applied.
7. **Tab switching on Stats** → no skeleton flicker (one-shot ready gate preserved); tabs always show real cards.
8. **Glow / new-dot / intro card / `MilestoneShareCard` / `MilestoneModalManager`** → all unchanged (no data shape edits).

