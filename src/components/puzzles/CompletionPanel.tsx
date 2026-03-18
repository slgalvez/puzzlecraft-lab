import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/puzzleTypes";
import { getPuzzleOrigin, getBackPath, getBackLabel } from "@/lib/puzzleOrigin";
import { cn } from "@/lib/utils";

interface Props {
  time: number;
  difficulty: Difficulty;
  onPlayAgain: () => void;
  accuracy?: number | null;
}

const CompletionPanel = ({ time, difficulty, onPlayAgain, accuracy }: Props) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const origin = getPuzzleOrigin();

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "mt-6 rounded-xl border bg-card p-4 sm:p-5 transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
          <Check size={14} className="text-primary" strokeWidth={3} />
        </div>
        <span className="font-display text-base font-semibold text-foreground">Solved</span>
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

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onPlayAgain} className="gap-1.5">
          <RefreshCw size={13} /> Play Again
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(getBackPath(origin))}
          className="gap-1.5"
        >
          <ArrowLeft size={13} /> Back to {getBackLabel(origin)}
        </Button>
      </div>
    </div>
  );
};

export default CompletionPanel;
