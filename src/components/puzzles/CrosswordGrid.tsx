import { useState, useCallback, useRef, useEffect } from "react";
import type { CrosswordPuzzle, CrosswordClue } from "@/data/puzzles";
import { cn } from "@/lib/utils";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const timerKey = `crossword-${puzzle.id}`;
  const timer = usePuzzleTimer(timerKey, { category: "crossword", difficulty: puzzle.difficulty });

  const blackSet = useCallback(() => {
    const set = new Set<string>();
    blackCells.forEach(([r, c]) => set.add(`${r}-${c}`));
    return set;
  }, [blackCells]);

  const blacks = blackSet();
  const isBlack = (r: number, c: number) => blacks.has(`${r}-${c}`);

  const getCellNumber = (r: number, c: number) => {
    const clue = clues.find((cl) => cl.row === r && cl.col === c);
    return clue?.number;
  };

  // Auto-focus first non-black cell
  useEffect(() => {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (!isBlack(r, c)) {
          setActiveCell([r, c]);
          containerRef.current?.focus();
          return;
        }
  }, [puzzle.id]);

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
  }, [activeCell, direction, gridSize, blacks]);

  const highlighted = getHighlightedCells();

  const moveToNext = (r: number, c: number) => {
    if (direction === "across") {
      for (let nc = c + 1; nc < gridSize; nc++)
        if (!isBlack(r, nc)) { setActiveCell([r, nc]); return; }
    } else {
      for (let nr = r + 1; nr < gridSize; nr++)
        if (!isBlack(nr, c)) { setActiveCell([nr, c]); return; }
    }
  };

  const moveToPrev = (r: number, c: number) => {
    if (direction === "across") {
      for (let nc = c - 1; nc >= 0; nc--)
        if (!isBlack(r, nc)) { setActiveCell([r, nc]); return; }
    } else {
      for (let nr = r - 1; nr >= 0; nr--)
        if (!isBlack(nr, c)) { setActiveCell([nr, c]); return; }
    }
  };

  // Find next/prev word start
  const findNextWord = (reverse: boolean) => {
    const wordStarts: [number, number, "across" | "down"][] = [];
    for (const cl of clues) wordStarts.push([cl.row, cl.col, cl.direction]);
    // Sort by position
    wordStarts.sort((a, b) => a[0] * gridSize + a[1] - (b[0] * gridSize + b[1]));

    if (!activeCell) {
      if (wordStarts.length > 0) {
        const w = reverse ? wordStarts[wordStarts.length - 1] : wordStarts[0];
        setActiveCell([w[0], w[1]]);
        setDirection(w[2]);
      }
      return;
    }

    const [ar, ac] = activeCell;
    const currentIdx = ar * gridSize + ac;

    if (reverse) {
      for (let i = wordStarts.length - 1; i >= 0; i--) {
        const idx = wordStarts[i][0] * gridSize + wordStarts[i][1];
        if (idx < currentIdx || (idx === currentIdx && wordStarts[i][2] !== direction)) {
          setActiveCell([wordStarts[i][0], wordStarts[i][1]]);
          setDirection(wordStarts[i][2]);
          return;
        }
      }
      // Wrap
      const w = wordStarts[wordStarts.length - 1];
      setActiveCell([w[0], w[1]]);
      setDirection(w[2]);
    } else {
      for (const ws of wordStarts) {
        const idx = ws[0] * gridSize + ws[1];
        if (idx > currentIdx || (idx === currentIdx && ws[2] !== direction)) {
          setActiveCell([ws[0], ws[1]]);
          setDirection(ws[2]);
          return;
        }
      }
      // Wrap
      const w = wordStarts[0];
      setActiveCell([w[0], w[1]]);
      setDirection(w[2]);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (direction === "across") {
          setDirection("down");
        } else {
          for (let nr = r - 1; nr >= 0; nr--)
            if (!isBlack(nr, c)) { setActiveCell([nr, c]); return; }
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (direction === "across") {
          setDirection("down");
        } else {
          for (let nr = r + 1; nr < gridSize; nr++)
            if (!isBlack(nr, c)) { setActiveCell([nr, c]); return; }
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (direction === "down") {
          setDirection("across");
        } else {
          for (let nc = c - 1; nc >= 0; nc--)
            if (!isBlack(r, nc)) { setActiveCell([r, nc]); return; }
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (direction === "down") {
          setDirection("across");
        } else {
          for (let nc = c + 1; nc < gridSize; nc++)
            if (!isBlack(r, nc)) { setActiveCell([r, nc]); return; }
        }
        break;
      case "Tab":
        e.preventDefault();
        findNextWord(e.shiftKey);
        break;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        if (grid[r][c]) {
          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = "";
            return next;
          });
          setErrors(new Set());
        } else {
          moveToPrev(r, c);
        }
        break;
      default: {
        const letter = e.key.toUpperCase();
        if (/^[A-Z]$/.test(letter)) {
          e.preventDefault();
          setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = letter;
            return next;
          });
          setErrors(new Set());
          moveToNext(r, c);
        }
      }
    }
  }, [activeCell, direction, timer.isSolved, grid, gridSize, blacks, clues]);

  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c)) return;
    if (activeCell && activeCell[0] === r && activeCell[1] === c) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setActiveCell([r, c]);
    }
    containerRef.current?.focus();
  };

  const handleReset = () => {
    setGrid(Array.from({ length: gridSize }, () => Array(gridSize).fill("")));
    setErrors(new Set());
    timer.reset();
    containerRef.current?.focus();
  };

  const handleCheck = () => {
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
    if (errs.size === 0 && filled) {
      const { isNewBest } = timer.solve();
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Crossword solved correctly!" });
    } else if (errs.size > 0)
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
    else
      toast({ title: "Keep going!", description: "No errors so far." });
  };

  const acrossClues = clues.filter((c) => c.direction === "across");
  const downClues = clues.filter((c) => c.direction === "down");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="flex-shrink-0">
        <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />
        <p className="mb-2 text-xs text-muted-foreground">
          Arrow keys to move • Tab for next word • Click cell to toggle direction
        </p>
        <div
          ref={containerRef}
          tabIndex={0}
          className="inline-grid border-2 border-puzzle-border outline-none"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          onKeyDown={handleKeyDown}
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
                    "relative w-10 h-10 sm:w-12 sm:h-12 border border-puzzle-border flex items-center justify-center cursor-pointer select-none",
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
                    <span className="text-lg sm:text-xl font-semibold text-foreground uppercase">
                      {grid[r][c]}
                    </span>
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
