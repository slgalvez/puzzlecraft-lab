## Goal
Reduce visual weight of the "Switch to Annual / Monthly" button on `/account` so it feels like a subtle secondary affordance, not a primary CTA equal to "Manage Subscription".

## Changes (single file: `src/pages/Account.tsx`, ~lines 285–310)

Replace the full-width outline `Button` for plan switching with a minimal text link:

- Remove `variant="outline"`, `size="sm"`, and `className="w-full"`.
- Use `variant="link"` (or a plain `<button>`) with:
  - `text-xs text-muted-foreground hover:text-foreground`
  - `underline-offset-4 hover:underline`
  - No background, no border, no full-width.
- Shorten copy:
  - Monthly → Annual: `Switch to annual · save 44%`
  - Annual → Monthly: `Switch to monthly`
- While switching: `Switching…` (unchanged).
- Place it right-aligned (or left-aligned) under the "Manage Subscription" button, separated by a small gap, so "Manage Subscription" remains the visually primary control.

No logic, no edge function, no context changes — purely presentational.

## Out of scope
- Pricing copy changes elsewhere
- UpgradeModal styling
- Any backend behavior
