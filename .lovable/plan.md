

# Refine Craft puzzle type cards

## Goal
Clean up `CraftTypeCards` so each card shows only icon, title, difficulty badge, and short description. Tighten spacing, vertically center content, keep the entire card tappable. No flow or theme changes.

## Changes — `src/components/craft/CraftTypeCards.tsx`

### Data model
- Drop `youDo`, `theyGet`, `exampleWords` from `TypeOption` and from each `TYPE_OPTIONS` entry.
- Keep `value`, `label`, `tagline`, `difficulty`, `accentClass`, `iconBg`.
- `export { TYPE_OPTIONS }` preserved (no external consumers reference removed fields — verified via search).

### Card markup
Replace the four-section card with a single tappable button whose content is vertically centered:

```text
┌──────────────────────────────────────┐
│                                      │
│  [icon]  Title           [Easy]      │
│          Short description           │
│                                      │
└──────────────────────────────────────┘
```

- Outer `<button>` keeps `onClick={() => onSelect(opt.value)}` — entire card is the tap target (unchanged).
- Inner container: `flex items-center gap-3 px-4 py-4 min-h-[80px]` — vertical centering via `items-center`, generous padding for mobile (≥44px tap height with room to spare).
- Icon: 44×44 (unchanged), keeps accent bg + hover scale.
- Text column: title row (label + difficulty badge) on line 1, tagline on line 2 (`text-[13px] leading-snug text-muted-foreground`).
- Remove: divider, You/They rows, example word chips, "Choose →" affordance.

### Hover accent line
Keep the existing bottom 0.5px colored line, but soften it:
- Reduce opacity on hover from `opacity-100` → `opacity-60`.
- Keep the 200ms fade. Subtle premium cue, not attention-seeking.

### Tap target & spacing
- Card `min-h-[80px]` ensures a generous, consistent hit area on mobile.
- Grid stays `grid-cols-1 sm:grid-cols-2 gap-3`.
- Active state `active:scale-[0.98]` retained for tactile feedback.
- Helper text under the grid retained verbatim.

### Preserved
- Component signature `({ onSelect }: { onSelect: (type: CraftType) => void })`.
- `CraftType` union, `TYPE_OPTIONS` export, accent classes, icon backgrounds, animation stagger, hover scale on icon.
- Call sites (`CraftPuzzle.tsx`, `CraftPreviewPage.tsx`) — no prop changes.

## Verification
1. `/craft` → 4 compact cards, each ~80px tall, content vertically centered.
2. Tapping anywhere on a card (including padding) advances to the next step.
3. Hover shows softened accent line + icon scale.
4. Mobile: tap targets feel generous; no accidental dead zones.
5. No TypeScript errors from removed fields.

## Out of scope
- Step flow, header copy, helper text.
- Theme tokens, accent palette.
- `CraftPuzzle.tsx` / `CraftPreviewPage.tsx` logic.

