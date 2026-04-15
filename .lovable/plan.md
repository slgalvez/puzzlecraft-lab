

# Stats Page Refactor — Remove Redundancy, Clarify Hierarchy

## Current Problems
- **Two rating cards**: Stats.tsx renders a "Your Rank" hero (lines 357-438), then PremiumStats renders another hero with rating/tier/insight (lines 283-327). Both show rating, tier, and progress.
- **Three puzzle-type sections**: PremiumStats "Personal Bests", PremiumStats "Average Performance", and right-column "By Puzzle Type" all show per-category data.
- **Standalone P+ header**: "Performance Breakdown" with a P+ badge sits mid-page as a section header.
- **Accuracy Insights** is a full card competing visually with the hero.

## Plan

### 1. Create unified Player Profile card in Stats.tsx (replaces both rating heroes)

Remove the inline rating hero block (lines 357-438) from Stats.tsx. Move PremiumStats hero section logic into a new unified card rendered directly in Stats.tsx's left column. This card contains:

- Tier badge pill (using `getTierBadgeStyle`)
- Rating number (mono, large) with trend badge
- Leaderboard rank if available
- Expert crown message OR progress-to-next bar
- Key metrics row: no-hint %, total solves, avg time, streak
- Insight quote (from `getBestInsight`)
- Small P+ indicator badge in the header area
- Peak rating if higher than current

This replaces both the Stats.tsx rating hero AND the PremiumStats hero section.

### 2. Strip hero from PremiumStats

Remove the hero section (lines 283-327) from PremiumStats.tsx entirely. PremiumStats now starts with Milestones, then Accuracy, then Solve History. The "Performance Breakdown" header with P+ badge is also removed — the parent handles that context.

### 3. Simplify Accuracy Insights in PremiumStats

Convert the full bordered card (lines 422-451) into a compact inline row:
- Remove the card wrapper, use a lighter `border-b` separator style
- Keep the 4-stat grid but reduce from `text-2xl` to `text-lg`
- Remove the insight paragraph (it's now in the player card)
- Result: visually subordinate to the player profile card

### 4. Create "Performance by Puzzle Type" section in PremiumStats

Replace "Personal Bests" (lines 453-476) and "Average Performance" (lines 478-499) with ONE section. Each puzzle type row shows:
- Type name
- Best time
- Average time
- Solve count

Rendered as a compact list/table rather than two separate grids. This also absorbs the data from the right-column "By Puzzle Type".

### 5. Remove "By Puzzle Type" from right column in Stats.tsx

Delete lines 578-631 (the right-column puzzle type list). Keep Activity calendar, Daily Challenge, Endless Mode.

### 6. Remove standalone key stat cards grid

The 4-card grid (Puzzles Solved, Streak, Avg Time, Fastest) at lines 447-477 is now redundant — these metrics are in the unified player card. Remove it.

### 7. Hierarchy improvements

- Player Profile card gets `shadow-sm` and tier-aware border (already exists via `getTierCardStyle`)
- Milestones, Accuracy, Performance by Type, Solve History use plain `rounded-xl border bg-card` without shadow
- Slightly more spacing before the player card (`mb-8` vs current `space-y-6`)

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Stats.tsx` | Replace rating hero + stat cards with unified Player Profile card; remove right-column "By Puzzle Type"; remove standalone P+ section wrapper |
| `src/components/account/PremiumStats.tsx` | Remove hero section; simplify Accuracy to compact row; merge Personal Bests + Average Performance into one "Performance by Puzzle Type" section |

## What does NOT change
- Rating calculations, solve tracking, data sources
- View-as mode data flow
- Right column: Activity, Daily, Endless
- Recent Solves list
- Milestones section
- Solve History table
- Social tab
- Admin controls logic

