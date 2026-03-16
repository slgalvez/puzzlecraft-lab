import { useState, useCallback, useRef } from "react";
import type { CrosswordPuzzle, CrosswordClue } from "@/data/puzzles";
import { cn } from "@/lib/utils";
import PuzzleControls from "./PuzzleControls";
import { useToast } from "@/hooks/use-toast";

interface Props {
  puzzle: CrosswordPuzzle;
  showControls?: boolean;
  onNewPuzzle?: () => void;
}

const CrosswordGrid = ({ puzzle, showControls, onNewPuzzle }: Props) => {
  const { gridSize, blackCells, clues } = puzzle;
  const { toast } = useToast();
  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: gridSize }, () => Array(gridSize).fill(""))
  );
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: gridSize }, () => Array(gridSize).fill(null))
  );

  const isBlack = (r: number, c: number) =>
    blackCells.some(([br, bc]) => br === r && bc === c);

  const getCellNumber = (r: number, c: number) => {
    const clue = clues.find((cl) => cl.row === r && cl.col === c);
    return clue?.number;
  };

  const getHighlightedCells = useCallback((): Set<string> => {
    if (!activeCell) return new Set();
    const [ar, ac] = activeCell;
    const cells = new Set<string>();
    if (direction === "across") {
      for (let c = 0; c < gridSize; c++) {
        if (!isBlack(ar, c)) cells.add(`${ar}-${c}`);
        else if (c > ac) break;
        else if (c < ac) cells.clear();
      }
    } else {
      for (let r = 0; r < gridSize; r++) {
        if (!isBlack(r, ac)) cells.add(`${r}-${ac}`);
        else if (r > ar) break;
        else if (r < ar) cells.clear();
      }
    }
    return cells;
  }, [activeCell, direction, gridSize, blackCells]);

  const highlighted = getHighlightedCells();

  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c)) return;
    if (activeCell && activeCell[0] === r && activeCell[1] === c) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setActiveCell([r, c]);
    }
    inputRefs.current[r][c]?.focus();
  };

  const handleInput = (r: number, c: number, value: string) => {
    const letter = value.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = letter;
      return next;
    });
    setErrors(new Set());
    if (letter) moveToNext(r, c);
  };

  const moveToNext = (r: number, c: number) => {
    if (direction === "across") {
      for (let nc = c + 1; nc < gridSize; nc++) {
        if (!isBlack(r, nc)) { inputRefs.current[r][nc]?.focus(); return; }
      }
    } else {
      for (let nr = r + 1; nr < gridSize; nr++) {
        if (!isBlack(nr, c)) { inputRefs.current[nr][c]?.focus(); return; }
      }
    }
  };

  const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !grid[r][c]) {
      if (direction === "across") {
        for (let nc = c - 1; nc >= 0; nc--) {
          if (!isBlack(r, nc)) { inputRefs.current[r][nc]?.focus(); return; }
        }
      } else {
        for (let nr = r - 1; nr >= 0; nr--) {
          if (!isBlack(nr, c)) { inputRefs.current[nr][c]?.focus(); return; }
        }
      }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      setDirection((d) => (d === "across" ? "down" : "across"));
    }
  };

  const handleReset = () => {
    setGrid(Array.from({ length: gridSize }, () => Array(gridSize).fill("")));
    setErrors(new Set());
  };

  const handleCheck = () => {
    // Build solution grid from clues
    const solutionGrid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(""));
    for (const clue of clues) {
      const dr = clue.direction === "down" ? 1 : 0;
      const dc = clue.direction === "across" ? 1 : 0;
      for (let i = 0; i < clue.answer.length; i++) {
        solutionGrid[clue.row + dr * i][clue.col + dc * i] = clue.answer[i];
      }
    }

    const errs = new Set<string>();
    let filled = true;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (isBlack(r, c)) continue;
        if (!grid[r][c]) { filled = false; continue; }
        if (solutionGrid[r][c] && grid[r][c] !== solutionGrid[r][c]) errs.add(`${r}-${c}`);
      }
    }
    setErrors(errs);
    if (errs.size === 0 && filled)
      toast({ title: "🎉 Congratulations!", description: "Crossword solved correctly!" });
    else if (errs.size > 0)
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
    else
      toast({ title: "Keep going!", description: "No errors so far." });
  };

  const acrossClues = clues.filter((c) => c.direction === "across");
  const downClues = clues.filter((c) => c.direction === "down");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="flex-shrink-0">
        <div
          className="inline-grid border-2 border-puzzle-border"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const black = isBlack(r, c);
              const num = getCellNumber(r, c);
              const isActive = activeCell?.[0] === r && activeCell?.[1] === c;
              const isHighlighted = highlighted.has(`${r}-${c}`);
              const hasError = errors.has(`${r}-${c}`);

              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    "relative w-10 h-10 sm:w-12 sm:h-12 border border-puzzle-border",
                    black && "bg-puzzle-cell-black",
                    !black && hasError && "bg-puzzle-cell-error",
                    !black && !hasError && isActive && "bg-puzzle-cell-active",
                    !black && !hasError && !isActive && isHighlighted && "bg-puzzle-cell-highlight",
                    !black && !hasError && !isActive && !isHighlighted && "bg-puzzle-cell"
                  )}
                  onClick={() => handleCellClick(r, c)}
                >
                  {num && !black && (
                    <span className="absolute left-0.5 top-0 text-[9px] font-medium text-puzzle-number leading-tight">
                      {num}
                    </span>
                  )}
                  {!black && (
                    <input
                      ref={(el) => { inputRefs.current[r][c] = el; }}
                      className="absolute inset-0 w-full h-full bg-transparent text-center text-lg sm:text-xl font-semibold text-foreground outline-none caret-transparent uppercase"
                      value={grid[r][c]}
                      maxLength={1}
                      onChange={(e) => handleInput(r, c, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(r, c, e)}
                      onFocus={() => setActiveCell([r, c])}
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:max-w-xs">
        <div>
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Across
          </h3>
          <ul className="space-y-1 text-sm">
            {acrossClues.map((cl) => (
              <li key={`a-${cl.number}`} className="text-foreground">
                <span className="mr-1.5 font-semibold">{cl.number}.</span>
                {cl.clue}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Down
          </h3>
          <ul className="space-y-1 text-sm">
            {downClues.map((cl) => (
              <li key={`d-${cl.number}`} className="text-foreground">
                <span className="mr-1.5 font-semibold">{cl.number}.</span>
                {cl.clue}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CrosswordGrid;
