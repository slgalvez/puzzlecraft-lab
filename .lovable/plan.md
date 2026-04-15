

# Unified share system — implementation plan

## Summary
Create `src/lib/shareText.ts` as single source of truth for all share copy. Update `CompletionPanel.tsx` and `DailyPuzzle.tsx` to use it. Create `CraftSharePreview.tsx` component. Patch `CraftPuzzle.tsx` to show share preview. All changes preserve paywall timing, iOS share card, and correct DB column usage.

## Files

### 1. NEW: `src/lib/shareText.ts`
Central share text library exporting:
- `buildSolveShareText({ type, difficulty, time, isDaily, isPB, prevBest, score, tier, rank, total, streak })` — rich context-aware text for CompletionPanel
- `buildDailyShareText({ typeName, difficulty, time, streak, rank, total, shareUrl })` — daily banner share
- `buildCraftShareText({ title, from, url, type, creatorSolveTime })` — craft puzzle share (replaces `craftShare.ts` version)
- `getPuzzleTypeEmoji(type)`, `getDifficultyEmoji(difficulty)` helpers
- `shareOrCopy(text, toast)` — shared fallback logic

### 2. EDIT: `src/components/puzzles/CompletionPanel.tsx`
Changes to existing file (surgical, not full replace):

**Share text**: Replace inline `buildShareData()` function (lines 35-65) with call to `buildSolveShareText()` from shareText.ts. Pass score, tier, rank, PB improvement data.

**Share button prominence**: For PBs and daily solves, render a full-width share button above the action row. Standard solves keep share in the action row.

**URL block hidden by default**: Change the share URL/code block (lines 433-445) to only show after a share failure (add `shareFailedFallback` state, set true in catch block of handleShare).

**Preserved (no changes)**:
- `usePaywallTiming` + `checkAfterSolve` (line 128, 187)
- `useSolveShareCard` (lines 146-154)
- `UpgradeModal` render (line 450+)
- `useRatingDelta`, `usePersonalBest` hooks
- Daily rank query using `.eq("date_str", dailyCode!)` (line 164) — already correct
- All haptic feedback
- App rating prompt

### 3. EDIT: `src/pages/DailyPuzzle.tsx`
Changes to the banner share handler (lines 272-283):

**Replace inline template literal** with:
```ts
import { buildDailyShareText, shareOrCopy } from "@/lib/shareText";
```
Then in the onClick handler:
```ts
const text = buildDailyShareText({
  typeName: info.name,
  difficulty: challenge.difficulty,
  time: completion.time,
  streak: streak.current,
  shareUrl: `${window.location.origin}/play?code=daily-${challenge.dateStr}`,
});
await shareOrCopy(text, toast);
```

**Preserved (no changes)**:
- `DIFFICULTY_SELECTED` import and styling (line 23, 226)
- "Play More" route: `/quick-play/${category}?mode=endless` (line 290)
- `writeDailyScore` using `date` column with `as any` cast (lines 84-98)
- All other UI

**Fix**: The `writeDailyScore` function uses `.upsert({ date: ... })` with `as any` cast but the actual DB column is `date_str`. This needs to be corrected to `date_str` to match the schema. The CompletionPanel rank query already uses `date_str` correctly.

### 4. NEW: `src/components/craft/CraftSharePreview.tsx`
iMessage-style bubble preview component showing what recipients will see:
- Renders the share text using `buildCraftShareText` from shareText.ts
- Styled as a chat bubble with proper visual hierarchy
- Props: `title`, `from`, `url`, `type`, `creatorSolveTime`
- Shows below the "Your puzzle is ready to send" heading in Step 3

### 5. PATCH: `src/pages/CraftPuzzle.tsx`
Four targeted edits:
1. **Add import**: `import { CraftSharePreview } from "@/components/craft/CraftSharePreview"`
2. **Add import**: `import { buildCraftShareText as buildUnifiedCraftShareText } from "@/lib/shareText"` 
3. **Insert CraftSharePreview** before the share buttons div (~line 1004), after the challenge time section
4. **Update both `buildCraftShareText` calls** (lines 451, 475) to use the unified version from shareText.ts with the same signature

### 6. FIX: `src/pages/DailyPuzzle.tsx` — DB column
Line 88: Change `date: challenge.dateStr` to `date_str: challenge.dateStr`
Line 95: Change `onConflict: "date,user_id"` to `onConflict: "date_str,user_id"`
Remove the `as any` casts on lines 85 and 98 since the column name now matches the types.

## Corrections beyond uploaded files
1. **DB column**: `date` → `date_str` in DailyPuzzle's writeDailyScore (matches actual schema)
2. **Paywall preserved**: Not removing `usePaywallTiming`, `checkAfterSolve`, or `UpgradeModal` from CompletionPanel
3. **iOS share card preserved**: Not removing `useSolveShareCard` from CompletionPanel
4. **Route preserved**: Daily "Play More" stays `/quick-play/${category}?mode=endless`
5. **Styling preserved**: `DIFFICULTY_SELECTED` kept on daily difficulty badge
6. **No dead imports**: Only add what's used, remove old `buildShareData` function

## Remaining edge cases
- `craftShare.ts` still exports the old `buildCraftShareText` — keep it for backward compatibility with `SharedCraftPuzzle.tsx` which imports `buildSolveResultShareText` from there. The craft share text in CraftPuzzle.tsx switches to shareText.ts.
- If `navigator.share` throws a non-AbortError, the URL fallback box appears — users see the link only when needed.

