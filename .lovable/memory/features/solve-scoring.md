---
name: Solve scoring system
description: Recalibrated tier thresholds (650/850/1300/1650), minimum solve gates (3/8/18/30), per-type ratings and leaderboards
type: feature
---

## Tier Thresholds (v2 — recalibrated)
- Beginner: 0+
- Casual: 650+ (was 400)
- Skilled: 850+ (was 700)
- Advanced: 1300+ (was 950)
- Expert: 1650+ (was 1200)

## Minimum Solve Gates (TIER_MIN_SOLVES)
- Beginner: 0 solves
- Casual: 3 solves
- Skilled: 8 solves
- Advanced: 18 solves
- Expert: 30 solves

## Single Source of Truth
`getSkillTier(rating, solveCount)` is the ONLY authority for displayed rank.
- ALL user-facing call sites MUST pass solveCount as the second argument
- The bare `getSkillTier(rating)` (without solveCount) returns ungated tier — only for leaderboard display rows where solve_count is stored separately
- DB-stored tiers in `leaderboard_entries` and `type_leaderboard_entries` are snapshots updated by SECURITY DEFINER RPCs

## Per-Type Leaderboards
- `type_leaderboard_entries` table with PK (user_id, puzzle_type)
- `upsert_type_leaderboard_entry` RPC (SECURITY DEFINER, rating cap 4000)
- `computeTypeRating()` uses 15-solve window per type
- `TYPE_LEADERBOARD_MIN_SOLVES = 5` per type
- `LEADERBOARD_MIN_SOLVES = 10` for global

## Leaderboard Constants
- `LEADERBOARD_MIN_SOLVES = 10` (global leaderboard qualification)
- `TYPE_LEADERBOARD_MIN_SOLVES = 5` (per-type leaderboard qualification)
- Old `PROVISIONAL_THRESHOLD` and `LEADERBOARD_THRESHOLD` removed

## Rating Windows
- Global: 25-solve rolling average
- Per-type: 15-solve rolling average

## Gated Call Sites (all pass solveCount)
CompletionPanel, usePuzzleTimer (×2), useRatingSync, milestones (×2), Account, PremiumStats, IOSPlayTab, leaderboardSync
