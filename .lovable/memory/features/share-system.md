---
name: Unified share system
description: shareUtils.ts is single source of truth for all share text and execution; shareText.ts is thin wrapper
type: feature
---
- `src/lib/shareUtils.ts` — Single source of truth for all share text generation and share execution
  - Internal helpers (puzzleIcon, diffLine, pbLine, streakLine, rankLine, ctaEnding, challengeLine) all return `string | null`
  - `trimToLimit()` enforces 280-char limit, dropping rank → streak → shortening PB. CTA line (index 5) is sacred — never dropped.
  - Strict line order: header, puzzle line, PB/challenge, streak, rank, CTA
  - Three builders: `buildCompletionShareText`, `buildDailyShareText`, `buildCraftShareText`
  - `executeShare(text, shareUrl?)` returns `"shared" | "copied" | "error"`. Optional `shareUrl` for link-only callers (e.g. craft copy-link); does not open a second share pathway.
- `src/lib/shareText.ts` — Thin compatibility wrapper, no formatting logic, maps old signatures to shareUtils
- CompletionPanel auto-expands share for both PB and daily solves
- CraftPuzzle share container uses `border-primary/20 bg-primary/5` tint
- `craftShare.ts` still owns `buildSolveResultShareText` (used by SharedCraftPuzzle)
