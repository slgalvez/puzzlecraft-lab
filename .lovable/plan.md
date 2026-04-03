

## Create `src/lib/cellStyles.ts` — Centralised Cell Class Utilities

### What it does
A single utility file that exports typed helper functions for generating Tailwind class strings for every puzzle grid type. Replaces ad-hoc inline styles scattered across grid components.

### File
**`src/lib/cellStyles.ts`** — New file from uploaded content.

### Exports
| Function | Used by |
|---|---|
| `getCellClasses(state)` | Crossword, Kakuro, Sudoku, Fill-in grids |
| `getInputClasses(state)` | Text-entry grids (crossword, fill-in, cryptogram) |
| `getWordSearchCellClasses(state)` | Word search grid |
| `getNonogramCellClasses(state)` | Nonogram grid |
| `getCryptogramCellClasses(state)` | Cryptogram puzzle |

### Additional change
Add the `shake` keyframe to `tailwind.config.ts` so the error animation referenced in `getCellClasses` works:
```
shake: { "0%,100%": { transform: "translateX(0)" }, "25%": { transform: "translateX(-3px)" }, "75%": { transform: "translateX(3px)" } }
```
And the corresponding animation entry: `"shake": "shake 0.2s ease-in-out"`.

### Scope
- Drop-in file creation — no existing components are modified yet
- Grid components can adopt these helpers incrementally in future patches

