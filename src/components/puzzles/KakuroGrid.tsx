import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { generateKakuro } from "@/lib/generators/kakuro";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import MobileNumberPad from "./MobileNumberPad";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Difficulty } from "@/lib/puzzleTypes";

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
}

const KakuroGrid = ({ seed, difficulty, onNewPuzzle }: Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const puzzle = useMemo(() => generateKakuro(seed, difficulty), [seed, difficulty]);
  const { size, isBlack, solution, clues } = puzzle;

  const [grid, setGrid] = useState(() =>
    Array.from({ length: size }, () => Array(size).fill(""))
  );
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const timerKey = `kakuro-${seed}-${difficulty}`;
  const timer = usePuzzleTimer(timerKey, { category: "kakuro", difficulty });

  const clueMap = useMemo(() => {
    const map = new Map<string, { across?: number; down?: number }>();
    for (const c of clues) map.set(`${c.row}-${c.col}`, { across: c.across, down: c.down });
    return map;
  }, [clues]);

  useEffect(() => {
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (!isBlack[r][c]) { setActiveCell([r, c]); containerRef.current?.focus(); return; }
  }, [seed, difficulty]);

  const findNextWhite = (r: number, c: number, dir: number): [number, number] | null => {
    let idx = r * size + c + dir;
    while (idx >= 0 && idx < size * size) {
      const nr = Math.floor(idx / size), nc = idx % size;
      if (!isBlack[nr][nc]) return [nr, nc];
      idx += dir;
    }
    return null;
  };

  const enterNumber = useCallback((num: number) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = num.toString();
      return next;
    });
    setErrors(new Set());
    const next = findNextWhite(r, c, 1);
    if (next) setActiveCell(next);
  }, [activeCell, timer.isSolved, size, isBlack]);

  const deleteCell = useCallback(() => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = "";
      return next;
    });
    setErrors(new Set());
    const prev = findNextWhite(r, c, -1);
    if (prev) setActiveCell(prev);
  }, [activeCell, timer.isSolved, size, isBlack]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell || timer.isSolved) return;
    const [r, c] = activeCell;

    switch (e.key) {
      case "ArrowUp": e.preventDefault(); for (let nr = r - 1; nr >= 0; nr--) if (!isBlack[nr][c]) { setActiveCell([nr, c]); return; } break;
      case "ArrowDown": e.preventDefault(); for (let nr = r + 1; nr < size; nr++) if (!isBlack[nr][c]) { setActiveCell([nr, c]); return; } break;
      case "ArrowLeft": e.preventDefault(); for (let nc = c - 1; nc >= 0; nc--) if (!isBlack[r][nc]) { setActiveCell([r, nc]); return; } break;
      case "ArrowRight": e.preventDefault(); for (let nc = c + 1; nc < size; nc++) if (!isBlack[r][nc]) { setActiveCell([r, nc]); return; } break;
      case "Tab": { e.preventDefault(); const next = findNextWhite(r, c, e.shiftKey ? -1 : 1); if (next) setActiveCell(next); break; }
      case "Backspace": case "Delete": e.preventDefault(); deleteCell(); break;
      default: { if (/^[1-9]$/.test(e.key)) { e.preventDefault(); enterNumber(parseInt(e.key)); } }
    }
  }, [activeCell, timer.isSolved, grid, size, isBlack, enterNumber, deleteCell]);

  const handleReset = () => {
    setGrid(Array.from({ length: size }, () => Array(size).fill("")));
    setErrors(new Set());
    timer.reset();
    containerRef.current?.focus();
  };

  const handleCheck = () => {
    const errs = new Set<string>();
    let filled = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isBlack[r][c]) continue;
        if (!grid[r][c]) { filled = false; continue; }
        if (parseInt(grid[r][c]) !== solution[r][c]) errs.add(`${r}-${c}`);
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
    <div>
      <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />
      {!isMobile && (
        <p className="mb-2 text-xs text-muted-foreground">
          Arrow keys to move • 1–9 to enter • Delete to clear
        </p>
      )}
      <div
        ref={containerRef}
        tabIndex={0}
        className="inline-grid border-2 border-foreground outline-none"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => {
            const black = isBlack[r][c];
            const clue = clueMap.get(`${r}-${c}`);
            const hasError = errors.has(`${r}-${c}`);
            const isActive = activeCell?.[0] === r && activeCell?.[1] === c;

            if (black) {
              return (
                <div key={`${r}-${c}`} className="relative w-10 h-10 sm:w-12 sm:h-12 bg-puzzle-cell-black border border-puzzle-border overflow-hidden">
                  {clue && (
                    <>
                      <div className="absolute inset-0" style={{
                        background: (clue.across && clue.down)
                          ? "linear-gradient(to top right, transparent calc(50% - 0.5px), hsl(var(--puzzle-border)) calc(50% - 0.5px), hsl(var(--puzzle-border)) calc(50% + 0.5px), transparent calc(50% + 0.5px))"
                          : undefined,
                      }} />
                      {clue.down != null && <span className="absolute top-0.5 right-1 text-[9px] font-bold text-primary-foreground/90">{clue.down}</span>}
                      {clue.across != null && <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-primary-foreground/90">{clue.across}</span>}
                    </>
                  )}
                </div>
              );
            }

            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "relative w-10 h-10 sm:w-12 sm:h-12 border border-puzzle-border flex items-center justify-center cursor-pointer select-none touch-manipulation",
                  hasError && "bg-puzzle-cell-error",
                  !hasError && isActive && "bg-puzzle-cell-active",
                  !hasError && !isActive && "bg-puzzle-cell"
                )}
                onClick={() => {
                  setActiveCell([r, c]);
                  if (!isMobile) containerRef.current?.focus();
                }}
              >
                <span className="text-lg sm:text-xl font-semibold text-foreground">{grid[r][c]}</span>
              </div>
            );
          })
        )}
      </div>
      <MobileNumberPad
        visible={isMobile && !!activeCell && !timer.isSolved}
        onNumber={enterNumber}
        onDelete={deleteCell}
      />
      <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
    </div>
  );
};

export default KakuroGrid;
