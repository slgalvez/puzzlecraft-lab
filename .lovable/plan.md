

# Unified Share System — shareUtils as Single Source of Truth

## Summary
Create `src/lib/shareUtils.ts` as the single source of truth for all share text generation and execution. Reduce `shareText.ts` to a thin re-export wrapper. All formatting fragments live as internal helpers inside shareUtils — never duplicated across builders.

## Implementation Constraints

### Helper safety
- All internal helper functions (`diffLine`, `pbLine`, `streakLine`, `rankLine`, `challengeLine`, `ctaEnding`) return `null` when required data is missing
- Builders collect lines into an array, filter out nulls, then join — no inline conditional string concatenation

### Length constraint (280 char target)
- After assembling all lines, if total length exceeds 280 characters, drop lines in this priority order:
  1. `rankLine` (remove first)
  2. `streakLine`
  3. PB detail (shorten to e.g. "🏆 New PB!" — never remove entirely)
- Trimming loop runs after assembly, before final join

### Line order (strict, all builders)
Every share text follows this exact structure — no reordering per context:
1. Header/title
2. Puzzle line (type · difficulty · time)
3. PB or challenge line
4. Streak line (if present)
5. Rank line (if present)
6. CTA

## Architecture

```text
shareUtils.ts (NEW — single source of truth)
├── Internal helpers (not exported, return null if data missing)
│   ├── puzzleIcon(type)
│   ├── puzzleLabel(type)
│   ├── diffLine(difficulty, time)
│   ├── pbLine(improvement, prev)
│   ├── streakLine(count)
│   ├── rankLine(rank, total)
│   ├── ctaEnding(url)
│   └── challengeLine(time)
├── trimToLimit(lines, 280)        — drops rank → streak → shortens PB
├── buildCompletionShareText()     — uses helpers, trimToLimit
├── buildDailyShareText()          — uses helpers, trimToLimit
├── buildCraftShareText()          — uses helpers, trimToLimit
└── executeShare()                 — native share / clipboard, returns "shared"|"copied"|"error"

shareText.ts (THIN WRAPPER — no formatting logic)
├── re-exports with old signatures, maps params → shareUtils
└── shareOrCopy → executeShare + toast handling
```

## File Changes

### 1. CREATE `src/lib/shareUtils.ts`
- Internal helpers all return `string | null`
- `trimToLimit(lines: (string|null)[], limit = 280)` filters nulls, then drops rank → streak → shortens PB until under limit
- Three builders compose helpers into ordered array: header, puzzle line, PB/challenge, streak, rank, CTA — then pass through `trimToLimit`
- `executeShare(text)` — native share / clipboard fallback, returns `"shared" | "copied" | "error"`

### 2. REWRITE `src/lib/shareText.ts` — thin wrapper
- Remove all formatting logic
- Map old signatures to shareUtils functions
- `shareOrCopy` → calls `executeShare` + handles toast

### 3. UPDATE `src/components/puzzles/CompletionPanel.tsx`
- Import `executeShare` from shareUtils
- Share becomes primary full-width CTA for PB and daily
- Auto-expand share section for daily completions (not just PBs)
- Button state cycles via executeShare return value

### 4. UPDATE `src/pages/DailyPuzzle.tsx`
- Banner share: `executeShare()` replaces `shareOrCopy`
- Button state: "Share result" → "Copied"/"Shared"

### 5. PATCH `src/pages/CraftPuzzle.tsx` (4 edits)
- `handleCopyLink` / `handleShare`: use `executeShare`
- Share container: `border-primary/20 bg-primary/5` tint
- Copy-link text: `text-sm` with hover

### 6. `src/components/craft/CraftSharePreview.tsx` — no changes needed (wrapper preserves signatures)

### 7. `src/pages/AdminPreview.tsx` — verify wrapper compat, minimal updates if needed

## What stays the same
- `craftShare.ts` types and `buildSolveResultShareText` (used by SharedCraftPuzzle)
- `useSolveShareCard` hook
- All puzzle grids, milestone/tracking logic, backend
- Visual theme of CompletionPanel — no redesign

