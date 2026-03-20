import { useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PuzzleAnimation } from "./HowToPlayAnimations";
import { hapticLight } from "@/lib/haptic";
import type { PuzzleCategory } from "@/lib/puzzleTypes";

const instructions: Record<PuzzleCategory, string[]> = {
  crossword: [
    "Read the clue and fill letters into the highlighted row or column",
    "Words intersect — shared letters help solve both directions",
    "Use Check to verify your answers",
  ],
  "word-fill": [
    "Place each word from the bank into matching empty slots",
    "Word length and intersecting letters guide placement",
    "All words must be used exactly once",
  ],
  "number-fill": [
    "Fit each number from the list into the grid",
    "Match digit count to slot length",
    "Intersecting digits narrow down possibilities",
  ],
  sudoku: [
    "Fill every row, column, and 3×3 box with digits 1–9",
    "No digit can repeat in any row, column, or box",
    "Start with cells that have the fewest possibilities",
  ],
  "word-search": [
    "Find hidden words by dragging across letters",
    "Words can run horizontally, vertically, or diagonally",
    "Found words stay highlighted in the grid",
  ],
  kakuro: [
    "Fill cells so each run adds up to its clue number",
    "Use only digits 1–9, no repeats within a run",
    "Cross-referencing sums helps narrow answers",
  ],
  nonogram: [
    "Fill cells to match the number clues on each row and column",
    "Clue numbers indicate consecutive filled groups",
    "Mark empty cells to track eliminated positions",
  ],
  cryptogram: [
    "Each letter is substituted with another — decode the mapping",
    "Solving one letter reveals it everywhere in the message",
    "Start with common short words and letter patterns",
  ],
};

interface Props {
  type: PuzzleCategory;
}

export default function HowToPlay({ type }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={(val) => {
      if (val) hapticLight();
      setOpen(val);
    }}>
      <PopoverTrigger
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          // Prevent the parent card's active/click from firing
          e.stopPropagation();
        }}
        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground/40 transition-all hover:text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 -m-2"
        aria-label={`How to play ${type}`}
      >
        <Info size={15} strokeWidth={2.2} />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={2}
        className="w-[240px] p-0 shadow-lg border border-border/80 rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Animation */}
        <div className="flex items-center justify-center bg-muted/40 px-4 py-3 border-b border-border/50">
          <div className="scale-[0.85] origin-center">
            <PuzzleAnimation type={type} />
          </div>
        </div>

        {/* Instructions */}
        <div className="px-4 py-3 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            How to play
          </p>
          <ul className="space-y-1.5">
            {instructions[type].map((tip, i) => (
              <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                  {i + 1}
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
