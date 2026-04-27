# Hide Weekly Packs (Visibility Pass)

Hide every user-facing surface that mentions or links to Weekly Packs. Keep routes, components, generators, DB, and pack logic fully intact for future re-enable.

## Strategy

Add a single feature flag and gate all user-facing entry points behind it. No deletions. After applying, sweep the codebase for any remaining user-facing copy.

## Files & Changes

### 1. New flag — `src/lib/featureFlags.ts` (new file)

```ts
// Master switch for hiding Weekly Packs from all user-facing UI.
// Internals (routes, generators, DB, admin tooling) stay functional.
export const WEEKLY_PACKS_VISIBLE = false;
```

### 2. `src/components/puzzles/WeeklyPackSection.tsx`

At top of `WeeklyPackSection`, return `null` when `!WEEKLY_PACKS_VISIBLE`. Removes the card from:
- Home page (`Index.tsx` returning-user compact slot)
- Puzzle Library page (`PuzzleLibrary.tsx`)

### 3. `src/components/ios/IOSPlayTab.tsx` (around lines 350-351)

Wrap `<WeeklyPackCard />` render in `{WEEKLY_PACKS_VISIBLE && (...)}`. Removes the iOS Play tab entry.

### 4. `src/pages/Index.tsx` Puzzlecraft+ marketing copy

- Line 694: drop "and early weekly pack access" → end sentence at "Streak Shield."
- Line 703: remove the `"Weekly pack early access"` chip from the features array.

### 5. `src/components/account/UpgradeModal.tsx`

Reason key `"weekly-pack"` is now unreachable (no entry point triggers it). Update the reason copy to a neutral premium pitch so any stray future trigger does not surface weekly-pack language:
- `headline` → `"Unlock Puzzlecraft+"`
- `sub` → `"Get the full premium experience."`
Keep the type key intact to avoid breaking imports.

### 6. Verification sweep (post-edit)

Run a full ripgrep for user-facing strings and confirm only admin/internal hits remain:
- `"Weekly Pack"`, `"Weekly Packs"`, `"weekly pack"`, `"pack access"`, `"weekly puzzle"`, `"pack streak"`, `"pack progress"`, `"pack preview"`

Expected remaining (allowed) hits:
- `src/lib/weeklyPacks.ts`, `src/lib/packOverrides.ts`, `src/lib/weeklyThemeWordBanks.ts` — internal logic
- `src/components/ios/WeeklyPackCard.tsx` — component file (now unmounted)
- `src/components/puzzles/WeeklyPackSection.tsx` — gated wrapper
- `src/pages/AdminPreview.tsx`, `src/pages/AdminHomepagePreview.tsx` — admin-only tooling
- `src/pages/QuickPlay.tsx` — `?pack=` URL handling (deep-link only, no UI copy)
- Code comments (e.g. `CryptogramPuzzle.tsx` line 29) — non-rendered

Any other user-facing string surfaced by the sweep gets hidden or rephrased in the same pass.

### 7. Leave untouched

- All pack generation, override, and word-bank logic
- `WeeklyPackCard.tsx` component (unrendered for users)
- `QuickPlay.tsx` `?pack=` deep-link support
- Admin preview pages
- Database / Supabase / config

## Verification Checklist

- Web home (`/`): no Weekly Pack card
- `/puzzles`: no Weekly Pack section
- iOS Play tab: no Weekly Pack card
- Account/Plus marketing on Index: no weekly-pack mentions
- UpgradeModal: no weekly-pack copy reachable
- Direct deep link (`/quick-play/...?pack=...`) still resolves and plays
- `/admin-preview` still shows pack tooling for admins
- Final ripgrep sweep returns only allowed internal/admin hits
