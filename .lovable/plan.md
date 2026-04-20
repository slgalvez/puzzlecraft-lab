

# Mobile Web + PWA Compatibility Audit

## Summary
Surgical fixes for layout, tap targets, viewport-height behavior, sheets, and PWA standalone polish. No redesign — existing visual language preserved.

## The single biggest bug

`src/App.css` still contains the stock Vite scaffold:
```css
#root { max-width: 1280px; margin: 0 auto; padding: 2rem; text-align: center; }
```
This caps every page width and adds **32px global padding on mobile**, fighting Tailwind's `container`, creating phantom side-padding, and helping cause horizontal-scroll edge cases. The private app already overrides it via `body:has(.private-app) #root { max-width: none; padding: 0; ... }`, but the public app inherits the broken defaults. Fix: replace `App.css` with a minimal stylesheet (or delete its contents) so the Tailwind container fully controls layout.

## Files to fix

### 1. `src/App.css` — REPLACE
Strip Vite scaffold:
```css
#root { width: 100%; min-height: 100dvh; }
```
Remove `.logo`, `.card`, `.read-the-docs`, and the spin animation (unused).

### 2. `index.html` — viewport meta
Restore pinch-zoom (accessibility) while keeping safe-area + keyboard behavior:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
```
Remove `maximum-scale=1.0, user-scalable=no`. Puzzle grids that need to disable double-tap zoom already use `touch-action: manipulation` per-cell (verified in `index.css`).

### 3. `src/components/layout/Layout.tsx` — dvh + safe area
Replace `min-h-screen` with `min-h-[100dvh]` so PWA standalone mode and mobile browser chrome don't push the footer below the fold or cause layout jumps when the URL bar collapses. Add `pb-[env(safe-area-inset-bottom)]` on the wrapper so the footer respects the home-indicator on installed PWA.

### 4. `src/index.css` — global PWA polish
Add (under existing PWA block):
```css
/* PWA standalone: dvh fallback for older Safari */
@supports not (height: 100dvh) {
  .min-h-dvh { min-height: 100vh; }
}

/* Bounce-suppress only at the body level — already done for private app, extend to standalone main app */
@media all and (display-mode: standalone) {
  html, body { overscroll-behavior-y: none; }
}
```
Keep `html, body { overflow-x: hidden; max-width: 100vw }` (already present and correct).

### 5. `src/components/layout/Header.tsx` — mobile menu polish
- Mobile menu button is 36×36; bump to `p-2.5` (40×40) and add explicit `min-h-[44px] min-w-[44px]` for accessibility.
- Mobile nav links: bump `py-2.5` → `py-3` to hit 44px.
- Add `max-h-[calc(100dvh-4rem)] overflow-y-auto` to the open mobile nav so it scrolls on short screens (landscape phones).
- Header already has `pwa-safe-top`. Confirm: it does.

### 6. `src/components/account/UpgradeModal.tsx` — sheet sizing
- Both bottom-sheets (Coming-Soon + Success) currently use no max-height in the Coming-Soon branch and `max-h-[92vh]` in the Stripe-not-configured branch. Switch to `max-h-[92dvh]` and ensure both have `overflow-y-auto`.
- Close button (32×32) → 44×44: `h-11 w-11` and reposition `top-3 right-3`.
- Add `tap-highlight-color: transparent` already global; nothing to change there.

### 7. `src/components/puzzles/CompletionSheet.tsx` — dvh
Change `max-h-[92vh]` → `max-h-[92dvh]`. Sheet already has `pb-[env(safe-area-inset-bottom)]`.

### 8. `src/pages/DailyPuzzle.tsx` — header wrap
- Replace `flex items-center gap-4` for streak + completion chip with `flex flex-wrap items-center gap-3` so neither truncates on narrow widths.
- Completion banner buttons (`Share`, `Play More`): wrap parent in `flex-wrap` + give buttons `min-h-[40px]`.

### 9. `src/pages/Stats.tsx` — small-screen polish
- `TabsList` (`h-10`) is fine; tabs already `flex-1`.
- Right-column calendar card on widths 768–860px gets cramped. Change `md:w-[320px] lg:w-[360px]` → `md:w-full lg:w-[360px]` so it stacks to full-width up to lg, then sticky sidebar at lg+. Preserves desktop behavior unchanged.

### 10. `src/components/social/SocialTab.tsx` — tap targets
- Accept/decline circles in `PendingRequestsPanel` are 32×32 (`h-8 w-8`). Bump to `h-11 w-11` (44×44) for finger-safe taps.
- `AddFriendsPanel` "Add" button is `h-8` — bump to `h-9` (36px) and add `px-3` (still tap-safe with the row padding).

### 11. `src/pages/Index.tsx` — hero stack
Right-side daily challenge card has `mt-10 md:mt-14` while the left column has none. On mobile the right card is fine (it stacks below), but the spacing is a touch large on small phones. Reduce to `mt-6 md:mt-14`. No layout shift on desktop.

### 12. `src/pages/CraftPuzzle.tsx` — limit indicator
Two stacked `text-[10px]` / `text-[11px]` rows with `-mt-1 mb-0` create awkward overlap on small screens. Convert both into a single conditional row (limit OR at-limit, not both) and use `text-xs` consistently. Tap target on the `Unlimited with Plus` button → wrap in `<button>` with `min-h-[36px] px-2`.

### 13. Replace remaining `min-h-screen` with `min-h-[100dvh]`
Files: `src/pages/NotFound.tsx`, `src/components/private/PrivateRoute.tsx`, `src/pages/private/Login.tsx` (3 occurrences). The private-app variant already targets `100dvh` in its container; these inner spinners can match.

## Constraints

| Rule | Enforcement |
|------|-------------|
| Visual language | Unchanged — same colors, fonts, motion |
| Desktop behavior | Preserved (sidebar columns reappear at `lg:`, container queries identical) |
| Tap targets | All interactive controls ≥ 40px short-edge, primary actions ≥ 44px |
| Viewport units | `dvh` everywhere a fixed-height container exists; `vh` fallback via `@supports not` |
| Pinch-zoom | Re-enabled (accessibility); per-cell `touch-action: manipulation` keeps puzzle grids zoom-stable |
| iOS-native specifics | Out of scope per request |
| Horizontal scroll | Eliminated by removing `App.css` Vite defaults and keeping `body { overflow-x: hidden }` |
| Sheets | All bottom sheets use `max-h-[92dvh]` + `pb-[env(safe-area-inset-bottom)]` + `overflow-y-auto` |

## Verification checklist (post-implementation)

1. No horizontal scrollbar on Home, Daily, Play, Library, Craft, Stats, Social at 360px width
2. Footer reachable at bottom of every page on 360×640 mobile
3. Mobile nav menu scrolls when open in landscape
4. UpgradeModal close button + Stripe action buttons all ≥ 44px
5. CompletionSheet doesn't clip when opened on a 360×640 screen with browser chrome
6. Daily completion banner buttons wrap cleanly at 320px width
7. Stats right column: full-width on mobile, sticky sidebar at lg+
8. PWA standalone (`display-mode: standalone`): no overscroll bounce, footer sits above home-indicator, header below status bar
9. Pinch-zoom works on text-heavy pages (Privacy, Terms, Help, About)
10. SocialTab accept/decline circles are easy to tap on mobile

## Out of scope
- iOS-native (Capacitor) tab bar, splash, notch — covered by existing `IOSTabBar` and `pwa-safe-top` rules
- Adding a service worker / true offline support
- Redesigning any existing layouts
- Admin-only QA preview surfaces (unless reused in normal user UI)

