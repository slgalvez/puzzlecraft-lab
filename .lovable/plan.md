

# Blend Real + Mock Data on Homepage Leaderboard

## Problem
Currently, the homepage leaderboard shows either all mock data (if no real scores exist) or all real data (if ≥1 real score exists). The request is to always show 3 entries, prioritizing real users and filling remaining slots with mock data.

## Logic Change

In `useDailyBoard` hook (src/pages/Index.tsx, lines 119–142):

After fetching real top-3 scores from `daily_scores`:
- If real rows ≥ 3 → use them as-is (no mocks needed)
- If real rows = 1 or 2 → place real user(s) first (sorted by time), then fill remaining slots with mock entries (filtered to avoid name collisions with real names)
- If real rows = 0 → show 3 mock entries (current behavior)

The real user always appears at rank #1 (or their natural position among real users). Mock entries fill positions after real ones.

## Changes

### `src/pages/Index.tsx`

**`useDailyBoard` hook (lines 119–142)** — Update the fetch callback:

```typescript
function useDailyBoard(dateStr: string) {
  const [rows, setRows] = useState<LeaderRow[]>(() => getMockLeaderboard(dateStr));
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ count }, { data: top }] = await Promise.all([
          supabase.from("daily_scores" as any).select("*", { count: "exact", head: true }).eq("date_str", dateStr) as any,
          supabase.from("daily_scores" as any).select("display_name, solve_time").eq("date_str", dateStr).order("solve_time", { ascending: true }).limit(3) as any,
        ]);
        if (cancelled) return;
        if (count != null) setPlayerCount(count);

        const realRows: LeaderRow[] = (top ?? []).map((r: any) => ({
          display_name: r.display_name ?? "Anonymous",
          solve_time: r.solve_time,
        }));

        if (realRows.length >= 3) {
          setRows(realRows);
        } else {
          // Fill remaining slots with mock data
          const needed = 3 - realRows.length;
          const realNames = new Set(realRows.map(r => r.display_name));
          const mocks = getMockLeaderboard(dateStr, needed + 3) // generate extras to filter
            .filter(m => !realNames.has(m.display_name))
            .slice(0, needed)
            .map(m => ({
              ...m,
              // Ensure mock times are slower than the slowest real entry
              solve_time: Math.max(
                m.solve_time,
                (realRows[realRows.length - 1]?.solve_time ?? 0) + 5
              ),
            }));
          setRows([...realRows, ...mocks]);
        }
      } catch { /* keep mock fallback */ }
    })();
    return () => { cancelled = true; };
  }, [dateStr]);

  return { rows, playerCount };
}
```

**No other changes needed.** The rendering code already handles `is_mock` styling, and mock entries retain their `is_mock: true` flag from `getMockLeaderboard`.

