/**
 * CraftColorPicker.tsx
 * src/components/craft/CraftColorPicker.tsx
 *
 * Lets the creator pick a color palette for their craft puzzle.
 */

import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";

// ── Palette definitions ───────────────────────────────────────────────────────

export interface CraftColorPalette {
  id: string;
  label: string;
  cell: string;
  active: string;
  highlight: string;
  correct: string;
  border: string;
  text: string;
}

export const CRAFT_PALETTES: CraftColorPalette[] = [
  {
    id: "default",
    label: "Default",
    cell: "", active: "", highlight: "", correct: "", border: "", text: "",
  },
  {
    id: "ocean",
    label: "Ocean",
    cell:      "hsl(210 60% 97%)",
    active:    "hsl(210 80% 85%)",
    highlight: "hsl(210 60% 90%)",
    correct:   "hsl(160 55% 88%)",
    border:    "hsl(210 30% 75%)",
    text:      "hsl(210 50% 20%)",
  },
  {
    id: "sunset",
    label: "Sunset",
    cell:      "hsl(20 60% 97%)",
    active:    "hsl(20 85% 88%)",
    highlight: "hsl(20 60% 92%)",
    correct:   "hsl(45 75% 88%)",
    border:    "hsl(20 35% 78%)",
    text:      "hsl(20 45% 22%)",
  },
  {
    id: "forest",
    label: "Forest",
    cell:      "hsl(140 45% 96%)",
    active:    "hsl(140 55% 84%)",
    highlight: "hsl(140 40% 90%)",
    correct:   "hsl(80 50% 86%)",
    border:    "hsl(140 25% 72%)",
    text:      "hsl(140 40% 18%)",
  },
  {
    id: "lavender",
    label: "Lavender",
    cell:      "hsl(270 50% 97%)",
    active:    "hsl(270 65% 88%)",
    highlight: "hsl(270 45% 92%)",
    correct:   "hsl(200 55% 88%)",
    border:    "hsl(270 25% 76%)",
    text:      "hsl(270 40% 22%)",
  },
  {
    id: "rose",
    label: "Rose",
    cell:      "hsl(340 55% 97%)",
    active:    "hsl(340 70% 88%)",
    highlight: "hsl(340 50% 92%)",
    correct:   "hsl(10 60% 88%)",
    border:    "hsl(340 30% 76%)",
    text:      "hsl(340 45% 22%)",
  },
  {
    id: "midnight",
    label: "Midnight",
    cell:      "hsl(220 25% 14%)",
    active:    "hsl(220 55% 30%)",
    highlight: "hsl(220 35% 22%)",
    correct:   "hsl(142 40% 20%)",
    border:    "hsl(220 15% 28%)",
    text:      "hsl(220 20% 88%)",
  },
  {
    id: "ink",
    label: "Ink",
    cell:      "hsl(0 0% 98%)",
    active:    "hsl(0 0% 86%)",
    highlight: "hsl(0 0% 92%)",
    correct:   "hsl(0 0% 84%)",
    border:    "hsl(0 0% 70%)",
    text:      "hsl(0 0% 10%)",
  },
];

/** Apply a palette to the document — call this from SharedCraftPuzzle */
export function applyPalette(palette: CraftColorPalette) {
  const root = document.documentElement;
  if (!palette.cell) {
    root.style.removeProperty("--puzzle-cell");
    root.style.removeProperty("--puzzle-cell-active");
    root.style.removeProperty("--puzzle-cell-highlight");
    root.style.removeProperty("--puzzle-cell-correct");
    root.style.removeProperty("--puzzle-border");
    return;
  }
  root.style.setProperty("--puzzle-cell",           palette.cell);
  root.style.setProperty("--puzzle-cell-active",    palette.active);
  root.style.setProperty("--puzzle-cell-highlight", palette.highlight);
  root.style.setProperty("--puzzle-cell-correct",   palette.correct);
  root.style.setProperty("--puzzle-border",         palette.border);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CraftColorPickerProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function CraftColorPicker({ selected, onSelect }: CraftColorPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Puzzle colour theme</p>
      <div className="flex flex-wrap gap-2">
        {CRAFT_PALETTES.map((palette) => {
          const isActive = selected === palette.id;
          const isDefault = palette.id === "default";

          return (
            <button
              key={palette.id}
              onClick={() => { hapticTap(); onSelect(palette.id); }}
              title={palette.label}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {!isDefault && (
                <span
                  className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                  style={{ background: palette.active }}
                />
              )}
              {palette.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CraftColorPicker;
