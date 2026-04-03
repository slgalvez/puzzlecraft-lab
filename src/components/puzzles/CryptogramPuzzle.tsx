import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { generateCryptogram } from "@/lib/generators/cryptogram";
import PuzzleControls from "./PuzzleControls";
import { PuzzleHeader } from "./PuzzleHeader";
import { PuzzleToolbar } from "./PuzzleToolbar";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { usePuzzleSession } from "@/hooks/usePuzzleSession";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
}

interface CryptogramState {
  guesses: Record<string, string>;
}

const CryptogramPuzzle = ({ seed, difficulty, onNewPuzzle, onSolve, timeLimit, isEndless, dailyCode, showHints = true, showReveal = true, maxHints }: Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const puzzle = useMemo(() => generateCryptogram(seed, difficulty), [seed, difficulty]);
  const { encoded, decoded, reverseCipher, hints } = puzzle;
  const timerKey = `cryptogram-${seed}-${difficulty}`;
  const session = usePuzzleSession({ puzzleType: "cryptogram", difficulty, progressUnit: "letters" });

  const saved = useMemo(() => loadProgress<CryptogramState>(timerKey), [timerKey]);

  const [guesses, setGuesses] = useState<Record<string, string>>(() =>
    saved?.state.guesses ?? { ...hints }
  );
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [isRevealed, setIsRevealed] = useState(false);
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const resetCount = useRef(0);
  const checkCount = useRef(0);
  const errorCheckCount = useRef(0);
  const hintCount = useRef(0);

  const timer = usePuzzleTimer(timerKey, { category: "cryptogram", difficulty, initialElapsed: saved?.elapsed ?? 0, timeLimit });

  const encodedLetters = useMemo(() => {
    return [...new Set(encoded.split("").filter((ch) => /[A-Z]/.test(ch)))];
  }, [encoded]);

  const editableIndices = useMemo(() => {
    const indices: number[] = [];
    let idx = 0;
    for (const ch of encoded) {
      if (/[A-Z]/.test(ch)) {
        if (!hints[ch]) indices.push(idx);
        idx++;
      } else if (ch !== " ") {
        idx++;
      }
    }
    return indices;
  }, [encoded, hints]);

  const charMap = useMemo(() => {
    const map: { idx: number; letter: string }[] = [];
    let idx = 0;
    for (const ch of encoded) {
      if (/[A-Z]/.test(ch)) { map.push({ idx, letter: ch }); idx++; }
      else if (ch !== " ") { map.push({ idx, letter: ch }); idx++; }
    }
    return map;
  }, [encoded]);

  const guessesRef = useRef(guesses);
  guessesRef.current = guesses;
  const { status: saveStatus, debouncedSave } = useAutoSave<CryptogramState>({
    puzzleKey: timerKey,
    getState: () => ({ guesses: guessesRef.current }),
    getElapsed: () => timer.elapsed,
    disabled: timer.isSolved || isRevealed,
  });

  // Track progress: correctly decoded unique letters
  useEffect(() => {
    const totalUnique = encodedLetters.length;
    let correctMappings = 0;
    for (const el of encodedLetters) {
      if (guesses[el] && guesses[el] === reverseCipher[el]) correctMappings++;
    }
    session.setProgress(correctMappings, totalUnique);
  }, [guesses, encodedLetters, reverseCipher, session]);

  useEffect(() => { debouncedSave(); }, [guesses, debouncedSave]);

  useEffect(() => {
    if (editableIndices.length > 0) {
      setActiveIdx(editableIndices[0]);
      setTimeout(() => inputRefs.current.get(editableIndices[0])?.focus(), 50);
    }
  }, [seed, difficulty]);

  const focusIdx = (idx: number) => {
    setActiveIdx(idx);
    inputRefs.current.get(idx)?.focus();
  };

  const findNextEditable = (fromIdx: number, dir: number): number | null => {
    const pos = editableIndices.indexOf(fromIdx);
    if (pos === -1) {
      if (dir > 0) { const next = editableIndices.find((i) => i > fromIdx); return next ?? null; }
      else { for (let i = editableIndices.length - 1; i >= 0; i--) if (editableIndices[i] < fromIdx) return editableIndices[i]; return null; }
    }
    const nextPos = pos + dir;
    if (nextPos >= 0 && nextPos < editableIndices.length) return editableIndices[nextPos];
    return null;
  };

  const handleInput = (encodedLetter: string, value: string, idx: number) => {
    if (hints[encodedLetter] || timer.isSolved || isRevealed) return;
    const letter = value.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    setGuesses((prev) => ({ ...prev, [encodedLetter]: letter }));
    setErrors(new Set());
    if (letter) {
      const next = findNextEditable(idx, 1);
      if (next !== null) focusIdx(next);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent, encodedLetter: string, idx: number) => {
    if (timer.isSolved || isRevealed) return;
    switch (e.key) {
      case "ArrowRight": { e.preventDefault(); const next = findNextEditable(idx, 1); if (next !== null) focusIdx(next); break; }
      case "ArrowLeft": { e.preventDefault(); const prev = findNextEditable(idx, -1); if (prev !== null) focusIdx(prev); break; }
      case "Tab": { e.preventDefault(); const next = findNextEditable(idx, e.shiftKey ? -1 : 1); if (next !== null) focusIdx(next); break; }
      case "Backspace": case "Delete":
        e.preventDefault();
        if (!hints[encodedLetter]) { setGuesses((prev) => ({ ...prev, [encodedLetter]: "" })); setErrors(new Set()); }
        if (e.key === "Backspace") { const prev = findNextEditable(idx, -1); if (prev !== null) focusIdx(prev); }
        break;
      default: {
        const letter = e.key.toUpperCase();
        if (/^[A-Z]$/.test(letter) && !hints[encodedLetter]) {
          e.preventDefault();
          setGuesses((prev) => ({ ...prev, [encodedLetter]: letter }));
          setErrors(new Set());
          const next = findNextEditable(idx, 1);
          if (next !== null) focusIdx(next);
        }
      }
    }
  }, [timer.isSolved, isRevealed, hints, editableIndices]);

  const handleReset = () => {
    setGuesses({ ...hints }); setErrors(new Set()); setIsRevealed(false); hintCount.current = 0; resetCount.current++; timer.reset(); clearProgress(timerKey);
    if (editableIndices.length > 0) focusIdx(editableIndices[0]);
  };

  const handleCheck = () => {
    checkCount.current++;
    const errs = new Set<string>();
    let allFilled = true;
    for (const el of encodedLetters) {
      const guess = guesses[el] || "";
      if (!guess) { allFilled = false; continue; }
      if (guess !== reverseCipher[el]) errs.add(el);
    }
    setErrors(errs);
    if (errs.size > 0) { errorCheckCount.current++; session.recordMistake(); }
    if (errs.size === 0 && allFilled) {
      const { isNewBest } = timer.solve({ assisted: hintCount.current > 0, hintsUsed: hintCount.current, mistakesCount: errorCheckCount.current });
      clearProgress(timerKey);
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Message decoded correctly!" });
      onSolve?.({ elapsed: timer.elapsed, completed: true, resets: resetCount.current, checks: checkCount.current, errorChecks: errorCheckCount.current });
    } else if (errs.size > 0)
      toast({ title: "Not quite right", description: `${errs.size} letter(s) are incorrect.`, variant: "destructive" });
    else
      toast({ title: "Keep going!", description: "No errors so far." });
  };

  const handleHint = () => {
    if (timer.isSolved || isRevealed) return;
    for (const el of encodedLetters) {
      if (hints[el]) continue;
      if (guesses[el] !== reverseCipher[el]) {
        setGuesses((prev) => ({ ...prev, [el]: reverseCipher[el] }));
        setErrors(new Set());
        hintCount.current++;
        toast({ title: "💡 Hint", description: `Revealed: ${el} → ${reverseCipher[el]}. (${hintCount.current} hint${hintCount.current > 1 ? "s" : ""} used)` });
        return;
      }
    }
    toast({ title: "No hints needed", description: "All letters are correct!" });
  };

  const handleReveal = () => {
    const revealed: Record<string, string> = {};
    for (const el of encodedLetters) {
      revealed[el] = reverseCipher[el];
    }
    setGuesses(revealed);
    setErrors(new Set());
    setIsRevealed(true);
    timer.pause();
    clearProgress(timerKey);
  };

  const words = encoded.split(" ");
  let charIndex = 0;

  return (
    <div ref={containerRef}>
      <PuzzleHeader
        puzzleType="cryptogram"
        difficulty={difficulty}
        elapsed={timer.elapsed}
        mistakes={session.mistakes}
        personalBest={session.personalBest}
        progressCurrent={session.progressCurrent}
        progressTotal={session.progressTotal}
        progressUnit={session.progressUnit}
      />
      {!isMobile && (
        <p className="mb-3 text-xs text-muted-foreground">
          Type letters to guess • Arrow keys to move • All matching letters update together
        </p>
      )}
      {isMobile && (
        <p className="mb-3 text-xs text-muted-foreground">
          Tap a letter to focus • Type to guess • Matching letters update together
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-4 mb-4">
        {words.map((word, wi) => (
          <div key={wi} className="flex gap-0.5">
            {word.split("").map((ch, ci) => {
              const isLetter = /[A-Z]/.test(ch);
              const idx = charIndex++;
              const isHint = isLetter && hints[ch];
              const hasError = isLetter && errors.has(ch);
              const guess = isLetter ? guesses[ch] || "" : "";
              const isActive = idx === activeIdx;

              if (!isLetter) {
                return (
                  <div key={ci} className="w-6 flex flex-col items-center justify-end">
                    <span className="text-lg text-muted-foreground">{ch}</span>
                  </div>
                );
              }

              return (
                <div key={ci} className="flex flex-col items-center">
                  <input
                    ref={(el) => { if (el) inputRefs.current.set(idx, el); }}
                    className={cn(
                      "w-8 h-10 sm:h-9 text-center text-lg font-semibold outline-none border-b-2 bg-transparent uppercase touch-manipulation",
                      isHint && "text-primary border-primary/50",
                      hasError && "text-destructive border-destructive",
                      !isHint && !hasError && isActive && "text-foreground border-primary",
                      !isHint && !hasError && !isActive && "text-foreground border-border focus:border-primary"
                    )}
                    value={guess}
                    readOnly={!!isHint || isRevealed}
                    maxLength={1}
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    onChange={(e) => handleInput(ch, e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, ch, idx)}
                    onFocus={() => setActiveIdx(idx)}
                  />
                  <span className="mt-1 text-xs font-medium text-muted-foreground">{ch}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <details className="mt-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground transition-colors">Letter frequency</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {encodedLetters
            .sort((a, b) => {
              const countA = encoded.split("").filter((c) => c === a).length;
              const countB = encoded.split("").filter((c) => c === b).length;
              return countB - countA;
            })
            .map((letter) => {
              const count = encoded.split("").filter((c) => c === letter).length;
              return (
                <span key={letter} className="rounded border border-border px-2 py-0.5 text-xs bg-card">{letter}: {count}</span>
              );
            })}
        </div>
      </details>

      <PuzzleControls
        onReset={handleReset}
        onCheck={handleCheck}
        onNewPuzzle={onNewPuzzle}
        onHint={showHints ? handleHint : undefined}
        onReveal={showReveal ? handleReveal : undefined}
        hintCount={hintCount.current}
        maxHints={showHints ? maxHints : undefined}
        isRevealed={isRevealed}
        puzzleCode={dailyCode ?? `cryptogram-${seed}`}
        solveData={{ isSolved: timer.isSolved, time: timer.elapsed, difficulty, isEndless, assisted: hintCount.current > 0, category: "cryptogram", seed, dailyCode }}
        saveStatus={saveStatus}
      />
    </div>
  );
};

export default CryptogramPuzzle;
