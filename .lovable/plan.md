

## Show All Milestones Always (with progress bars)

The milestone grid with progress bars already exists in `PremiumStats.tsx` (lines 319-363) — it just has guards that hide it too aggressively.

### Changes (single file: `src/components/account/PremiumStats.tsx`)

1. **Early return block (lines 169-183)**: Replace the static placeholder with the full milestones grid (same code from lines 319-363). Call `getAllMilestones()` before the early return so the data is available. All milestones will show in their locked/greyed state with progress bars at 0%.

2. **Milestones section guard (line 320)**: Remove the condition `(achievedCount > 0 || records.length >= 5)` — always render the milestones section regardless of solve count.

Both changes ensure every milestone is always visible: achieved ones highlighted, in-progress ones with progress bars, and locked ones greyed out at 0%.

