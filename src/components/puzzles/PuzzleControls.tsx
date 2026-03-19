import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle2, Shuffle, Eye, Lightbulb } from "lucide-react";
import { useState } from "react";
import CompletionPanel from "./CompletionPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Difficulty } from "@/lib/puzzleTypes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  onReset: () => void;
  onCheck: () => void;
  onNewPuzzle: () => void;
  onReveal?: () => void;
  onHint?: () => void;
  hintCount?: number;
  isRevealed?: boolean;
  puzzleCode?: string;
  solveData?: {
    isSolved: boolean;
    time: number;
    difficulty: Difficulty;
    accuracy?: number | null;
    isEndless?: boolean;
    assisted?: boolean;
  };
}

const PuzzleControls = ({ onReset, onCheck, onNewPuzzle, onReveal, onHint, hintCount = 0, isRevealed, puzzleCode, solveData }: Props) => {
  const [open, setOpen] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const isMobile = useIsMobile();

  const showCompletion = solveData?.isSolved && !solveData?.isEndless;
  const showControls = !solveData?.isSolved && !isRevealed;

  return (
    <div className="mt-8 space-y-3">
      {showCompletion && solveData ? (
        <CompletionPanel
          time={solveData.time}
          difficulty={solveData.difficulty}
          onPlayAgain={onNewPuzzle}
          accuracy={solveData.accuracy}
          assisted={solveData.assisted}
        />
      ) : isRevealed ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          <p className="mb-3">Solution revealed. This puzzle won't count toward your stats.</p>
          <Button size="sm" onClick={onNewPuzzle}>
            <Shuffle className="mr-1.5 h-4 w-4" /> New Puzzle
          </Button>
        </div>
      ) : isMobile ? (
        /* ── Mobile layout ── */
        <div className="space-y-3">
          {/* Reset — top-right aligned, icon-only, low emphasis */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onReset}
              aria-label="Reset puzzle"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Primary — Check Solution, full width */}
          <Button className="w-full h-9" onClick={onCheck}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Check Solution
          </Button>

          {/* Secondary — Hint + Reveal side by side */}
          {showControls && (onHint || onReveal) && (
            <div className="grid grid-cols-2 gap-2">
              {onHint && (
                <Button
                  variant="outline"
                  className="h-9 text-muted-foreground hover:text-foreground"
                  onClick={onHint}
                >
                  <Lightbulb className="mr-1.5 h-4 w-4" />
                  Hint{hintCount > 0 ? ` (${hintCount})` : ""}
                </Button>
              )}
              {onReveal && (
                <Button
                  variant="ghost"
                  className="h-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowRevealConfirm(true)}
                >
                  <Eye className="mr-1.5 h-4 w-4" /> Reveal
                </Button>
              )}
            </div>
          )}

          {/* Separated — New Puzzle on its own row */}
          <div className="pt-2">
            <Button variant="outline" className="w-full h-9" onClick={onNewPuzzle}>
              <Shuffle className="mr-1.5 h-4 w-4" /> New Puzzle
            </Button>
          </div>

          {puzzleCode && (
            <details
              className="text-xs text-muted-foreground"
              open={open}
              onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer hover:text-foreground transition-colors select-none w-fit">
                Advanced
              </summary>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-muted-foreground">Puzzle code:</span>
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-foreground select-all">
                  {puzzleCode}
                </code>
              </div>
            </details>
          )}
        </div>
      ) : (
        /* ── Desktop layout (unchanged) ── */
        <>
          {onHint && showControls && (
            <div>
              <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={onHint}>
                <Lightbulb className="h-4 w-4" />
                Hint{hintCount > 0 ? ` (${hintCount})` : ""}
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
            </Button>
            <Button size="sm" onClick={onCheck}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Check Solution
            </Button>
            {onReveal && showControls && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowRevealConfirm(true)}>
                <Eye className="mr-1.5 h-4 w-4" /> Reveal
              </Button>
            )}
            <Button size="sm" onClick={onNewPuzzle}>
              <Shuffle className="mr-1.5 h-4 w-4" /> New Puzzle
            </Button>
          </div>
          {puzzleCode && (
            <details
              className="text-xs text-muted-foreground"
              open={open}
              onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer hover:text-foreground transition-colors select-none w-fit">
                Advanced
              </summary>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-muted-foreground">Puzzle code:</span>
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-foreground select-all">
                  {puzzleCode}
                </code>
              </div>
            </details>
          )}
        </>
      )}

      <AlertDialog open={showRevealConfirm} onOpenChange={setShowRevealConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reveal solution?</AlertDialogTitle>
            <AlertDialogDescription>
              This will fill in the correct answer and end your run. The puzzle won't count toward your best time or streak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onReveal?.(); setShowRevealConfirm(false); }}>
              Reveal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PuzzleControls;
