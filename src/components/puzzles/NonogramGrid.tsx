import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { generateNonogram } from "@/lib/generators/nonogram";
import PuzzleControls from "./PuzzleControls";
import { useToast } from "@/hooks/use-toast";
import type { Difficulty } from "@/lib/puzzleTypes";

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
}

type CellState = "empty" | "filled" | "marked";

const NonogramGrid = ({ seed, difficulty, onNewPuzzle }: Props) => {
  const { toast } = useToast();
  const puzzle = useMemo(() => generateNonogram(seed, difficulty), [seed, difficulty]);
  const { rows, cols, solution, rowClues, colClues } = puzzle;

  const [grid, setGrid] = useState<CellState[][]>(() =>
    Array.from({ length: rows }, () => Array(cols).fill("empty"))
  );
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const maxRowClueLen = Math.max(...rowClues.map((c) => c.length));
  const maxColClueLen = Math.max(...colClues.map((c) => c.length));

  const toggleCell = (r: number, c: number) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      const current = next[r][c];
      next[r][c] = current === "empty" ? "filled" : current === "filled" ? "marked" : "empty";
      return next;
    });
    setErrors(new Set());
  };

  const handleReset = () => {
    setGrid(Array.from({ length: rows }, () => Array(cols).fill("empty")));
    setErrors(new Set());
  };

  const handleCheck = () => {
    const errs = new Set<string>();
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const shouldBeFilled = solution[r][c];
        const isFilled = grid[r][c] === "filled";
        if (shouldBeFilled !== isFilled) errs.add(`${r}-${c}`);
      }
    setErrors(errs);
    if (errs.size === 0)
      toast({ title: "🎉 Congratulations!", description: "Nonogram solved correctly!" });
    else
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
  };

  const cellSize = rows <= 10 ? "w-8 h-8 sm:w-9 sm:h-9" : "w-5 h-5 sm:w-6 sm:h-6";
  const clueTextSize = rows <= 10 ? "text-xs sm:text-sm" : "text-[9px] sm:text-[10px]";

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        Click to fill • Click again to mark ✕ • Click again to clear
      </p>
      <div className="inline-block">
        {/* Column clues */}
        <div className="flex">
          <div style={{ width: `${maxRowClueLen * 1.5}rem` }} />
          {colClues.map((clue, c) => (
            <div
              key={c}
              className={cn("flex flex-col items-center justify-end gap-0.5 pb-1", cellSize.split(" ")[0])}
            >
              {clue.map((n, i) => (
                <span key={i} className={cn(clueTextSize, "font-medium text-muted-foreground leading-tight")}>
                  {n}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center">
            <div
              className="flex items-center justify-end gap-1 pr-2"
              style={{ width: `${maxRowClueLen * 1.5}rem` }}
            >
              {rowClues[r].map((n, i) => (
                <span key={i} className={cn(clueTextSize, "font-medium text-muted-foreground")}>
                  {n}
                </span>
              ))}
            </div>
            {Array.from({ length: cols }, (_, c) => {
              const state = grid[r][c];
              const hasError = errors.has(`${r}-${c}`);

              return (
                <div
                  key={c}
                  className={cn(
                    cellSize,
                    "border border-puzzle-border cursor-pointer select-none flex items-center justify-center transition-colors",
                    c % 5 === 4 && c < cols - 1 && "border-r-2 border-r-foreground/30",
                    r % 5 === 4 && r < rows - 1 && "border-b-2 border-b-foreground/30",
                    hasError && "bg-puzzle-cell-error",
                    !hasError && state === "filled" && "bg-foreground",
                    !hasError && state === "marked" && "bg-puzzle-cell",
                    !hasError && state === "empty" && "bg-puzzle-cell hover:bg-secondary"
                  )}
                  onClick={() => toggleCell(r, c)}
                >
                  {state === "marked" && (
                    <span className={cn("text-muted-foreground font-bold", clueTextSize)}>✕</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
    </div>
  );
};

export default NonogramGrid;
