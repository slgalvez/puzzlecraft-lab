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
  - `executeShare(text, shareUrl?)` is a 3-tier cascade:
    1. `navigator.share` — native sheet, `text` and `url` kept separate (no URL inlined into text)
    2. `sms:?&body=` on mobile — opens Messages composer; awaits ~120ms after `location.href` so callers don't flash UI
    3. `navigator.clipboard.writeText` — desktop fallback with combined `text\nurl`
  - AbortError from Tier 1 is terminal (user canceled) — no fallback fires
  - Mobile detection uses UA regex + `navigator.userAgentData.mobile`
  - Admin Preview uses the same pipeline; no preview-specific branch
- `src/lib/shareText.ts` — Thin compatibility wrapper, no formatting logic, maps old signatures to shareUtils
- `src/components/ui/ShareButton.tsx` — Universal share button (Lucide `Upload` icon, iMessage-style). Supports icon-only and icon+label modes; `busy`/`copied` states. All callers route through `executeShare()`.
- CompletionPanel auto-expands share for both PB and daily solves
- CraftPuzzle share container uses `border-primary/20 bg-primary/5` tint
- `craftShare.ts` still owns `buildSolveResultShareText` (used by SharedCraftPuzzle)
