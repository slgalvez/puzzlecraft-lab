

# Rewrite Help, FAQ & About Pages

## Overview
Rewrite all three files with a premium, product-confident tone. No "we believe" or filler. Add FAQ section to Help page covering ranking, leaderboards, sharing, and daily challenge.

## Changes

### 1. `src/pages/About.tsx` — Full rewrite
- Opening: one clear sentence — "Puzzlecraft is a competitive puzzle platform where you solve, rank, and share."
- Short sections with icons: **Eight puzzle types** (list them), **Competitive play** (rating system, skill tiers, global leaderboard), **Daily Challenge** (fresh puzzle every day, one attempt), **Create & Share** (craft custom puzzles, send to friends), **Puzzlecraft+** (premium tier mention)
- Concise paragraphs, no fluff. Active voice throughout.

### 2. `src/pages/Help.tsx` — Restructure with Accordion + FAQ
- **Top section**: "How to Play" — each puzzle type collapsed into an `Accordion` (from `@/components/ui/accordion`), showing 3–4 steps + 2 best tips per type. Much more compact than current layout.
- **Bottom section**: "Frequently Asked Questions" — new accordion group:
  - *How does the ranking system work?* — Solve puzzles → earn a score (speed, accuracy, difficulty). First 5 solves are provisional. After 5 your rating is confirmed.
  - *How do leaderboards work?* — Complete 10+ puzzles to appear on the global leaderboard. Rankings update based on your rolling average.
  - *What is the daily challenge?* — A new puzzle every day. One attempt. Compete with other solvers on time and accuracy.
  - *How do I share puzzles?* — Use the Craft tool to build custom puzzles and send them to friends via link.
  - *What is Puzzlecraft+?* — Premium tier with all difficulties, unlimited crafting, full stats, and leaderboard access.

### 3. `src/components/layout/Footer.tsx` — Tagline update
- Change "Daily puzzles for curious minds." → "Solve. Compete. Create."

## Files changed
| File | Change |
|------|--------|
| `src/pages/About.tsx` | Full content rewrite |
| `src/pages/Help.tsx` | Accordion restructure + FAQ section |
| `src/components/layout/Footer.tsx` | Tagline update |

