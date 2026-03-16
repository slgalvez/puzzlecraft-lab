import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { generateWordSearch } from "@/lib/generators/wordSearch";
import { WORDS } from "@/lib/wordList";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Difficulty } from "@/lib/puzzleTypes";

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
}

const WordSearchGrid = ({ seed, difficulty, onNewPuzzle }: Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const puzzle = useMemo(() => generateWordSearch(seed, difficulty, WORDS), [seed, difficulty]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const timerKey = `word-search-${seed}-${difficulty}`;
  const timer = usePuzzleTimer(timerKey, { category: "word-search", difficulty });

  useEffect(() => {
    setCursor([0, 0]);
    setStartCell(null);
    containerRef.current?.focus();
  }, [seed, difficulty]);

  const getCellFromPoint = (x: number, y: number): [number, number] | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const cellW = rect.width / puzzle.size;
    const cellH = rect.height / puzzle.size;
    const col = Math.floor((x - rect.left) / cellW);
    const row = Math.floor((y - rect.top) / cellH);
    if (row < 0 || row >= puzzle.size || col < 0 || col >= puzzle.size) return null;
    return [row, col];
  };

  const getPreviewCells = (): Set<string> => {
    const start = startCell;
    const end = hoverCell || (startCell ? cursor : null);
    if (!start || !end) return new Set();
    const [sr, sc] = start;
    const [er, ec] = end;
    const dr = Math.sign(er - sr);
    const dc = Math.sign(ec - sc);
    if (sr !== er && sc !== ec && Math.abs(er - sr) !== Math.abs(ec - sc)) return new Set();
    const cells = new Set<string>();
    let r = sr, c = sc;
    const steps = Math.max(Math.abs(er - sr), Math.abs(ec - sc));
    for (let i = 0; i <= steps; i++) { cells.add(`${r}-${c}`); r += dr; c += dc; }
    return cells;
  };

  const previewCells = getPreviewCells();

  const trySelectWord = useCallback((sr: number, sc: number, er: number, ec: number) => {
    const dr = Math.sign(er - sr);
    const dc = Math.sign(ec - sc);
    if (sr === er && sc === ec) return false;
    if (sr !== er && sc !== ec && Math.abs(er - sr) !== Math.abs(ec - sc)) return false;
    const letters: string[] = [];
    const cells: string[] = [];
    let cr = sr, cc = sc;
    const steps = Math.max(Math.abs(er - sr), Math.abs(ec - sc));
    for (let i = 0; i <= steps; i++) {
      letters.push(puzzle.grid[cr][cc]);
      cells.push(`${cr}-${cc}`);
      cr += dr; cc += dc;
    }
    const word = letters.join("");
    const reversedWord = letters.slice().reverse().join("");
    const matchedWord = puzzle.words.find((w) => (w === word || w === reversedWord) && !foundWords.has(w));
    if (matchedWord) {
      const newFound = new Set([...foundWords, matchedWord]);
      setFoundWords(newFound);
      setFoundCells((prev) => { const next = new Set(prev); cells.forEach((c) => next.add(c)); return next; });
      if (newFound.size === puzzle.words.length) {
        const { isNewBest } = timer.solve();
        toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "All words found!" });
      }
      return true;
    }
    return false;
  }, [puzzle, foundWords, timer, toast]);

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (timer.isSolved) return;
    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    if (cell) {
      setStartCell(cell);
      setHoverCell(cell);
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !startCell) return;
    e.preventDefault();
    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    if (cell) setHoverCell(cell);
  };

  const handleTouchEnd = () => {
    if (isDragging && startCell && hoverCell) {
      trySelectWord(startCell[0], startCell[1], hoverCell[0], hoverCell[1]);
    }
    setStartCell(null);
    setHoverCell(null);
    setIsDragging(false);
  };

  const handleCellClick = (r: number, c: number) => {
    if (timer.isSolved || isMobile) return; // On mobile, use touch drag instead
    setCursor([r, c]);
    if (!startCell) {
      setStartCell([r, c]);
    } else {
      trySelectWord(startCell[0], startCell[1], r, c);
      setStartCell(null);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (timer.isSolved) return;
    const [r, c] = cursor;
    const size = puzzle.size;

    switch (e.key) {
      case "ArrowUp": e.preventDefault(); setCursor([Math.max(0, r - 1), c]); break;
      case "ArrowDown": e.preventDefault(); setCursor([Math.min(size - 1, r + 1), c]); break;
      case "ArrowLeft": e.preventDefault(); setCursor([r, Math.max(0, c - 1)]); break;
      case "ArrowRight": e.preventDefault(); setCursor([r, Math.min(size - 1, c + 1)]); break;
      case " ": case "Enter":
        e.preventDefault();
        if (!startCell) { setStartCell([r, c]); }
        else { trySelectWord(startCell[0], startCell[1], r, c); setStartCell(null); }
        break;
      case "Escape": e.preventDefault(); setStartCell(null); break;
    }
  }, [cursor, startCell, timer.isSolved, puzzle, trySelectWord]);

  const handleReset = () => {
    setFoundWords(new Set()); setFoundCells(new Set()); setStartCell(null); setCursor([0, 0]);
    timer.reset(); containerRef.current?.focus();
  };

  const handleCheck = () => {
    if (foundWords.size === puzzle.words.length) {
      toast({ title: "🎉 Congratulations!", description: "All words found!" });
    } else {
      toast({ title: "Keep searching!", description: `${foundWords.size}/${puzzle.words.length} words found.` });
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="flex-shrink-0 outline-none" ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown}>
        <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />

        {isMobile ? (
          <p className="mb-2 text-xs text-muted-foreground">
            Drag across letters to select words
          </p>
        ) : (
          <p className="mb-2 text-xs text-muted-foreground">
            Arrow keys to move • Space/Enter to select start & end • Escape to cancel
          </p>
        )}

        <div
          ref={gridRef}
          className="inline-grid border-2 border-puzzle-border select-none outline-none"
          style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`, touchAction: "none" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {puzzle.grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r}-${c}`;
              const isFound = foundCells.has(key);
              const isStart = startCell?.[0] === r && startCell?.[1] === c;
              const isPreview = previewCells.has(key);
              const isCursor = cursor[0] === r && cursor[1] === c;

              return (
                <div
                  key={key}
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 border border-puzzle-border flex items-center justify-center cursor-pointer text-sm sm:text-base font-semibold transition-colors touch-manipulation",
                    isFound && "bg-puzzle-cell-highlight text-primary",
                    isStart && "bg-puzzle-cell-active",
                    isPreview && !isFound && !isStart && "bg-secondary",
                    isCursor && !isFound && !isStart && !isPreview && !isMobile && "ring-2 ring-inset ring-primary bg-puzzle-cell-active",
                    !isFound && !isStart && !isPreview && !(isCursor && !isMobile) && "bg-puzzle-cell hover:bg-secondary"
                  )}
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => !isMobile && setHoverCell([r, c])}
                >
                  {letter}
                </div>
              );
            })
          )}
        </div>
        <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
      </div>

      <div className="lg:max-w-xs">
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Words to Find ({foundWords.size}/{puzzle.words.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {puzzle.words.map((word) => (
            <span
              key={word}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                foundWords.has(word)
                  ? "border-primary/30 bg-primary/10 text-primary line-through"
                  : "border-border bg-card text-foreground"
              )}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WordSearchGrid;
