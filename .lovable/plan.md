

# Tab-contextual zero-state helper copy

Tiny copy refinement layered on top of the previously approved baseline-progress plan. One file: `src/components/stats/MilestonesSection.tsx`. No logic, no layout, no new components.

## Change

Replace the single hardcoded `"Start playing to begin"` string with a tab-keyed lookup.

### New local map (top of file, alongside `ENCOURAGEMENT` / `GOAL_LINE`)

```ts
const ZERO_STATE_HELPER: Record<MilestoneTab, string> = {
  ranked:  "Start playing to begin",
  solver:  "Start playing to begin",
  crafter: "Start creating to begin",
  social:  "Play or share to begin",
};
```

### Apply in two places

1. **`MilestoneTile` not-started branch (trackable, zero progress)** — under the baseline `Progress` bar + `"0 / 10 solves"` label, render `ZERO_STATE_HELPER[m.tab]` instead of the static string.
2. **`NextCard` zero-progress trackable branch** — same swap under the baseline bar + label.

Non-trackable not-started tiles still render `"Start here"` (unchanged). Moment-based `NextCard` zero-state still renders `"Moment-based — you'll know when it happens"` (unchanged).

## Untouched

- All other copy from the prior plan ("Almost there", "Keep going", "Start here", "Complete the step before", "Play now →" / "Create now →", baseline progress bars, slash-form labels).
- Tile hierarchy, hover lift, grid, sorting, glow, milestone logic.

## Verification

1. Solver/Ranked Up Next or tile at zero progress → "Start playing to begin".
2. Crafter Up Next or tile at zero progress → "Start creating to begin".
3. Social Up Next or tile at zero progress → "Play or share to begin".
4. Non-trackable not-started tiles → still "Start here".

