## Plan: Recalibrate rating so easy puzzles can't reach Skilled

**Root issue.** Easy word-search caps at `1000 × 0.7 × 1.4 = 980`, which crosses the Skilled threshold (850). With the Skilled gate at only 8 solves, 10 fast easies = Skilled @ 980. We'll lower easy/medium difficulty multipliers and raise solve gates so tiers feel earned.

### Changes (single file: `src/lib/solveScoring.ts`)

1. **Lower easy/medium difficulty multipliers**
   - `easy: 0.7 → 0.5` (max possible score with all bonuses ≈ 700 → caps inside Casual)
   - `medium: 1.0 → 0.85` (max ≈ 1190 → low Skilled)
   - `hard: 1.4` unchanged (max ≈ 1960 → Expert reachable)
   - `extreme: 1.9`, `insane: 2.8` unchanged

2. **Raise solve-count gates** in `TIER_MIN_SOLVES`
   - Casual: 3 → 5
   - Skilled: 8 → 12
   - Advanced: 18 → 25
   - Expert: 30 → 50

3. **No threshold changes.** Tier rating thresholds (650/850/1300/1650) remain — they're already prominently shown to users and the difficulty-mult fix already handles the easy-puzzle issue.

### Resulting tier ceilings (perfect solve, all bonuses)

| Difficulty | Max score | Tier ceiling |
|---|---|---|
| Easy    | ~700  | Casual |
| Medium  | ~1190 | low Skilled |
| Hard    | ~1960 | Expert reachable |
| Extreme | ~2660 | Expert |
| Insane  | ~4116 | Expert |

### Out of scope
No DB / leaderboard schema changes. Existing stored ratings will naturally re-average as users solve more puzzles (25-solve rolling window).