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
    cell:      "210 60% 97%",
    active:    "210 80% 85%",
    highlight: "210 60% 90%",
    correct:   "160 55% 88%",
    border:    "210 30% 75%",
    text:      "210 50% 20%",
  },
  {
    id: "sunset",
    label: "Sunset",
    cell:      "20 60% 97%",
    active:    "20 85% 88%",
    highlight: "20 60% 92%",
    correct:   "45 75% 88%",
    border:    "20 35% 78%",
    text:      "20 45% 22%",
  },
  {
    id: "forest",
    label: "Forest",
    cell:      "140 45% 96%",
    active:    "140 55% 84%",
    highlight: "140 40% 90%",
    correct:   "80 50% 86%",
    border:    "140 25% 72%",
    text:      "140 40% 18%",
  },
  {
    id: "lavender",
    label: "Lavender",
    cell:      "270 50% 97%",
    active:    "270 65% 88%",
    highlight: "270 45% 92%",
    correct:   "200 55% 88%",
    border:    "270 25% 76%",
    text:      "270 40% 22%",
  },
  {
    id: "rose",
    label: "Rose",
    cell:      "340 55% 97%",
    active:    "340 70% 88%",
    highlight: "340 50% 92%",
    correct:   "10 60% 88%",
    border:    "340 30% 76%",
    text:      "340 45% 22%",
  },
  {
    id: "midnight",
    label: "Midnight",
    cell:      "220 28% 12%",
    active:    "220 48% 24%",
    highlight: "220 36% 18%",
    correct:   "142 36% 22%",
    border:    "220 18% 34%",
    text:      "210 40% 96%",
  },
  {
    id: "ink",
    label: "Ink",
    cell:      "0 0% 98%",
    active:    "0 0% 86%",
    highlight: "0 0% 92%",
    correct:   "0 0% 84%",
    border:    "0 0% 70%",
    text:      "0 0% 10%",
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
    root.style.removeProperty("--puzzle-cell-text");
    return;
  }
  root.style.setProperty("--puzzle-cell",           palette.cell);
  root.style.setProperty("--puzzle-cell-active",    palette.active);
  root.style.setProperty("--puzzle-cell-highlight", palette.highlight);
  root.style.setProperty("--puzzle-cell-correct",   palette.correct);
  root.style.setProperty("--puzzle-border",         palette.border);
  if (palette.text) {
    root.style.setProperty("--puzzle-cell-text", palette.text);
  } else {
    root.style.removeProperty("--puzzle-cell-text");
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CraftColorPickerProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function CraftColorPicker({ selected, onSelect }: CraftColorPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Puzzle color theme</p>
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
                  style={{ background: `hsl(${palette.active})` }}
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
