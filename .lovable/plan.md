

# Crossword + Fill-In Micro-Interactions (Restrained, Hardened)

Subtle feel-only polish with strict safety constraints. No logic, scoring, or validation changes. Transforms never stack; sweep is background-only and check-gated; timeouts cleaned on unmount; hint-chip exit is one-shot.

## Files

- `src/index.css` — keyframes + utility animations
- `src/components/puzzles/CrosswordGrid.tsx` — wire effects + cleanup
- `src/components/puzzles/FillInGrid.tsx` — wire effects + cleanup

## CSS additions (`src/index.css`)

Append next to existing `cell-pop`:

- `cell-enter` — `transform: scale(1.06) → 1` over 110ms ease-out.
- `cell-shake-soft` — `translateX 0 → -2px → 2px → 0` over 180ms.
- `cell-sweep` — `background-color: hsl(var(--primary) / 0.10) → transparent` over 220ms. **Background only — no transform.**
- `clue-fade` — `opacity 0 → 1, translateY 2px → 0` over 120ms.
- `chip-exit` — `opacity 1 → 0, translateY 0 → -6px` over 150ms forwards.

Extend `.puzzle-cell` with `transition: background-color 120ms ease, transform 100ms ease;`.

## Conflict resolution (per cell)

Single transform animation chosen by priority:
```ts
const transformAnim =
  hasError        ? "animate-[cell-shake-soft_180ms_ease-out]" :
  recentlyEntered ? "animate-[cell-enter_110ms_ease-out]"      :
  "";
const bgAnim = sweepCells.has(key) ? "animate-[cell-sweep_220ms_ease-out]" : "";
```

Press uses CSS `:active` only (`active:scale-[0.97]`) — pseudo-class, no animation conflict.

## Transient state + timeout discipline

Two `Set<string>` states per grid: `recentlyEntered`, `sweepCells`.

A single `useRef<Set<number>>(new Set())` per grid tracks every active `setTimeout` ID. Every scheduling call (`setTimeout(...)`) immediately registers its ID; the callback removes itself before mutating state. On unmount:

```ts
useEffect(() => () => {
  timeoutsRef.current.forEach(clearTimeout);
  timeoutsRef.current.clear();
}, []);
```

Guarantees no orphaned animation flags survive a puzzle change, route swap, or component remount.

## Sweep is Check-gated only

`sweepCells` is populated **exclusively inside `handleCheck`** when a word's cells transition to fully-correct. It is **never** populated by `enterLetter`/`enterChar` or by passive crossing-derived correctness during typing. The existing per-cell `correct` flag continues to drive the static `opacity-85` dim independently — that's pure CSS, no animation.

This preserves the "Check is the reward moment" feel and prevents accidental flashes mid-solve.

## Hint chip exit (one-shot, no retrigger)

State machine in component:
```ts
type HintPhase = "visible" | "exiting" | "hidden";
const [hintPhase, setHintPhase] = useState<HintPhase>("visible");
```

On first `keydown` (only when `hintPhase === "visible"`):
1. Set `hintPhase = "exiting"`.
2. Schedule `setTimeout(() => setHintPhase("hidden"), 150)` (registered in `timeoutsRef`).

Subsequent keystrokes during the 150ms window: handler short-circuits because `hintPhase !== "visible"`. The exit animation runs once; the chips unmount cleanly when `"hidden"`. No restart, no class re-application.

Render:
```tsx
{hintPhase !== "hidden" && (
  <div className={hintPhase === "exiting" ? "animate-[chip-exit_150ms_ease-out_forwards]" : ""}>
    {/* three kbd chips */}
  </div>
)}
```

## Active clue fade

Wrap clue text in `<span key={`${activeClue.number}-${activeClue.direction}`} className="inline-block animate-[clue-fade_120ms_ease-out]">…</span>`. React remount triggers fade; no layout reflow.

## Active-cell ring

Add to active cell classes: `outline outline-2 -outline-offset-2 outline-primary/25`. Outline avoids layout shift and doesn't conflict with transforms.

## Haptics (minimal)

Reuse `src/lib/haptic.ts`:
- **Word completion only**: `haptic(15)` inside `handleCheck` when `sweepCells` becomes non-empty.
- **No per-letter haptic.** Skipped to keep typing crisp on lower-end Android.

## Performance guardrails

- All animations CSS-only, ≤ 220ms, transform/opacity/background-color.
- No `setInterval`, no rAF loops.
- Timeout IDs tracked in a ref Set; cleared on unmount.
- Per-cell entry timeout: if a new entry happens on the same cell mid-pop, the existing timeout finishes naturally and clears its own flag — no duplicate scheduling because the set membership is idempotent.

## Untouched

- Solving logic, scoring, validation, autosave, completion sheet, toolbar, ARIA labels, sticky clue bar, cell sizing, Erase action.
- Sudoku, word-search, kakuro, nonogram, cryptogram grids.
- `PuzzleHeader`, `GroupedEntryList`, `PuzzleSession`.

## Verification

1. Type a letter → cell pops to 1.06× then settles. No haptic. No sweep.
2. Type rapidly → no jitter, no stacked transforms, typing latency unchanged.
3. Press Check on wrong cells → shake fires; entry pop suppressed on those cells (priority resolved).
4. Press Check on a fully-correct word → cells flash `bg-primary/10` → transparent over 220ms; one light haptic; static `opacity-85` remains after.
5. Solve a word passively via crossings (no Check pressed) → no sweep, no haptic. Static dim still applies once `correct` flag flips after next Check.
6. First keystroke on desktop → hint chips exit over 150ms. Mash keys during the exit → animation does not restart; chips unmount cleanly at 150ms.
7. Switch puzzle / navigate away mid-animation → no console warnings about state updates after unmount; all pending timeouts cleared.
8. Switch active clue → text fades in over 120ms; no layout jump.
9. Cursor movement → smooth 120ms background transition.
10. Active cell shows subtle inner outline ring (primary @ 25% opacity).

