---
name: Unified share system
description: shareUtils.ts is single source of truth for all share text and execution; shareText.ts is thin wrapper
type: feature
---
- `src/lib/shareUtils.ts` — Single source of truth for all share text generation and share execution
  - Internal helpers (puzzleIcon, diffLine, pbLine, streakLine, rankLine, ctaEnding, challengeLine) all return `string | null`
  - `trimToLimit()` enforces 280-char limit, dropping rank → streak → shortening PB
  - Strict line order: header, puzzle line, PB/challenge, streak, rank, CTA
  - Three builders: `buildCompletionShareText`, `buildDailyShareText`, `buildCraftShareText`
  - `executeShare()` returns `"shared" | "copied" | "error"`
- `src/lib/shareText.ts` — Thin compatibility wrapper, no formatting logic, maps old signatures to shareUtils
- CompletionPanel auto-expands share for both PB and daily solves
- CraftPuzzle share container uses `border-primary/20 bg-primary/5` tint
- `craftShare.ts` still owns `buildSolveResultShareText` (used by SharedCraftPuzzle)
