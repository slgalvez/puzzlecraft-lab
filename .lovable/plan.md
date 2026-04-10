

## Re-add rating explanation tooltip to ProvisionalRatingCard

**What was lost**: An Info icon tooltip near the "Player Rating" / "Your Rank" label that read:

> **Your rating is based on:**
> • Puzzle difficulty
> • Solve speed
> • Accuracy
> • Hint usage

This was removed when the Stats page ranking card was refactored into `ProvisionalRatingCard`.

### Change

**`src/components/puzzles/ProvisionalRatingCard.tsx`**

Add the tooltip back in both the **provisional** and **confirmed** card states, next to the header label ("Player Rating" / "Your Rank"):

- Import `Info` from lucide-react and `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger` from the UI library
- Place an `<Info size={12}>` icon button wrapped in a Tooltip next to the existing `<Zap>` + label
- Tooltip content: bold "Your rating is based on:" followed by a bullet list: Puzzle difficulty, Solve speed, Accuracy, Hint usage
- Style matches original: `max-w-52 text-xs leading-relaxed`

No other files need changes — the tooltip lives in the shared card component so it appears on both desktop and iOS.

