
## What I found

- The missing sections are not gone: `By Puzzle Type`, `Daily Challenge`, and `Endless Mode` are all still present in `src/pages/Stats.tsx` inside the Personal tab’s right-column block.
- The current code already tries to show two columns at `md` width and above, and your current preview width is 960px, so this should already be side-by-side.
- Since it still isn’t, the problem is no longer “missing content” or just a breakpoint issue — it’s the current layout method itself not behaving reliably in the live render.
- I also found a separate `Stats` console warning around `TooltipProvider` / `Tooltip`. That is not the cause of the sidebar issue, but it should be cleaned up while touching this page.

## Plan

1. Replace the current `grid`-based Personal tab layout in `src/pages/Stats.tsx` with a more deterministic responsive `flex` layout:
   - wrapper: `flex flex-col md:flex-row`
   - left column: `min-w-0 flex-1`
   - right column: `w-full md:w-[320px] lg:w-[360px] md:shrink-0`
   This will force the stats sidebar to stay on the right at medium/desktop widths instead of depending on the current arbitrary grid template behavior.

2. Keep the existing right-column content exactly where it belongs, in this order:
   - By Puzzle Type
   - Daily Challenge
   - Endless Mode

3. Preserve sticky sidebar behavior by moving the sticky classes onto the right-column container in the new flex layout so it still pins while scrolling on larger screens.

4. Remove the local `TooltipProvider` usage inside `Stats` and rely on the app-level tooltip provider already mounted in `App.tsx`, while keeping the actual tooltips for rating/insights/performance intact.
   - This should resolve the ref warning without changing the built-in tooltip behavior you asked to preserve.

5. Re-verify the Stats page specifically at your current preview width (~960px) to confirm:
   - the Personal tab is truly two-column,
   - the three stat panels are visibly on the right,
   - mobile still stacks correctly below `md`,
   - tooltip interactions still work.

## Expected result

After this change, the right-side stats should no longer drop below the main column at your current preview size. The page will behave like a true main-content + sidebar layout again, while preserving the live stat logic, social tab, premium/admin features, and tooltips.
