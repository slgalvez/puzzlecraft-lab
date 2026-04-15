

# Stats Page Refinement — Declutter and Improve Hierarchy

## Changes

### 1. Simplify Player Profile card in `src/pages/Stats.tsx` (lines 357-470)

**Remove** the 2x2 key metrics grid (lines 438-459) — the four stat boxes (No-Hint, Solves, Avg Time, Streak).

**Remove** the insight quote block (lines 462-467).

**Keep only:**
- Tier badge pill
- Rating number + rank + trend
- Peak rating (if higher)
- Expert crown message OR progress bar with CTA
- Header row with P+ badge and Leaderboard link

Result: a clean, focused card with just rank identity and progression.

### 2. Restore Accuracy as a full card in `src/components/account/PremiumStats.tsx` (lines 363-390)

Replace the current inline `border-b` row with a proper card:
- Wrap in `rounded-xl border bg-card p-5`
- Keep the 4-stat grid (Avg Mistakes, No Hints %, Unassisted %, Avg Hints)
- Add the `accuracyInsight` sentence below the grid
- Keep the accuracy trend badge in the header

### 3. Reorder sections in `src/pages/Stats.tsx`

Change the left column order to:
1. Player Profile card (existing, now simplified)
2. Premium upgrade teaser (if applicable)
3. **PremiumStats** (contains: Milestones → Accuracy → Performance by Type)
4. Recent Solves (moved below PremiumStats)

Currently Recent Solves (lines 477-541) renders **before** PremiumStats (lines 544-552). Swap their positions.

### 4. Delete Solve History table from `src/components/account/PremiumStats.tsx` (lines 432-511)

Remove the entire "Solve History" collapsible table section. The "Recent Solves" list in Stats.tsx is the single solve listing.

### 5. Enhance Recent Solves rows in `src/pages/Stats.tsx` (lines 496-531)

Add to each row:
- Score (from `computeSolveScore` on the solve record — requires matching solve records to completions or computing inline)
- PB icon (already exists) and streak flame icon when the solve was a daily challenge
- Difficulty is already shown as a dot + label — keep as-is

This requires importing `computeSolveScore` usage and matching completions against solve records. The completion data from `progressTracker` doesn't have score, so we'll compute it from solve records where available.

### 6. Remove unused imports

Clean up imports that become dead after removing the metrics grid and insight (`ShieldCheck`, `getBestInsight`, etc. from Stats.tsx; `Clock`, `ChevronDown`, `ChevronUp` from PremiumStats.tsx if only used by deleted Solve History).

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Stats.tsx` | Simplify player card (remove metrics grid + insight); move Recent Solves below PremiumStats; enhance solve rows with score/badges |
| `src/components/account/PremiumStats.tsx` | Restore Accuracy as full card with insight sentence; delete Solve History table |

## What does NOT change
- Rating calculations, data sources, view-as logic
- Right column (Activity, Daily, Endless)
- Milestones section
- Performance by Puzzle Type section
- Social tab

