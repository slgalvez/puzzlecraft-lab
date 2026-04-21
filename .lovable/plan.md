

# Remove redundant Up Next copy

One file: `src/components/stats/MilestonesSection.tsx` — `NextCard` only.

## Changes

1. **Delete the "Moment-based" italic fallback** (lines 188-190). Moment-based milestones (no `progressLabel`) will simply render no progress block — the name, description, chip, and CTA already convey enough.

2. **Collapse "Almost there" + "Keep going" into one line.** Keep **"Almost there"** (line 169), delete **"Keep going"** (line 170). "Almost there" is more directional and pairs better with the chip styling.

## Resulting NextCard structure

- Up Next chip + icon
- Name + description
- `Almost there` (single helper line)
- Progress block (active → bar + remaining; zero → bar + baseline + tab helper; moment-based → nothing)
- CTA button

## Untouched

- All tile variants, sorting, hierarchy, hover, glow.
- `milestones.ts`, routing, smart default tab, intro card.

