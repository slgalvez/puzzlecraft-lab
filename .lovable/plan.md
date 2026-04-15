

# Add tier legend to the leaderboard page

## Change

Add a collapsible "Skill Tiers" explainer section at the bottom of the leaderboard page, below the table and sign-in prompt. Uses the existing `TIER_THRESHOLDS_DISPLAY`, `TIER_COLORS`, and `TIER_BG` constants.

## Implementation

**File:** `src/pages/Leaderboard.tsx`

**1. Add import** for `Collapsible` components:
```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
```

**2. Insert after the sign-in prompt section** (end of the container, before closing `</div>`), a collapsible tier legend:

```tsx
{/* Tier legend */}
<Collapsible className="mt-8">
  <CollapsibleTrigger asChild>
    <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full">
      <Info size={14} />
      <span className="font-medium">Skill Tiers</span>
      <ChevronDown size={12} className="ml-auto transition-transform group-data-[state=open]:rotate-180" />
    </button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="mt-3 rounded-xl border bg-card p-4 space-y-2">
      {TIER_THRESHOLDS_DISPLAY.map((t, i) => {
        const next = i > 0 ? TIER_THRESHOLDS_DISPLAY[i - 1].min - 1 : null;
        return (
          <div key={t.tier} className="flex items-center gap-3">
            <span className={cn(
              "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold min-w-[72px] text-center",
              TIER_BG[t.tier], TIER_COLORS[t.tier],
            )}>
              {t.tier}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {t.min}{next ? `–${next}` : "+"}
            </span>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground pt-2 border-t">
        Rating is based on puzzle difficulty, solve speed, accuracy, and hint usage.
        Higher tiers require more solves to unlock.
      </p>
    </div>
  </CollapsibleContent>
</Collapsible>
```

**Behavior:**
- Collapsed by default — keeps page clean
- Shows all 5 tiers with their rating ranges and colored badges
- Brief explanation of what drives rating
- Uses existing constants and styles — no new dependencies beyond `Collapsible`

One file, one addition.

