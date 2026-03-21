import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowLeft, RefreshCw, Share, CheckCheck, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";
import { getPuzzleOrigin, getBackPath, getBackLabel } from "@/lib/puzzleOrigin";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { hapticSuccess } from "@/lib/haptic";
import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating } from "@/lib/solveScoring";

interface Props {
  time: number;
  difficulty: Difficulty;
  onPlayAgain: () => void;
  accuracy?: number | null;
  assisted?: boolean;
  category?: PuzzleCategory;
  seed?: number;
  dailyCode?: string;
  hintsUsed?: number;
  mistakesCount?: number;
}

function buildShareData(props: {
  category?: PuzzleCategory;
  seed?: number;
  difficulty: Difficulty;
  time: number;
  isDaily: boolean;
  dailyCode?: string;
}) {
  const { category, seed, difficulty, time, isDaily, dailyCode } = props;
  if (!category || seed == null) return null;

  const typeName = CATEGORY_INFO[category]?.name ?? category;
  const diffLabel = DIFFICULTY_LABELS[difficulty];
  const timeStr = formatTime(time);

  const shareUrl = dailyCode
    ? `${window.location.origin}/play?code=${dailyCode}`
    : `${window.location.origin}/play?code=${category}-${seed}-${difficulty}`;
  const displayCode = dailyCode ?? String(seed);

  const headline = isDaily
    ? "Just solved today's Puzzlecraft challenge 🧠"
    : "Just tackled a Puzzlecraft puzzle 🧠";

  const text = `${headline}\n\n${typeName} • ${diffLabel} • ${timeStr}\n\nCan you beat this time?\n\nPlay: ${shareUrl}\n\nPuzzle Code: ${displayCode}`;

  return { text, url: shareUrl, displayCode };
}

/** Compute rating change by comparing current rating with what it was before the latest solve */
function useRatingDelta(): { delta: number; factors: string[] } | null {
  return useMemo(() => {
    const records = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (records.length < 11) return null;

    const currentRating = computePlayerRating(records);
    const previousRating = computePlayerRating(records.slice(1));
    const delta = currentRating - previousRating;

    const latest = records[0];
    if (!latest) return null;

    const factors: string[] = [];
    if (latest.difficulty === "hard" || latest.difficulty === "extreme" || latest.difficulty === "insane") {
      factors.push(`${DIFFICULTY_LABELS[latest.difficulty]} difficulty`);
    }
    if (latest.hintsUsed === 0) factors.push("No hints");
    if (latest.mistakesCount <= 1) factors.push("High accuracy");

    return { delta, factors };
  }, []);
}

const CompletionPanel = ({ time, difficulty, onPlayAgain, accuracy, assisted, category, seed, dailyCode }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const origin = getPuzzleOrigin();
  const isDaily = origin === "daily";

  const shareData = buildShareData({ category, seed, difficulty, time, isDaily, dailyCode });
  const ratingDelta = useRatingDelta();

  useEffect(() => {
    hapticSuccess();
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleShare = async () => {
    if (!shareData) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareData.text });
        return;
      } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(shareData.text);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Unable to copy", variant: "destructive" });
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5 transition-all duration-500 ease-out",
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-2 scale-[0.97]"
      )}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn(
          "h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center transition-all duration-700 ease-out",
          visible ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}>
          <Check size={14} className="text-primary" strokeWidth={3} />
        </div>
        <span className="font-display text-base font-semibold text-foreground">Solved</span>
        {assisted && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Assisted
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm mb-4">
        <span className="text-muted-foreground">
          ⏱ <span className="font-mono font-medium text-foreground">{formatTime(time)}</span>
        </span>
        <span className="text-muted-foreground">
          Difficulty: <span className="font-medium text-foreground capitalize">{DIFFICULTY_LABELS[difficulty]}</span>
        </span>
        {accuracy != null && (
          <span className="text-muted-foreground">
            Accuracy: <span className="font-medium text-foreground">{accuracy}%</span>
          </span>
        )}
      </div>

      {/* Post-solve rating feedback */}
      {ratingDelta && ratingDelta.delta !== 0 && !assisted && (
        <div className={cn(
          "flex flex-wrap items-center gap-2 mb-3 px-3 py-2 rounded-lg transition-all duration-700",
          ratingDelta.delta > 0 ? "bg-emerald-500/10" : "bg-destructive/10",
          visible ? "opacity-100" : "opacity-0"
        )}>
          {ratingDelta.delta > 0
            ? <TrendingUp size={14} className="text-emerald-500" />
            : <TrendingDown size={14} className="text-destructive" />
          }
          <span className={cn(
            "font-mono text-sm font-bold",
            ratingDelta.delta > 0 ? "text-emerald-500" : "text-destructive"
          )}>
            {ratingDelta.delta > 0 ? "+" : ""}{ratingDelta.delta} Rating
          </span>
          {ratingDelta.factors.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {ratingDelta.factors.join(" · ")}
            </span>
          )}
        </div>
      )}

      {assisted && (
        <p className="text-xs text-muted-foreground mb-3">
          Hints were used — this solve won't count toward your best time or streak.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onPlayAgain} className="gap-1.5">
          <RefreshCw size={13} /> New Puzzle
        </Button>
        {shareData && (
          <Button size="sm" variant="outline" onClick={handleShare} className="gap-1.5">
            {copied ? <CheckCheck size={13} /> : <Share size={13} />}
            {copied ? "Copied" : "Share"}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(getBackPath(origin))}
          className="gap-1.5"
        >
          <ArrowLeft size={13} /> Back to {getBackLabel(origin)}
        </Button>
      </div>

      {shareData && (
        <div className={cn(
          "mt-3 rounded-lg bg-muted/50 px-3 py-2.5 space-y-1 transition-all duration-500",
          visible ? "opacity-100" : "opacity-0"
        )}>
          <p className="text-xs text-muted-foreground truncate">
            Play: <span className="font-medium text-foreground select-all">{shareData.url}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Puzzle Code: <code className="font-mono text-foreground/70 select-all">{shareData.displayCode}</code>
          </p>
        </div>
      )}
    </div>
  );
};

export default CompletionPanel;