import { useState, useCallback, useRef, useEffect } from "react";
import type { CrosswordPuzzle, CrosswordClue } from "@/data/puzzles";
import { cn } from "@/lib/utils";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import MobileLetterInput from "./MobileLetterInput";
import type { MobileLetterInputHandle } from "./MobileLetterInput";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/haptic";
import type { PuzzlePerformance } from "@/lib/endlessDifficulty";

interface Props {
  puzzle: CrosswordPuzzle;
  showControls?: boolean;
  onNewPuzzle?: () => void;
  onSolve?: (perf: PuzzlePerformance) => void;
}

const CrosswordGrid = ({ puzzle, showControls, onNewPuzzle, onSolve }: Props) => {
  const { gridSize, blackCells, clues } = puzzle;
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: gridSize }, () => Array(gridSize).fill(""))
  );
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<MobileLetterInputHandle>(null);

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

  useEffect(() => {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        if (!isBlack(r, c)) {
          setActiveCell([r, c]);
          if (!isMobile) containerRef.current?.focus();
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

  const moveToNext = useCallback((r: number, c: number) => {
    if (direction === "across") {
      const nc = c + 1;
      if (nc < gridSize && !isBlack(r, nc)) { setActiveCell([r, nc]); }
    } else {
      const nr = r + 1;
      if (nr < gridSize && !isBlack(nr, c)) { setActiveCell([nr, c]); }
    }
  }, [direction, gridSize, blacks]);

  const moveToPrev = useCallback((r: number, c: number) => {
    if (direction === "across") {
      const nc = c - 1;
      if (nc >= 0 && !isBlack(r, nc)) { setActiveCell([r, nc]); }
    } else {
      const nr = r - 1;
      if (nr >= 0 && !isBlack(nr, c)) { setActiveCell([nr, c]); }
    }
  }, [direction, gridSize, blacks]);

  const findNextWord = (reverse: boolean) => {
    const wordStarts: [number, number, "across" | "down"][] = [];
    for (const cl of clues) wordStarts.push([cl.row, cl.col, cl.direction]);
    wordStarts.sort((a, b) => a[0] * gridSize + a[1] - (b[0] * gridSize + b[1]));
    if (!activeCell) {
      if (wordStarts.length > 0) {
        const w = reverse ? wordStarts[wordStarts.length - 1] : wordStarts[0];
        setActiveCell([w[0], w[1]]); setDirection(w[2]);
      }
      return;
    }
    const [ar, ac] = activeCell;
    const currentIdx = ar * gridSize + ac;
    if (reverse) {
      for (let i = wordStarts.length - 1; i >= 0; i--) {
        const idx = wordStarts[i][0] * gridSize + wordStarts[i][1];
        if (idx < currentIdx || (idx === currentIdx && wordStarts[i][2] !== direction)) {
          setActiveCell([wordStarts[i][0], wordStarts[i][1]]); setDirection(wordStarts[i][2]); return;
        }
      }
      const w = wordStarts[wordStarts.length - 1];
      setActiveCell([w[0], w[1]]); setDirection(w[2]);
    } else {
      for (const ws of wordStarts) {
        const idx = ws[0] * gridSize + ws[1];
        if (idx > currentIdx || (idx === currentIdx && ws[2] !== direction)) {
          setActiveCell([ws[0], ws[1]]); setDirection(ws[2]); return;
        }
      }
      const w = wordStarts[0];
      setActiveCell([w[0], w[1]]); setDirection(w[2]);
    }
  };

  const enterLetter = useCallback((letter: string) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = letter.toUpperCase();
      return next;
    });
    setErrors(new Set());
    moveToNext(r, c);
  }, [activeCell, timer.isSolved, moveToNext]);

  const deleteLetter = useCallback(() => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
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
  }, [activeCell, timer.isSolved, grid, moveToPrev]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (direction === "across") { setDirection("down"); } else {
          const nr = r - 1;
          if (nr >= 0 && !isBlack(nr, c)) setActiveCell([nr, c]);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (direction === "across") { setDirection("down"); } else {
          const nr = r + 1;
          if (nr < gridSize && !isBlack(nr, c)) setActiveCell([nr, c]);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (direction === "down") { setDirection("across"); } else {
          const nc = c - 1;
          if (nc >= 0 && !isBlack(r, nc)) setActiveCell([r, nc]);
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (direction === "down") { setDirection("across"); } else {
          const nc = c + 1;
          if (nc < gridSize && !isBlack(r, nc)) setActiveCell([r, nc]);
        }
        break;
      case "Tab": e.preventDefault(); findNextWord(e.shiftKey); break;
      case "Backspace": case "Delete": e.preventDefault(); deleteLetter(); break;
      default: {
        const letter = e.key.toUpperCase();
        if (/^[A-Z]$/.test(letter)) { e.preventDefault(); enterLetter(letter); }
      }
    }
  }, [activeCell, direction, timer.isSolved, grid, gridSize, blacks, clues, enterLetter, deleteLetter]);

  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c)) return;
    if (isMobile) haptic();
    if (activeCell && activeCell[0] === r && activeCell[1] === c) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setActiveCell([r, c]);
    }
    if (isMobile) {
      mobileInputRef.current?.focus();
    } else {
      containerRef.current?.focus();
    }
  };

  const handleReset = () => {
    setGrid(Array.from({ length: gridSize }, () => Array(gridSize).fill("")));
    setErrors(new Set());
    timer.reset();
    if (!isMobile) containerRef.current?.focus();
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

        {/* Direction toggle for mobile */}
        {isMobile && activeCell && !timer.isSolved && (
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors touch-manipulation",
                direction === "across" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
              onClick={() => setDirection("across")}
            >
              Across →
            </button>
            <button
              type="button"
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors touch-manipulation",
                direction === "down" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
              onClick={() => setDirection("down")}
            >
              Down ↓
            </button>
          </div>
        )}

        {!isMobile && (
          <p className="mb-2 text-xs text-muted-foreground">
            Arrow keys to move • Tab for next word • Click cell to toggle direction
          </p>
        )}

        <MobileLetterInput
          ref={mobileInputRef}
          active={isMobile && !!activeCell && !timer.isSolved}
          onLetter={enterLetter}
          onDelete={deleteLetter}
        />

        <div className="max-w-full overflow-x-auto">
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
                    "relative w-8 h-8 sm:w-12 sm:h-12 border border-puzzle-border flex items-center justify-center cursor-pointer select-none touch-manipulation active:animate-cell-pop",
                    black && "bg-puzzle-cell-black",
                    !black && hasError && "bg-puzzle-cell-error",
                    !black && !hasError && isActive && "bg-puzzle-cell-active",
                    !black && !hasError && !isActive && isHighlighted && "bg-puzzle-cell-highlight",
                    !black && !hasError && !isActive && !isHighlighted && "bg-puzzle-cell"
                  )}
                  onClick={() => handleCellClick(r, c)}
                >
                  {num && !black && (
                    <span className="absolute left-0.5 top-0 text-[9px] font-medium text-puzzle-number leading-tight">{num}</span>
                  )}
                  {!black && (
                    <span className="text-sm sm:text-xl font-semibold text-foreground uppercase">{grid[r][c]}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
        </div>
        {showControls && onNewPuzzle && (
          <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:max-w-xs">
        <div>
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Across</h3>
          <ul className="space-y-1 text-sm">
            {acrossClues.map((cl) => (
              <li key={`a-${cl.number}`} className="text-foreground"><span className="mr-1.5 font-semibold">{cl.number}.</span>{cl.clue}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Down</h3>
          <ul className="space-y-1 text-sm">
            {downClues.map((cl) => (
              <li key={`d-${cl.number}`} className="text-foreground"><span className="mr-1.5 font-semibold">{cl.number}.</span>{cl.clue}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CrosswordGrid;
