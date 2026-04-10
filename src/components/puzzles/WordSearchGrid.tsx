import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { generateWordSearch } from "@/lib/generators/wordSearch";
import { WORDS } from "@/lib/wordList";
import PuzzleControls from "./PuzzleControls";
import { PuzzleHeader } from "./PuzzleHeader";
import { PuzzleToolbar } from "./PuzzleToolbar";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { usePuzzleSession } from "@/hooks/usePuzzleSession";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/haptic";
import { loadProgress, clearProgress } from "@/lib/puzzleProgress";
import { useAutoSave } from "@/hooks/useAutoSave";
import type { Difficulty } from "@/lib/puzzleTypes";
import type { PuzzlePerformance } from "@/lib/endlessDifficulty";

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
  onSolve?: (perf: PuzzlePerformance) => void;
  timeLimit?: number;
  isEndless?: boolean;
  dailyCode?: string;
  showHints?: boolean;
  showReveal?: boolean;
  maxHints?: number | null;
  /** Custom word list — overrides the default WORDS for themed packs */
  words?: string[];
}

interface WordSearchState {
  foundWords: string[];
  foundCells: string[];
}

const WordSearchGrid = ({ seed, difficulty, onNewPuzzle, onSolve, timeLimit, isEndless, dailyCode, showHints = true, showReveal = true, maxHints, words }: Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const puzzle = useMemo(() => generateWordSearch(seed, difficulty, words ?? WORDS), [seed, difficulty, words]);
  const timerKey = `word-search-${seed}-${difficulty}`;
  const session = usePuzzleSession({ puzzleType: "word-search", difficulty, progressUnit: "words" });

  const saved = useMemo(() => loadProgress<WordSearchState>(timerKey), [timerKey]);

  const [foundWords, setFoundWords] = useState<Set<string>>(() =>
    saved?.state.foundWords ? new Set(saved.state.foundWords) : new Set()
  );
  const [foundCells, setFoundCells] = useState<Set<string>>(() =>
    saved?.state.foundCells ? new Set(saved.state.foundCells) : new Set()
  );
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const [tapStart, setTapStart] = useState<[number, number] | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hintCells, setHintCells] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resetCount = useRef(0);
  const checkCount = useRef(0);
  const errorCheckCount = useRef(0);
  const hintCount = useRef(0);

  const timer = usePuzzleTimer(timerKey, { category: "word-search", difficulty, initialElapsed: saved?.elapsed ?? 0, timeLimit });

  const foundWordsRef = useRef(foundWords);
  foundWordsRef.current = foundWords;
  const foundCellsRef = useRef(foundCells);
  foundCellsRef.current = foundCells;
  const { status: saveStatus, debouncedSave } = useAutoSave<WordSearchState>({
    puzzleKey: timerKey,
    getState: () => ({
      foundWords: Array.from(foundWordsRef.current),
      foundCells: Array.from(foundCellsRef.current),
    }),
    getElapsed: () => timer.elapsed,
    disabled: timer.isSolved || isRevealed,
  });

  useEffect(() => { debouncedSave(); }, [foundWords, foundCells, debouncedSave]);

  // Track progress: found words vs total
  useEffect(() => {
    session.setProgress(foundWords.size, puzzle.words.length);
  }, [foundWords, puzzle.words.length, session.setProgress]);

  useEffect(() => {
    setCursor([0, 0]);
    setStartCell(null);
    setTapStart(null);
    setHintCells(new Set());
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
    const start = startCell || tapStart;
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

  const tapStartKey = tapStart ? `${tapStart[0]}-${tapStart[1]}` : null;
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
        const { isNewBest } = timer.solve({ assisted: hintCount.current > 0, hintsUsed: hintCount.current, mistakesCount: errorCheckCount.current });
        clearProgress(timerKey);
        toast({
          title: "🎉 Congratulations!",
          description: isNewBest ? "New best time! 🏆" : "All words found!",
        });
        onSolve?.({ elapsed: timer.elapsed, completed: true, resets: resetCount.current, checks: checkCount.current, errorChecks: errorCheckCount.current });
      }
      return true;
    }
    return false;
  }, [puzzle, foundWords, timer, toast, timerKey]);

  const touchMoved = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (timer.isSolved || isRevealed) return;
    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    if (cell) {
      e.preventDefault();
      haptic();
      touchMoved.current = false;
      setStartCell(cell);
      setHoverCell(cell);
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !startCell) return;
    e.preventDefault();
    touchMoved.current = true;
    const touch = e.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    if (cell) setHoverCell(cell);
  };

  const handleTouchEnd = () => {
    if (!isDragging || !startCell) return;
    if (!touchMoved.current) {
      const tappedCell = startCell;
      setStartCell(null);
      setHoverCell(null);
      setIsDragging(false);
      if (!tapStart) {
        setTapStart(tappedCell);
      } else {
        const result = trySelectWord(tapStart[0], tapStart[1], tappedCell[0], tappedCell[1]);
        setTapStart(null);
        if (!result) {
          setTapStart(tappedCell);
        }
      }
      return;
    }
    if (startCell && hoverCell) {
      trySelectWord(startCell[0], startCell[1], hoverCell[0], hoverCell[1]);
    }
    setStartCell(null);
    setHoverCell(null);
    setIsDragging(false);
    setTapStart(null);
  };

  const handleTouchCancel = () => {
    setStartCell(null);
    setHoverCell(null);
    setIsDragging(false);
  };

  const handleMouseDown = (r: number, c: number) => {
    if (timer.isSolved || isMobile || isRevealed) return;
    setStartCell([r, c]);
    setHoverCell([r, c]);
    setCursor([r, c]);
    setIsMouseDragging(true);
  };

  const handleMouseEnterCell = (r: number, c: number) => {
    if (!isMobile) setHoverCell([r, c]);
  };

  const handleMouseUp = () => {
    if (isMouseDragging && startCell && hoverCell) {
      trySelectWord(startCell[0], startCell[1], hoverCell[0], hoverCell[1]);
    }
    setStartCell(null);
    setHoverCell(null);
    setIsMouseDragging(false);
  };

  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (isMouseDragging) {
        if (startCell && hoverCell) {
          trySelectWord(startCell[0], startCell[1], hoverCell[0], hoverCell[1]);
        }
        setStartCell(null);
        setHoverCell(null);
        setIsMouseDragging(false);
      }
    };
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  }, [isMouseDragging, startCell, hoverCell, trySelectWord]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (timer.isSolved || isRevealed) return;
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
      case "Escape": e.preventDefault(); setStartCell(null); setTapStart(null); break;
    }
  }, [cursor, startCell, timer.isSolved, isRevealed, puzzle, trySelectWord]);

  const handleReset = () => {
    setFoundWords(new Set()); setFoundCells(new Set()); setStartCell(null); setTapStart(null); setCursor([0, 0]);
    setIsRevealed(false); setHintCells(new Set()); hintCount.current = 0;
    resetCount.current++; timer.reset(); clearProgress(timerKey); containerRef.current?.focus();
  };

  const handleCheck = () => {
    if (foundWords.size === puzzle.words.length) {
      toast({ title: "🎉 Congratulations!", description: "All words found!" });
    } else {
      toast({ title: "Keep searching!", description: `${foundWords.size}/${puzzle.words.length} words found.` });
    }
  };

  const handleHint = () => {
    if (timer.isSolved || isRevealed) return;
    const unfound = puzzle.wordPositions.filter((p) => !foundWords.has(p.word));
    if (unfound.length === 0) return;
    const pos = unfound[0];
    setHintCells((prev) => {
      const next = new Set(prev);
      next.add(`${pos.row}-${pos.col}`);
      return next;
    });
    hintCount.current++;
    toast({ title: "💡 Hint", description: `Look near the highlighted cell for "${pos.word}". (${hintCount.current} hint${hintCount.current > 1 ? "s" : ""} used)` });
  };

  const handleReveal = () => {
    const allWords = new Set(puzzle.words);
    setFoundWords(allWords);
    const allCells = new Set<string>();
    for (const pos of puzzle.wordPositions) {
      let r = pos.row, c = pos.col;
      for (let i = 0; i < pos.word.length; i++) {
        allCells.add(`${r}-${c}`);
        r += pos.dr;
        c += pos.dc;
      }
    }
    setFoundCells(allCells);
    setIsRevealed(true);
    timer.pause();
    clearProgress(timerKey);
  };

  const cellSizeStyle = useMemo(() => {
    if (!isMobile) {
      return puzzle.size > 12
        ? { width: 32, height: 32, fontSize: 14 }
        : { width: 36, height: 36, fontSize: 16 };
    }
    const pagePadding = 32;
    const gridBorder = 4;
    const cellBorders = puzzle.size + 1;
    const availableWidth = window.innerWidth - pagePadding - gridBorder - cellBorders;
    const cellSize = Math.floor(availableWidth / puzzle.size);
    const fontSize = cellSize < 18 ? 8 : cellSize < 24 ? 10 : 13;
    return { width: cellSize, height: cellSize, fontSize };
  }, [puzzle.size, isMobile]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10 scroll-mt-4">
      <div className="flex-shrink-0 outline-none min-w-0 touch-manipulation" ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown}>
        <PuzzleHeader
          puzzleType="word-search"
          difficulty={difficulty}
          elapsed={timer.elapsed}
          mistakes={session.mistakes}
          personalBest={session.personalBest}
          progressCurrent={session.progressCurrent}
          progressTotal={session.progressTotal}
          progressUnit={session.progressUnit}
        />

        {isMobile ? (
          <p className="mb-2 text-xs text-muted-foreground">
            Tap two letters to select a word, or drag across letters
          </p>
        ) : (
          <p className="mb-2 text-xs text-muted-foreground">
            Arrow keys to move • Space/Enter to select start & end • Escape to cancel
          </p>
        )}

        <div style={{ touchAction: isMobile ? "none" : "auto" }} className="[overscroll-behavior:contain]">
        <div
          ref={gridRef}
          className="inline-grid border-2 border-puzzle-border select-none outline-none"
          style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`, touchAction: "none" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onMouseUp={handleMouseUp}
        >
          {puzzle.grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r}-${c}`;
              const isFound = foundCells.has(key);
              const isStart = startCell?.[0] === r && startCell?.[1] === c;
              const isPreview = previewCells.has(key);
              const isCursor = cursor[0] === r && cursor[1] === c;
              const isTapStart = tapStartKey === key;
              const isHintCell = hintCells.has(key);

              return (
                <div
                  key={key}
                  className={cn(
                    "border border-puzzle-border flex items-center justify-center cursor-pointer font-semibold transition-colors touch-manipulation active:animate-cell-pop",
                    isFound && "bg-puzzle-cell-highlight text-primary",
                    (isStart || isTapStart) && "bg-puzzle-cell-active ring-2 ring-inset ring-primary",
                    isPreview && !isFound && !isStart && !isTapStart && "bg-secondary",
                    isHintCell && !isFound && !isStart && !isTapStart && !isPreview && "bg-accent ring-2 ring-inset ring-accent-foreground/50 animate-pulse",
                    isCursor && !isFound && !isStart && !isTapStart && !isPreview && !isHintCell && !isMobile && "ring-2 ring-inset ring-primary bg-puzzle-cell-active",
                    !isFound && !isStart && !isTapStart && !isPreview && !isHintCell && !(isCursor && !isMobile) && "bg-puzzle-cell hover:bg-secondary"
                  )}
                  style={{ width: cellSizeStyle.width, height: cellSizeStyle.height, fontSize: cellSizeStyle.fontSize }}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnterCell(r, c)}
                >
                  {letter}
                </div>
              );
            })
          )}
        </div>
        </div>
        {tapStart && (
          <p className="mt-1 text-xs text-primary animate-pulse">
            Tap the end letter to complete selection
          </p>
        )}
        {/* Word bank — mobile: inline before controls */}
        {isMobile && (
          <div className="mt-4">
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
        )}

        <PuzzleToolbar
          onHint={showHints ? handleHint : undefined}
          hintsRemaining={showHints && maxHints != null ? Math.max(0, maxHints - hintCount.current) : undefined}
          onCheck={handleCheck}
          onReveal={showReveal ? handleReveal : undefined}
        />
        <PuzzleControls
          onReset={handleReset}
          onNewPuzzle={onNewPuzzle}
          isRevealed={isRevealed}
          puzzleCode={dailyCode ?? `word-search-${seed}`}
          solveData={{ isSolved: timer.isSolved, time: timer.elapsed, difficulty, isEndless, assisted: hintCount.current > 0, category: "word-search", seed, dailyCode }}
          saveStatus={saveStatus}
        />
      </div>

      {/* Word bank — desktop only: side column */}
      {!isMobile && (
        <div className="lg:max-w-xs min-w-0 lg:pt-[88px] lg:self-start">
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
      )}
    </div>
  );
};

export default WordSearchGrid;
