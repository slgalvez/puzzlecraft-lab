import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { generateCryptogram } from "@/lib/generators/cryptogram";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";
import type { Difficulty } from "@/lib/puzzleTypes";

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
}

const CryptogramPuzzle = ({ seed, difficulty, onNewPuzzle }: Props) => {
  const { toast } = useToast();
  const puzzle = useMemo(() => generateCryptogram(seed, difficulty), [seed, difficulty]);
  const { encoded, decoded, reverseCipher, hints } = puzzle;

  const [guesses, setGuesses] = useState<Record<string, string>>(() => ({ ...hints }));
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const timerKey = `cryptogram-${seed}-${difficulty}`;
  const timer = usePuzzleTimer(timerKey, { category: "cryptogram", difficulty });

  const encodedLetters = useMemo(() => {
    return [...new Set(encoded.split("").filter((ch) => /[A-Z]/.test(ch)))];
  }, [encoded]);

  const words = encoded.split(" ");

  const handleInput = (encodedLetter: string, value: string, idx: number) => {
    if (hints[encodedLetter] || timer.isSolved) return;
    const letter = value.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    setGuesses((prev) => ({ ...prev, [encodedLetter]: letter }));
    setErrors(new Set());

    if (letter) {
      const allInputs = Array.from(inputRefs.current.entries())
        .sort(([a], [b]) => a - b);
      const currentIdx = allInputs.findIndex(([i]) => i === idx);
      for (let j = currentIdx + 1; j < allInputs.length; j++) {
        const [, input] = allInputs[j];
        const el = input as HTMLInputElement;
        if (!el.readOnly && !el.value) {
          el.focus();
          return;
        }
      }
    }
  };

  const handleReset = () => {
    setGuesses({ ...hints });
    setErrors(new Set());
    timer.reset();
  };

  const handleCheck = () => {
    const errs = new Set<string>();
    let allFilled = true;
    for (const el of encodedLetters) {
      const guess = guesses[el] || "";
      if (!guess) { allFilled = false; continue; }
      if (guess !== reverseCipher[el]) errs.add(el);
    }
    setErrors(errs);
    if (errs.size === 0 && allFilled) {
      const { isNewBest } = timer.solve();
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Message decoded correctly!" });
    } else if (errs.size > 0)
      toast({ title: "Not quite right", description: `${errs.size} letter(s) are incorrect.`, variant: "destructive" });
    else
      toast({ title: "Keep going!", description: "No errors so far." });
  };

  let charIndex = 0;

  return (
    <div>
      <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />
      <div className="flex flex-wrap gap-x-4 gap-y-4 mb-4">
        {words.map((word, wi) => (
          <div key={wi} className="flex gap-0.5">
            {word.split("").map((ch, ci) => {
              const isLetter = /[A-Z]/.test(ch);
              const idx = charIndex++;
              const isHint = isLetter && hints[ch];
              const hasError = isLetter && errors.has(ch);
              const guess = isLetter ? guesses[ch] || "" : "";

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
                      "w-8 h-9 text-center text-lg font-semibold outline-none border-b-2 bg-transparent uppercase",
                      isHint && "text-primary border-primary/50",
                      hasError && "text-destructive border-destructive",
                      !isHint && !hasError && "text-foreground border-border focus:border-primary"
                    )}
                    value={guess}
                    readOnly={!!isHint}
                    maxLength={1}
                    onChange={(e) => handleInput(ch, e.target.value, idx)}
                  />
                  <span className="mt-1 text-xs font-medium text-muted-foreground">{ch}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <details className="mt-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground transition-colors">
          Letter frequency
        </summary>
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
                <span key={letter} className="rounded border border-border px-2 py-0.5 text-xs bg-card">
                  {letter}: {count}
                </span>
              );
            })}
        </div>
      </details>

      <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
    </div>
  );
};

export default CryptogramPuzzle;
