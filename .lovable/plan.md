

# Refactor Milestones UI into tabbed categories

## Summary
Replace the flat milestone grid in `PremiumStats.tsx` with pill-style category tabs (Ranking, Solves, Streak) inside the existing card. Each tab filters milestones by category. No logic changes — pure UI refactor.

## Categorization

Milestones already have deterministic ID prefixes that map directly to categories:
- **Ranking**: `tier-*` (4 milestones: Casual, Skilled, Advanced, Expert)
- **Solves**: `solves-*` (6 milestones: 10, 50, 100, 250, 500, 1000)
- **Streak**: `streak-*` (6 milestones: 3, 7, 14, 30, 60, 100)

No "Skill" or "Create" categories needed — the existing milestones don't have those types. Three clean tabs cover everything. A helper function `getMilestoneCategory(id)` derives category from the ID prefix.

## Changes — single file: `src/components/account/PremiumStats.tsx`

### 1. Add category state and helper (inside the milestones IIFE, lines 189-278)

Add a `useState` for the active tab (default: `"ranking"`). Add a simple categorizer:

```ts
type MilestoneCategory = "ranking" | "solves" | "streak";
const CATEGORY_TABS: { key: MilestoneCategory; label: string }[] = [
  { key: "ranking", label: "Ranking" },
  { key: "solves", label: "Solves" },
  { key: "streak", label: "Streak" },
];

function getMilestoneCategory(id: string): MilestoneCategory {
  if (id.startsWith("tier-")) return "ranking";
  if (id.startsWith("streak-")) return "streak";
  return "solves";
}
```

### 2. Add pill tabs below the header

Render pill-style buttons using the existing design language — small rounded pills with `bg-primary/10 text-primary` for active, `text-muted-foreground` for inactive. Wrap naturally on mobile (flex-wrap).

```tsx
<div className="flex flex-wrap gap-1.5 mb-3">
  {CATEGORY_TABS.map((tab) => (
    <button
      key={tab.key}
      onClick={() => setActiveCategory(tab.key)}
      className={cn(
        "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
        activeCategory === tab.key
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {tab.label}
      <span className="ml-1 opacity-60">
        {milestones.filter(m => getMilestoneCategory(m.id) === tab.key && m.state === "achieved").length}/
        {milestones.filter(m => getMilestoneCategory(m.id) === tab.key).length}
      </span>
    </button>
  ))}
</div>
```

### 3. Filter the grid

Replace `milestones.map(...)` with `milestones.filter(m => getMilestoneCategory(m.id) === activeCategory).map(...)`.

### 4. Update header count

Change the header count from total achieved to category-specific: show `{categoryAchieved}/{categoryTotal}` or keep the global count — either works.

### What stays the same
- All milestone card styling (border, colors, spacing, celebration sparkles, progress bars, "Next" badge)
- All milestone tracking logic in `milestones.ts`
- All animation classes (`animate-milestone-glow`, `animate-milestone-sparkle`)
- The `achievedCount === 0 && records.length < 5` early-return guard
- Every other section of PremiumStats (Accuracy, Performance by Type)

### State lifting note
The `activeCategory` state needs to be declared at the component level (not inside the IIFE), so it will be added as a `useState` near the other state declarations at the top of the component.

