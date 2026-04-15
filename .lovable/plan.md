

# Add early leaderboard message for low player counts

## Change
**File:** `src/pages/Leaderboard.tsx`

Insert a subtle banner above the leaderboard table (before line 404) that shows only when `ranked.length > 0 && ranked.length < 3`:

```tsx
{!isLoading && ranked.length > 0 && ranked.length < 3 && (
  <p className="text-xs text-muted-foreground text-center mb-3 italic">
    Early leaderboard — be one of the first to rank
  </p>
)}
```

No other changes. The leaderboard table remains fully visible regardless of count. No "coming soon" or empty-state changes.

