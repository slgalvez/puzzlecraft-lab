

## Ensure milestones refresh in real-time based on actual stats

**Problem**: Milestones in PremiumStats are computed once on mount and never update during the session. The `records` useMemo has `[useDemo]` as its only dependency, so after solving a new puzzle and navigating back to Stats, stale cached data is shown. The milestone grid doesn't reflect newly achieved milestones until a full page reload.

### Changes

**1. `src/components/account/PremiumStats.tsx`**
- Add a `dataVersion` prop (number) that the parent can bump to force recomputation.
- Change the `records` and `summary` `useMemo` dependencies to include `dataVersion`, so they re-read from localStorage when bumped.
- Wrap `getAllMilestones()` in a `useMemo` that also depends on `dataVersion` + `records`, ensuring milestone states update reactively.

**2. `src/pages/Stats.tsx`**
- Listen for `visibilitychange` events: when the user returns to the Stats tab (after solving a puzzle), bump `dataVersion` to trigger a full refresh of records, milestones, and all derived stats.
- Also bump `dataVersion` on route focus (component mount), ensuring navigating back to `/stats` always shows fresh data.
- Pass `dataVersion` as the `key` prop to `PremiumStats` to force a clean remount with fresh localStorage reads.

### Technical detail

```typescript
// Stats.tsx — bump version on visibility change + mount
const [dataVersion, setDataVersion] = useState(0);

useEffect(() => {
  const handler = () => {
    if (document.visibilityState === "visible") {
      setDataVersion(v => v + 1);
    }
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}, []);

// Force fresh data on every navigation to /stats
useEffect(() => {
  setDataVersion(v => v + 1);
}, []);

// Render with key to force remount
<PremiumStats key={dataVersion} isAdmin={account?.isAdmin} />
```

This ensures that every time the user navigates to or returns to the Stats page, all milestones, records, and analytics are recomputed from the latest localStorage data — no stale cache.

