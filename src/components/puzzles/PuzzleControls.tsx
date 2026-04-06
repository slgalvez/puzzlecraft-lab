import { Button } from "@/components/ui/button";
import { RotateCcw, Shuffle, Bookmark, Code } from "lucide-react";
import { useState, useCallback } from "react";
import { CompletionSheet } from "./CompletionSheet";
import SaveIndicator from "./SaveIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Difficulty, PuzzleCategory } from "@/lib/puzzleTypes";
import { savePuzzle, savePuzzleReplacingOldest, unsavePuzzle, isSaved, isAtLimit } from "@/lib/savedPuzzles";
import { useToast } from "@/hooks/use-toast";
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
  onCheck?: () => void;
  onNewPuzzle: () => void;
  onReveal?: () => void;
  onHint?: () => void;
  hintCount?: number;
  maxHints?: number | null;
  isRevealed?: boolean;
  puzzleCode?: string;
  solveData?: {
    isSolved: boolean;
    time: number;
    difficulty: Difficulty;
    accuracy?: number | null;
    isEndless?: boolean;
    assisted?: boolean;
    category?: PuzzleCategory;
    seed?: number;
    dailyCode?: string;
  };
  saveStatus?: "idle" | "saving" | "saved";
}

const PuzzleControls = ({
  onReset, onCheck, onNewPuzzle, onReveal, onHint,
  hintCount = 0, maxHints, isRevealed, puzzleCode,
  solveData, saveStatus = "idle",
}: Props) => {
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const canSave = solveData?.category && solveData?.seed != null && !solveData?.isSolved && !isRevealed && !solveData?.isEndless;
  const puzzleSaveId = canSave ? `${solveData!.category}-${solveData!.seed}-${solveData!.difficulty}` : null;
  const [saved, setSaved] = useState(() => puzzleSaveId ? isSaved(puzzleSaveId) : false);

  const toggleSave = useCallback(() => {
    if (!puzzleSaveId || !solveData?.category || solveData?.seed == null) return;
    if (saved) {
      unsavePuzzle(puzzleSaveId);
      setSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      const puzzle = {
        id: puzzleSaveId,
        category: solveData.category,
        difficulty: solveData.difficulty,
        seed: solveData.seed,
        dailyCode: solveData.dailyCode,
      };
      const ok = savePuzzle(puzzle);
      if (!ok) {
        savePuzzleReplacingOldest(puzzle);
        toast({ title: "Saved (oldest removed)" });
      } else {
        toast({ title: "Saved for later" });
      }
      setSaved(true);
    }
  }, [puzzleSaveId, saved, solveData, toast]);

  const showCompletion = solveData?.isSolved && !solveData?.isEndless;
  const showControls = !solveData?.isSolved && !isRevealed;

  return (
    <div className="mt-6 space-y-3">
      <CompletionSheet
        open={!!showCompletion && !!solveData}
        time={solveData?.time ?? 0}
        difficulty={solveData?.difficulty ?? "medium"}
        onPlayAgain={onNewPuzzle}
        accuracy={solveData?.accuracy}
        assisted={solveData?.assisted}
        category={solveData?.category}
        seed={solveData?.seed}
        dailyCode={solveData?.dailyCode}
      />

      {!showCompletion && (
        isRevealed ? (
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            <p className="mb-3">Solution revealed. This puzzle won't count toward your stats.</p>
            <Button size="sm" onClick={onNewPuzzle}>
              <Shuffle className="mr-1.5 h-4 w-4" /> New Puzzle
            </Button>
          </div>
        ) : isMobile ? (
          /* ── Mobile layout ─────────────────────────────────────────── */
          <div className="space-y-2.5">
            {/* New Puzzle — primary action, full width, top of controls */}
            <Button variant="outline" className="w-full h-11" onClick={onNewPuzzle}>
              <Shuffle className="mr-1.5 h-4 w-4" /> New Puzzle
            </Button>

            {/* Save + Reset — compact row below New Puzzle, ergonomic position */}
            <div className="flex items-center gap-1 justify-end">
              <SaveIndicator status={saveStatus} />
              {canSave && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 ${saved ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={toggleSave}
                  aria-label={saved ? "Remove bookmark" : "Save for later"}
                >
                  <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={onReset}
                aria-label="Reset puzzle"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* ── Puzzle Code — renamed from "Advanced" ── */}
            {puzzleCode && (
              <div className="pt-1">
                <button
                  onClick={() => setCodeOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors select-none"
                >
                  <Code size={12} />
                  Puzzle Code
                  <span className="text-muted-foreground/50">{codeOpen ? "▲" : "▼"}</span>
                </button>
                {codeOpen && (
                  <div className="mt-1.5 flex items-center gap-2 animate-in fade-in duration-150">
                    <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground select-all">
                      {puzzleCode}
                    </code>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(puzzleCode);
                        toast({ title: "Code copied" });
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── Desktop layout ─────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={onNewPuzzle}>
                <Shuffle className="mr-1.5 h-4 w-4" /> New Puzzle
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground/60 hover:text-foreground"
                onClick={onReset}
                aria-label="Reset puzzle"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              {canSave && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${saved ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"}`}
                  onClick={toggleSave}
                  aria-label={saved ? "Remove bookmark" : "Save for later"}
                >
                  <Bookmark className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} />
                </Button>
              )}
              <SaveIndicator status={saveStatus} />
            </div>

            {/* ── Puzzle Code — renamed from "Advanced" ── */}
            {puzzleCode && (
              <div>
                <button
                  onClick={() => setCodeOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors select-none"
                >
                  <Code size={11} />
                  Puzzle Code
                  <span className="text-muted-foreground/40">{codeOpen ? "▲" : "▼"}</span>
                </button>
                {codeOpen && (
                  <div className="mt-1.5 flex items-center gap-2 animate-in fade-in duration-150">
                    <span className="text-xs text-muted-foreground">Code:</span>
                    <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground select-all">
                      {puzzleCode}
                    </code>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(puzzleCode);
                        toast({ title: "Code copied" });
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
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
