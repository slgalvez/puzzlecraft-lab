# Puzzlecraft Cinematic Showcase — Final

Standalone `/showcase` route — a product trailer in browser form, optimized for screen recording.

## Recording-friendly rhythm

Every section follows the same 3-beat cadence so any 4–6s clip looks intentional:

1. **0.0s — Still**: section opens fully composed, dramatic, no motion
2. **~0.8s — Reveal**: copy fades up, phone settles into place
3. **~1.6s — Detail**: one small motion element kicks in (cell glow pulse, flame flicker, "You" row shimmer)

Eased curves only (`cubic-bezier(0.2, 0.7, 0.2, 1)`). No overlapping animations. Respects `prefers-reduced-motion`.

## Route

- `/showcase` added to `PublicRoutes` in `src/App.tsx`, rendered **outside** `Layout` for full-bleed cinematic frame
- Dark background scoped to the page — doesn't affect the rest of the app
- Fully responsive: desktop alternates copy/phone left-right; mobile stacks centered, same rhythm

## Sections

```text
1. HERO            Wordmark · "Puzzles, reimagined." · floating phone
2. DAILY           Calendar grid · today's cell glows
3. STREAK          "42" flame · week ribbon
4. SOLVE           Crossword grid · cells light sequentially
5. LEADERBOARDS    Rank list · "You" row in subtle orange
6. SHARING         Two layered phones · share card on top
7. CTA             Puzzlecraft / Modern puzzles, beautifully designed. / [Begin]
```

## Visual language

- Near-black `#050505` base, charcoal `#0e0e10` surfaces, warm off-white text
- Orange `#F97316` used **only as rare glow** — today's daily cell, streak flame, "You" row, CTA hover ring. Never as title fill or large surface.
- Soft radial orbs (8–12% opacity) for depth; vertical fade-to-black between sections
- Playfair Display 56–120px headlines with italic emphasis word; DM Sans 15–18px sub copy; uppercase tracked kickers

## Copy (locked)

| Section | Kicker | Headline | Sub |
|---|---|---|---|
| Hero | Puzzlecraft | Puzzles, *reimagined.* | A daily ritual. Beautifully crafted. |
| Daily | Daily | One puzzle. *Every day.* | A new ritual at midnight. |
| Streak | Streak | Show up. *Keep going.* | Days, weeks, months — quietly counted. |
| Solve | Solve | Slow down. *Think clearly.* | A canvas for quiet focus. |
| Compete | Compete | Quietly *competitive.* | See where your time lands. |
| Share | Share | Made to be *passed on.* | Create a puzzle. Send the moment. |
| CTA | Puzzlecraft | Modern puzzles, *beautifully designed.* | [Begin] |

## Files

**New**
- `src/pages/Showcase.tsx` — page, phone frame, mini screens, reveal hook
- `src/styles/showcase.css` — scoped `sc-*` classes, keyframes, responsive rules

**Edited**
- `src/App.tsx` — register `/showcase` route inside `PublicRoutes`, outside `Layout`

## Out of scope

No nav link (reach directly at `/showcase`), no real images, no backend, no changes to existing pages.
