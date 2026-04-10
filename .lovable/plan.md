

## Fix NaN values on Stats page when local records are empty

**Problem**: When a user has a rating in the database but no local solve records (e.g., new device), `records.length === 0` but `ratingInfo.hasNoData` is false. The early return at line 225 is skipped, and the code at line 227+ divides by `records.length` (0), producing NaN for No-Hint Rate, Avg Mistakes, Unassisted %, etc.

**Fix** (single file: `src/components/account/PremiumStats.tsx`):

1. **Add a second early return for "has rating but no local records"** (after line 225): When `records.length === 0` but we have a DB-backed rating, show the `ProvisionalRatingCard` (which correctly displays the rating) and the milestones grid, but skip all the analytics sections (Accuracy, Personal Bests, Average Performance, Solve History) that require local records. This mirrors the existing early return pattern but uses the DB-backed `ratingInfo`.

2. **Guard the inline No-Hint / Total Solves card** (lines 330-349): Add `records.length > 0` to the condition so the card with `records.filter(...).length / records.length` doesn't render when there are no records.

This ensures the page shows the rating + milestones from the DB without any NaN values, and the detailed analytics sections only appear once local solve data exists.

### Technical detail

The guard at line 225 currently checks `records.length === 0 && ratingInfo.hasNoData`. We add a new block right after:

```typescript
if (records.length === 0) {
  // Has DB rating but no local records — show rating card + milestones only
  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <h2>Performance Breakdown</h2>
          <span>Puzzlecraft+</span>
        </div>
        <ProvisionalRatingCard info={ratingInfo} />
        {/* Milestones grid (same as elsewhere) */}
        ...milestones grid...
      </div>
    </TooltipProvider>
  );
}
```

This prevents any division-by-zero path from executing.

