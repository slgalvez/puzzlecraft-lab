import { Timer, Trophy, Pause, Play } from "lucide-react";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { cn } from "@/lib/utils";

interface Props {
  elapsed: number;
  isRunning: boolean;
  isSolved: boolean;
  bestTime: number | null;
  onPause: () => void;
  onResume: () => void;
}

const PuzzleTimer = ({ elapsed, isRunning, isSolved, bestTime, onPause, onResume }: Props) => (
  <div className="flex items-center gap-4 mb-4">
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5">
      <Timer className="h-4 w-4 text-muted-foreground" />
      <span className={cn(
        "font-mono text-lg font-semibold tabular-nums",
        isSolved ? "text-primary" : "text-foreground"
      )}>
        {formatTime(elapsed)}
      </span>
      {!isSolved && (
        <button
          onClick={isRunning ? onPause : onResume}
          className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isRunning ? "Pause" : "Resume"}
        >
          {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
    {bestTime !== null && (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-primary" />
        <span>Best: <span className="font-mono font-medium text-foreground">{formatTime(bestTime)}</span></span>
      </div>
    )}
    {isSolved && (
      <span className="text-sm font-medium text-primary">✓ Solved!</span>
    )}
  </div>
);

export default PuzzleTimer;
