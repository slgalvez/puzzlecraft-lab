## Goal
Let users dismiss the post-solve completion sheet by tapping the backdrop or swiping the sheet down — without changing puzzle state or scoring.

## Changes (single file: `src/components/puzzles/CompletionSheet.tsx`)

1. **Internal dismissal state**
   - Add a `dismissed` ref/state so the sheet can hide even while parent's `open` is still true.
   - Reset `dismissed` whenever `open` transitions from false → true (next solve reopens it normally).

2. **Backdrop click to dismiss**
   - Make the backdrop `<div>` clickable; on click, animate out (reuse existing 320ms slide-down + opacity), then unmount.
   - Add `cursor-pointer` and `aria-label="Dismiss"`.

3. **Swipe-down gesture on the sheet**
   - Add pointer/touch handlers on the drag-handle area (and top ~80px of the sheet) tracking `pointerdown → pointermove → pointerup`.
   - Translate the sheet by `deltaY` (only positive values) live via inline `transform`.
   - On release: if `deltaY > 80px` OR `velocity > 0.5px/ms`, animate out and dismiss; otherwise spring back to `translate-y-0`.
   - Disable transition during drag, re-enable on release.

4. **Escape key**
   - Add a `keydown` listener for `Escape` while visible to dismiss (desktop nicety).

5. **Optional `onDismiss` callback**
   - New prop `onDismiss?: () => void` invoked after the close animation finishes, so parents can clear `solved` if desired. Existing call sites work unchanged (prop optional).

## Out of scope
- No changes to `CompletionPanel`, scoring, tier-up celebration, or any parent component.
- No new dependencies — vanilla pointer events + existing Tailwind transitions.