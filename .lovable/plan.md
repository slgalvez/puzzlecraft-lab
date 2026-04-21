

# Milestones polish — copy, tone, subtle premium emphasis

Two-file edit. No layout changes, no new components, no animations, no black buttons.

## File 1 — `src/lib/milestones.ts`

Tighten the `description` strings on the 14 milestone specs only. All `name`, `unlockCopy`, `check`, `progress`, `icon`, `tab` fields untouched.

| id | new description |
|---|---|
| off-the-bench | Your first rating unlock |
| tier-skilled | Climb into the Skilled tier |
| tier-advanced | Climb into the Advanced tier |
| tier-expert | Reach the top of the board |
| first-crack | Solve your very first puzzle |
| on-a-roll | Build your first streak |
| clean-sheet | Solve with no hints, no mistakes |
| the-long-game | Play every one of the 8 puzzle types |
| iron-habit | Hold a 30-day solve streak |
| made-something | Send your first crafted puzzle |
| they-solved-it | Get a recipient to finish your puzzle |
| puzzle-maker | Create and send 5 puzzles |
| challenge-accepted | Solve a puzzle made for you |
| game-on | Beat a creator's challenge time |

## File 2 — `src/components/stats/MilestonesSection.tsx`

### A. `TAB_META` — warmer achieved icon halos
- `ranked.bg`: `bg-primary/10` → `bg-primary/15`
- `solver.bg`: `bg-emerald-500/10` → `bg-emerald-500/15`
- `crafter.bg`: `bg-amber-500/10` → `bg-amber-500/15`
- `social.bg`: `bg-violet-500/10` → `bg-violet-500/15`

### B. Two new local lookup helpers (top of file, no exports)

```ts
const ENCOURAGEMENT: Record<MilestoneTab, string> = {
  ranked:  "Every solve sharpens your rating",
  solver:  "Every solve builds momentum",
  crafter: "Every puzzle you make starts something",
  social:  "Every send turns into a connection",
};

const GOAL_LINE: Record<string, string> = {
  "off-the-bench":     "Solve 10 puzzles to get started",
  "tier-skilled":      "Reach the Skilled tier to unlock",
  "tier-advanced":     "Reach the Advanced tier to unlock",
  "tier-expert":       "Reach the Expert tier to unlock",
  "on-a-roll":         "Build a 3-day streak to unlock",
  "iron-habit":        "Hold a 30-day streak to unlock",
  "the-long-game":     "Play all 8 puzzle types to unlock",
  "puzzle-maker":      "Send 5 puzzles to unlock",
  "made-something":    "Send your first puzzle to unlock",
};
function goalLine(id: string) { return GOAL_LINE[id] ?? "Start to unlock this milestone"; }

const CTA: Record<MilestoneTab, { label: string; route: string }> = {
  ranked:  { label: "Start solving →",  route: "/daily" },
  solver:  { label: "Start solving →",  route: "/daily" },
  social:  { label: "Start solving →",  route: "/daily" },
  crafter: { label: "Start crafting →", route: "/craft" },
};
```

### C. `NextCard` — copy + emphasis + micro-CTA

- Container classes: `border-primary/25 bg-primary/[0.02] shadow-sm` → **`border-primary/40 bg-primary/5 shadow-sm`**.
- Helper line `"This is your next milestone"` → **`"You're starting here"`**.
- Replace the zero-progress branch (where `progressLabel` exists but `progressRatio === 0`) with two stacked muted lines:
  - Line 1: `ENCOURAGEMENT[m.tab]`
  - Line 2: `goalLine(m.id)`
  No `Progress` bar, no `0%`, no "Not started — …".
- Keep the existing `progressRatio > 0` branch intact (label + percent + bar).
- Keep the moment-based fallback intact (`"Moment-based — you'll know when it happens"`).
- New micro-CTA at the bottom of the card body:
  ```tsx
  <Button
    variant="outline"
    size="sm"
    onClick={() => navigate(CTA[m.tab].route)}
    className="mt-3 h-8 px-3 text-xs text-primary border-primary/30 hover:bg-primary/5"
  >
    {CTA[m.tab].label}
  </Button>
  ```
  Pass `navigate` into `NextCard` as a prop (already available in `TabContent` scope).

### D. `InProgressCard` — defensive zero-state
When `m.progressRatio === 0`: hide the `Progress` bar and `progressLabel` row, render single muted line **"Just getting started"**. When `> 0`: unchanged.

### E. `LockedCard` — drop "Locked — …" prefix
Render only `m.description`. Lock icon already conveys state. Remove the `showLockedHint` branch entirely.

### F. Tab pill row — remove black active fill
Active classes `bg-foreground text-background border-foreground` → **`bg-primary text-primary-foreground border-primary`**.
Active inner `<Icon className={cn(isActive ? "text-background" : color)} />` → **`text-primary-foreground`** when active.
Active count chip `text-background/70` → **`text-primary-foreground/80`** when active.
Inactive states unchanged.

### G. Empty-state copy (`EMPTY_TAB_COPY`)
- ranked: `"Solve 10 puzzles to earn your Player Rating"` → **"Solve 10 puzzles to earn your first rating"**
- solver: `"Solve a puzzle to start unlocking milestones"` → **"Start solving to unlock your first milestone"**
- crafter: `"Create and send a puzzle to begin"` → **"Create your first puzzle to begin"**
- social: `"Play or share a puzzle with someone to unlock these"` → **"Play or share with someone to unlock these"**

CTA buttons in the dashed empty-state already use `variant="default"` (primary orange) — no change.

## What is NOT touched

- Milestone logic, unlocking, `milestones.ts` structure beyond description strings.
- Layout, ordering, structure, routes, share cards, modal manager.
- Animations (`milestone-glow` keyframe untouched).
- Standalone `/milestones` page — inherits all polish via shared component.

## Verification

1. Stats Up Next card with no progress: shows "You're starting here", encouragement line, goal line, no `0%`, outline "Start solving →" / "Start crafting →" button.
2. Stats Up Next with partial progress: original progress bar + label + percent renders unchanged.
3. Active tab pill is **primary orange**, never black.
4. Achieved icon halos render at 15% tint per tab color.
5. Locked cards show only description, no "Locked — …" prefix.
6. True global empty state shows the rewritten tab copy with primary "Play Daily" / "Create a Puzzle" CTA.
7. `/milestones` standalone page reflects the same polish.

