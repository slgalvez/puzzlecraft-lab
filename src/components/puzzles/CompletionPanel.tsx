import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowLeft, RefreshCw, Share, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";
import { getPuzzleOrigin, getBackPath, getBackLabel } from "@/lib/puzzleOrigin";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  time: number;
  difficulty: Difficulty;
  onPlayAgain: () => void;
  accuracy?: number | null;
  assisted?: boolean;
  category?: PuzzleCategory;
  seed?: number;
  dailyCode?: string;
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

  // For daily puzzles, use the canonical daily code
  const code = dailyCode ?? `${category}-${seed}-${difficulty}`;
  const shareUrl = dailyCode
    ? `${window.location.origin}/play?code=${dailyCode}`
    : `${window.location.origin}/play?code=${category}-${seed}-${difficulty}`;
  const displayCode = dailyCode ?? String(seed);

  const headline = isDaily
    ? "I just completed today's Puzzlecraft challenge 🧠"
    : "I just completed a Puzzlecraft puzzle 🧠";

  const text = `${headline}\n\n${typeName} • ${diffLabel} • ${timeStr}\n\nThink you can beat my time?\n\nPlay: ${shareUrl}\n\nPuzzle Code: ${displayCode}`;

  return { text, url: shareUrl, code, displayCode };
}

const CompletionPanel = ({ time, difficulty, onPlayAgain, accuracy, assisted, category, seed, dailyCode }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const origin = getPuzzleOrigin();
  const isDaily = origin === "daily";

  const shareData = buildShareData({ category, seed, difficulty, time, isDaily, dailyCode });

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleShare = async () => {
    if (!shareData) return;

    // Try native share on mobile
    if (navigator.share) {
      try {
        await navigator.share({ text: shareData.text });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Clipboard fallback
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
            {copied ? <CheckCheck size={13} /> : <Share2 size={13} />}
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

      {/* Share link + code preview */}
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
