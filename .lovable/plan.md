

# Reduce Visual Weight of Puzzle Header

## File: `src/components/puzzles/PuzzleHeader.tsx`

Single file, class-only changes. No layout or structural modifications.

### Changes

| Section | Current | New |
|---|---|---|
| **Row 1 padding** (line 136) | `pt-3 pb-2` | `pt-2 pb-1.5` |
| **Type label** (line 150) | `text-[11px] font-semibold uppercase tracking-widest text-muted-foreground` | `text-[12px] font-medium tracking-wide text-foreground` (normal case) |
| **Difficulty pill** (line 155) | `px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest` | `px-1.5 py-px text-[9px] font-medium uppercase tracking-wider` |
| **Subtitle/title** (line 163) | `text-[12px] font-medium text-foreground` | `text-[11px] font-medium text-muted-foreground` |
| **Stat values** (lines 179, 195, 208) | `text-[15px]` | `text-[14px]` |
| **Stat labels** (lines 186, 201, 211) | `text-[9px]` | `text-[8px]` |
| **Stats row padding** (lines 176, 192, 207) | `py-1.5` | `py-1` |
| **Progress row padding** (line 219) | `pb-2.5 pt-1.5` | `pb-2 pt-1` |

No functionality, color system, or selector changes.

