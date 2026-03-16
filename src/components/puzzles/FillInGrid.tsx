import { useState, useRef } from "react";
import type { FillInPuzzle } from "@/data/puzzles";
import { cn } from "@/lib/utils";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";

interface Props {
  puzzle: FillInPuzzle;
  showControls?: boolean;
  onNewPuzzle?: () => void;
}

const FillInGrid = ({ puzzle, showControls, onNewPuzzle }: Props) => {
  const { gridSize, blackCells, entries, type, solution } = puzzle;
  const isNumbers = type === "number-fill";
  const { toast } = useToast();

  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: gridSize }, () => Array(gridSize).fill(""))
  );
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [usedEntries, setUsedEntries] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: gridSize }, () => Array(gridSize).fill(null))
  );

  const timerKey = `fillin-${puzzle.id}`;
  const timer = usePuzzleTimer(timerKey, { category: puzzle.type as "word-fill" | "number-fill", difficulty: puzzle.difficulty });

  const isBlack = (r: number, c: number) =>
    blackCells.some(([br, bc]) => br === r && bc === c);

  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c)) return;
    setActiveCell([r, c]);
    inputRefs.current[r][c]?.focus();
  };

  const handleInput = (r: number, c: number, value: string) => {
    if (timer.isSolved) return;
    const char = isNumbers
      ? value.replace(/[^0-9]/g, "").slice(-1)
      : value.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);

    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = char;
      return next;
    });
    setErrors(new Set());

    if (char) {
      for (let nc = c + 1; nc < gridSize; nc++) {
        if (!isBlack(r, nc) && !grid[r][nc]) {
          inputRefs.current[r][nc]?.focus();
          return;
        }
      }
    }
  };

  const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !grid[r][c]) {
      for (let nc = c - 1; nc >= 0; nc--) {
        if (!isBlack(r, nc)) {
          inputRefs.current[r][nc]?.focus();
          return;
        }
      }
    }
  };

  const toggleEntry = (entry: string) => {
    setUsedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entry)) next.delete(entry);
      else next.add(entry);
      return next;
    });
  };

  const handleReset = () => {
    setGrid(Array.from({ length: gridSize }, () => Array(gridSize).fill("")));
    setUsedEntries(new Set());
    setErrors(new Set());
    timer.reset();
  };

  const handleCheck = () => {
    const errs = new Set<string>();
    let filled = true;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c) || solution[r][c] === null) continue;
        if (!grid[r][c]) { filled = false; continue; }
        if (grid[r][c] !== solution[r][c]) errs.add(`${r}-${c}`);
      }
    }
    setErrors(errs);
    if (errs.size === 0 && filled) {
      const { isNewBest } = timer.solve();
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Puzzle solved correctly!" });
    } else if (errs.size > 0)
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
    else
      toast({ title: "Keep going!", description: "No errors so far." });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="flex-shrink-0">
        <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />
        <div
          className="inline-grid border-2 border-puzzle-border"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const black = isBlack(r, c);
              const isActive = activeCell?.[0] === r && activeCell?.[1] === c;
              const hasError = errors.has(`${r}-${c}`);

              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    "relative w-10 h-10 sm:w-12 sm:h-12 border border-puzzle-border",
                    black && "bg-puzzle-cell-black",
                    !black && hasError && "bg-puzzle-cell-error",
                    !black && !hasError && isActive && "bg-puzzle-cell-active",
                    !black && !hasError && !isActive && "bg-puzzle-cell"
                  )}
                  onClick={() => handleCellClick(r, c)}
                >
                  {!black && (
                    <input
                      ref={(el) => { inputRefs.current[r][c] = el; }}
                      className="absolute inset-0 w-full h-full bg-transparent text-center text-lg sm:text-xl font-semibold text-foreground outline-none caret-transparent uppercase"
                      value={grid[r][c]}
                      maxLength={1}
                      onChange={(e) => handleInput(r, c, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(r, c, e)}
                      onFocus={() => setActiveCell([r, c])}
                      inputMode={isNumbers ? "numeric" : "text"}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
        {showControls && onNewPuzzle && (
          <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
        )}
      </div>

      <div className="lg:max-w-xs">
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {isNumbers ? "Numbers to Place" : "Words to Place"}
        </h3>
        <div className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <button
              key={entry}
              onClick={() => toggleEntry(entry)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                usedEntries.has(entry)
                  ? "border-primary/30 bg-primary/10 text-primary line-through"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              )}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FillInGrid;
