## Plan: Post-solve score breakdown

Add a small inline breakdown beneath the existing score in the post-solve panel that shows speed, accuracy, and hint factors and how each multiplied your score for this puzzle type.

### Changes

1. **`src/lib/solveScoring.ts`** — export `computeScoreBreakdown(record)` returning the inputs to the existing `computeSolveScore` formula:
   - `expectedTime` (from `EXPECTED_TIMES[type][difficulty]`)
   - `speedFactor` (`expected / solveTime`, clamped 0.6–1.4)
   - `accuracyFactor` (`1 − mistakes × 0.05`, clamped 0.7–1.0) and `trueMistakes`
   - `hintFactor` (1.0 / 0.9 / 0.8 / 0.7)
   - `difficultyMult` and final `score`
   - This reuses the same constants the score already uses; no scoring math changes.

2. **`src/components/puzzles/ScoreBreakdown.tsx`** (new, ~80 lines) — compact card with three rows:
   - Speed — `1:23 vs 2:00 expected · ×1.27`
   - Accuracy — `2 mistakes · ×0.90` (or "Clean ✓ · ×1.00")
   - Hints — `0 hints · ×1.00` (or "1 hint · ×0.90")
   - Footer: `Base 1000 × Easy 0.50 = Score 573` style summary
   - Each multiplier color-coded (emerald > 1.0, muted = 1.0, rose < 1.0).
   - No collapsible — keep it always visible but visually quiet (small text, mono numbers, single rounded-lg muted block).

3. **`src/components/puzzles/CompletionPanel.tsx`** — render `<ScoreBreakdown record={latestRecord} />` directly below the score line (inside the header block), only when `score != null && !assisted`. Use the same `getSolveRecords()[0]` already fetched for `score`.

### Out of scope
- No changes to `DailyPostSolve.tsx` or `CompletionSheet.tsx` (they reuse `CompletionPanel` content).
- No new design tokens — uses existing semantic colors.
- No DB or rating changes.