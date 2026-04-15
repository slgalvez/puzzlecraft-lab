

# Fix 5 critical weekly pack bugs — preserving themed content

## Summary

Fix all 5 bugs with surgical changes to 3 files. The themed word bank system (`buildThemedPuzzle`, `getThemeWordBank`, `savePackWordAssignments`, `getPackPuzzleWordBank`) is fully preserved. The architecture uses two identifiers per puzzle: a **string content key** (the existing `seed` field, used for themed content lookup and localStorage persistence) and a separate **numeric generation seed** passed via URL for QuickPlay.

## Changes

### File 1: `src/lib/weeklyPacks.ts`

**Bug 1 + 5 — Numeric seed for generators:**
- Add `numericSeed` field to `PackPuzzle` type
- Add helper: `function packNumericSeed(year: number, week: number, index: number): number` — Knuth multiplicative hash producing a stable positive integer
- Add helper: `function stringToNumericSeed(s: string): number` — hash any string to a stable integer (for override/DB seeds)
- In `buildThemedPuzzle()`: set `numericSeed` on the returned puzzle alongside the existing string `seed`. The string `seed` stays unchanged for content key purposes
- `packSeed()` and `overrideSeed()` remain string functions — they are content keys

**Bug 2 — Plus early access:**
- Change `getCurrentWeeklyPack` return type: replace single `isUnlocked` with `isPlusUnlocked` and `isFreeUnlocked`
- `isPlusUnlocked = now >= plusEarlyDate`
- `isFreeUnlocked = now >= releaseDate`
- Keep `unlocksIn` computed against the appropriate date

**Bug 3 — Free sample puzzle:**
- Add `isSample` and `isAccessible` fields to `PackPuzzle`
- In `getCurrentWeeklyPack()`, after building puzzles: mark `puzzles[0].isSample = true`, then for each puzzle compute `isAccessible`:
  - Plus user + `isPlusUnlocked` → all accessible
  - Free user + `isFreeUnlocked` → only `isSample` puzzle accessible
  - Otherwise → none accessible
- Add `freeCount: number` (always 1) to return type

**No removals.** `buildThemedPuzzle`, `deterministicShuffle`, `savePackWordAssignments`, `getPackPuzzleWordBank`, `getThemeWordBank` import — all preserved.

### File 2: `src/components/ios/WeeklyPackCard.tsx`

**Bug 2 fix — Pass real account:**
- Import `useUserAccount` from `@/contexts/UserAccountContext`
- Replace `usePremiumAccess()` usage for pack computation: pass `{ subscribed: account?.isPremium, isAdmin: account?.isAdmin }` to `getCurrentWeeklyPack()`
- Use `pack.isPlusUnlocked` / `pack.isFreeUnlocked` instead of `pack.isUnlocked`

**Bug 3 fix — Per-puzzle access UI:**
- In `handlePlay`: check `puzzle.isAccessible` instead of `pack.isUnlocked`; if tapping a locked puzzle, open upgrade modal
- Navigate using `firstIncomplete.numericSeed` (the new numeric field) in the URL `seed=` param
- Puzzle pills: show lock icon on non-accessible puzzles, "Free" badge on the sample puzzle for non-premium users
- Footer: show "1 free puzzle · 4 more with Plus" for free users when pack is Sunday-unlocked

### File 3: `src/pages/QuickPlay.tsx`

**Bug 1 fix — Seed parsing:**
- Line 76: `parseInt(initialSeed)` now works because `numericSeed` is passed as URL param (a pure integer string like `"735891234"`)
- No change to themed content: `packWordData` memo using `getPackPuzzleWordBank(packId, packPuzzleId)` stays exactly as-is (lines 55-58)
- `words={packWordData?.wordBank}` and `forcedQuote={packWordData?.quote}` props stay on `WordSearchGrid` and `CryptogramPuzzle` (lines 279, 282)

**Bug 4 fix — Pack completion tracking:**
- Import `markPackPuzzleComplete` from `@/lib/weeklyPacks`
- Add `isPack = !!(packId && packPuzzleId)` flag
- Create `handlePackSolve` callback: calls `markPackPuzzleComplete(packId, packPuzzleId)` then delegates to original `onSolveHandler` if present
- Wire: `onSolveHandler = isPack ? handlePackSolve : (mode === "endless" ? handleEndlessSolve : undefined)`
- Show pack name in mode label when `isPack`

## How themed content is preserved

1. `buildThemedPuzzle()` still calls `getThemeWordBank(theme)` and assigns `wordBank` / `quote` to each `PackPuzzle`
2. `savePackWordAssignments()` still persists themed words to `localStorage` under `puzzlecraft-pack-words-${packId}`
3. QuickPlay still reads them via `getPackPuzzleWordBank(packId, puzzleId)` and passes to grid components
4. The string `seed` field on `PackPuzzle` is unchanged — it serves as the content lookup key
5. The new `numericSeed` field is used only for URL params and generator seeding

## How numeric seed determinism is achieved

- `packNumericSeed(year, week, index)`: `((year * 10000 + week * 100 + index) * 2654435761) >>> 0`
- `stringToNumericSeed(s)`: FNV-1a hash of the string, producing a stable unsigned 32-bit integer
- These are set on `PackPuzzle.numericSeed` by `buildThemedPuzzle()`
- WeeklyPackCard navigates with `seed=${puzzle.numericSeed}` → QuickPlay `parseInt()` succeeds

## Idempotency

`markPackPuzzleComplete` already guards with `.includes(puzzleId)` (line 394) — solving the same puzzle twice does not double-count.

## No changes to

- `src/lib/weeklyThemeWordBanks.ts` — untouched
- `src/lib/packOverrides.ts` — untouched (string seeds still work; `stringToNumericSeed` handles them)
- `src/pages/AdminPreview.tsx` — compatible (new optional fields on `PackPuzzle` don't break existing usage)
- `fetchDbCustomPacks()` warmup — preserved in WeeklyPackCard

## Remaining edge cases

- Old `puzzlecraft-pack-words-*` localStorage entries from before the fix will still work since pack IDs haven't changed
- If a user bookmarked an old string-seed URL, `parseInt` will produce `NaN` → `randomSeed()` fallback (same as current behavior, no regression)
- AdminPreview mini-previews use their own `hashStringSeed()` — unaffected

