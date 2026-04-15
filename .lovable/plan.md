

# Membership-Based Stats Page Layout

## Overview
Two changes: (1) replace "P+" badge text with "Puzzlecraft+", (2) add `isPlus` flag to conditionally reorder sections and adjust content depth for free vs Plus users.

## Changes

### `src/pages/Stats.tsx`

**1. Replace "P+" label** (line 392)
- Change `P+` → `Puzzlecraft+`

**2. Add membership flag**
```tsx
const isPlus = premiumAccess;
```

**3. Conditional section ordering in left column** (lines 375-564)

Current order: Player Profile → Premium Preview → PremiumStats (Milestones, Accuracy, Performance) → Recent Solves

**Free users** — reorder to:
1. Player Profile (already gated by `premiumAccess`, so free users skip it — keep as-is)
2. Recent Solves (moved UP, limited to 5 rows, no score/badges/difficulty bar)
3. Milestones (via PremiumStats — but this is premium-gated, so free users see the preview teaser instead)
4. Premium Preview teaser (already exists)

**Puzzlecraft+ users** — reorder to:
1. Player Profile
2. PremiumStats (Milestones → Accuracy full → Performance full)
3. Recent Solves (full: 8+ rows, score, PB/clean/daily icons, difficulty bar)

Implementation: Render sections conditionally based on `isPlus`:

```tsx
{/* LEFT COLUMN */}
<div className="min-w-0 flex-1 space-y-6">
  {/* Player Profile — always first when available */}
  {showGeneral && isPlus && localRating && (/* existing profile card */)}

  {/* FREE: Recent Solves first (simplified) */}
  {!isPlus && <RecentSolvesSection simplified />}

  {/* Premium Preview teaser for free */}
  {showGeneral && showUpgrade && !isPlus && !isViewAs && <StatsPremiumPreview ... />}

  {/* PLUS: full premium stats */}
  {showGeneral && isPlus && <PremiumStats ... />}

  {/* PLUS: Recent Solves after premium sections */}
  {isPlus && <RecentSolvesSection full />}
</div>
```

**4. Recent Solves — extract inline render to avoid duplication**

Create a local `renderRecentSolves(simplified: boolean)` function:
- `simplified = true` (free): max 5 rows, hide score, hide clean/daily icons, hide difficulty progress bar, show only type name + time + date
- `simplified = false` (Plus): current full render with all badges, score, bar, 8+ rows

**5. PremiumStats receives `isPlus` prop** — already only rendered for Plus users, so no change needed there.

### `src/components/account/PremiumStats.tsx`

**1. Accept optional `simplified` prop** for potential future use (not needed now since it's only rendered for Plus users).

**No other changes** — Accuracy and Performance sections stay as-is inside PremiumStats since the component is only rendered for Plus users.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Stats.tsx` | Replace "P+" with "Puzzlecraft+"; add `isPlus` flag; reorder sections conditionally; extract `renderRecentSolves(simplified)` to handle free vs Plus row depth |

## What does NOT change
- Data logic, rating calculations, view-as mode
- Right column (Activity, Daily, Endless)
- PremiumStats internals (Milestones, Accuracy, Performance)
- Social tab

