

# Tier-Aware Visual Styling for Rating Cards

## Overview
Visual-only enhancement to make each skill tier feel distinct and rewarding. No logic or calculation changes.

## Changes

### 1. `src/components/puzzles/ProvisionalRatingCard.tsx`

**Expert max-rank handling (lines 311-317)**
Replace the misleading 100% progress bar with a clean achievement message:
```tsx
{!nextTier && (
  <div className="mt-4 flex items-center gap-2 text-sm">
    <Crown size={14} className="text-amber-500" />
    <span className="text-amber-500 font-medium">Top-tier solver</span>
  </div>
)}
```

**Tier badge/pill (line 276 confirmed card, line 210 provisional card)**
Replace plain text tier name with a styled badge pill using tier-specific background tints:
```tsx
<span className={cn(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  tierBadgeStyles[tier]
)}>
  {tier}
</span>
```

**Tier-specific card border and background**
Add a helper mapping tiers to border/bg classes:
```tsx
const TIER_CARD_STYLES: Record<SkillTier, string> = {
  Beginner:  "border-border bg-card",
  Casual:    "border-sky-500/20 bg-sky-500/[0.02]",
  Skilled:   "border-emerald-500/20 bg-emerald-500/[0.02]",
  Advanced:  "border-primary/20 bg-primary/[0.03]",
  Expert:    "border-amber-500/25 bg-amber-500/[0.03]",
};

const TIER_BADGE_STYLES: Record<SkillTier, string> = {
  Beginner:  "bg-muted text-muted-foreground",
  Casual:    "bg-sky-500/10 text-sky-500",
  Skilled:   "bg-emerald-500/10 text-emerald-500",
  Advanced:  "bg-primary/10 text-primary",
  Expert:    "bg-amber-500/10 text-amber-500",
};
```

Apply `TIER_CARD_STYLES[tier]` to the confirmed card wrapper (line 249) instead of the hardcoded `border-primary/20 bg-card`.

**Add tier messaging for Expert (confirmed card)**
After the "Based on your recent X solves" text, add:
```tsx
{tier === "Expert" && (
  <p className="text-xs font-medium text-amber-500/80 mt-1">
    You've reached Expert level
  </p>
)}
```

**Card elevation** — Add `shadow-sm` to confirmed card wrapper for subtle lift above milestone cards.

### 2. `src/components/account/PremiumStats.tsx`

**Hero section tier badge (line 292)**
Same badge pill treatment — replace plain `<p>` tier text with the styled badge using `TIER_BADGE_STYLES`.

**Hero Expert progress bar (lines 293-296)**
Conditionally render: if Expert, show "Top-tier solver" message instead of "Progress to next rank" bar.

**Hero card border (line 281)**
Apply tier-aware border tint to the hero card wrapper using the same `TIER_CARD_STYLES` map.

### 3. Shared tier styles
Extract `TIER_CARD_STYLES` and `TIER_BADGE_STYLES` into `src/lib/solveScoring.ts` alongside existing `getTierColor()` so both components import from one place. Add two new exports:
```tsx
export function getTierCardStyle(tier: SkillTier): string { ... }
export function getTierBadgeStyle(tier: SkillTier): string { ... }
```

## Files changed

| File | Change |
|------|--------|
| `src/lib/solveScoring.ts` | Add `getTierCardStyle()` and `getTierBadgeStyle()` exports |
| `src/components/puzzles/ProvisionalRatingCard.tsx` | Tier-aware card styling, badge pill, Expert crown message, remove misleading progress bar, add `shadow-sm` |
| `src/components/account/PremiumStats.tsx` | Hero section: tier badge pill, tier-aware border, Expert progress replacement |

## What does NOT change
- Rating calculations, thresholds, tier logic — untouched
- Provisional flow — unchanged (still uses neutral border)
- Compact variant — unchanged

