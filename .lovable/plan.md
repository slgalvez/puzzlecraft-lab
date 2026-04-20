

## Remove calendar streak connector lines

Surgical removal of the horizontal connector bars between consecutive daily-complete days. Keep all streak metadata, the flame badge on the active streak end, the tooltip "Day N of streak" labels, and the footer streak summary.

### Changes — `src/pages/Stats.tsx`

**Free 7-day row (lines 264–271):** Delete the two `<span>` connector elements:
- Left half: `seg?.prev && <span ... bg-primary/30 ... />`
- Right half: `seg?.next && <span ... bg-primary/30 ... />`

**Plus monthly grid (lines 392–399):** Delete the same two connector spans inside the monthly cell renderer.

### Preserved (no change)
- `streakInfo` calculation (still drives the flame badge + footer text)
- Flame icon at `isActiveStreakEnd` cells
- Tooltip `streakLabel` text on hover
- Footer "N-day daily streak" line in both Free row (lines 311–315) and Plus grid (lines 496–501)

### Out of scope
- Streak calculation logic
- Flame badge or tooltip behavior
- Footer summary styling

