

## Create `usePuzzleSession` Hook

### What it does
A new hook that tracks per-session puzzle state: mistake count, fill progress (current/total), and personal best time. Future components like `PuzzleHeader` will consume this.

### File
**`src/hooks/usePuzzleSession.ts`** — New file, copied from uploaded file with one fix:
- Line 18: Change `import { getSolveRecords } from "@/lib/solveRecords"` → `import { getSolveRecords } from "@/lib/solveTracker"`

### Exports
- `usePuzzleSession(options)` — the hook returning `PuzzleSessionState`
- `formatSessionTime(seconds)` — "3:48" formatter
- `getPuzzleTypeLabel(type)` — human-readable category name
- `getDifficultyLabel(d)` — capitalized difficulty string
- Types: `SessionDifficulty`, `PuzzleSessionState`

### No other files touched
This is a standalone dependency — grid components will wire into it in subsequent patches.

