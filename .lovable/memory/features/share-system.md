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
    2. `sms:?&body=` via hidden `<a>` click on **mobile OR macOS desktop** — opens Messages app pre-filled; awaits ~150ms before resolving
    3. `navigator.clipboard.writeText` — desktop fallback (Windows/Linux/unknown) with combined `text\nurl`
  - AbortError from Tier 1 is terminal (user canceled) — no fallback fires
  - Mobile detection uses UA regex + `navigator.userAgentData.mobile`
  - macOS detection: `Macintosh` UA + `maxTouchPoints <= 1` (excludes iPadOS 13+ which still hits Tier 1)
  - `openSmsComposer()` uses a hidden anchor click, not `location.href`, for protocol-handler compatibility across Chrome/Firefox/Edge on macOS and to avoid visible page navigation
  - First `sms:` invocation on Mac browsers triggers an OS-level "Allow this page to open Messages?" prompt — expected, not suppressed
  - Admin Preview uses the same pipeline; no preview-specific branch
- `src/lib/shareText.ts` — Thin compatibility wrapper, no formatting logic, maps old signatures to shareUtils
- `src/components/ui/ShareButton.tsx` — Universal share button (Lucide `Upload` icon, iMessage-style). Supports icon-only and icon+label modes; `busy`/`copied` states. All callers route through `executeShare()`.
- CompletionPanel auto-expands share for both PB and daily solves
- CraftPuzzle share container uses `border-primary/20 bg-primary/5` tint
- `craftShare.ts` still owns `buildSolveResultShareText` (used by SharedCraftPuzzle)
