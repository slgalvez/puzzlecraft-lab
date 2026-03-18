import { Timer, Trophy, Pause, Play, AlertTriangle } from "lucide-react";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { cn } from "@/lib/utils";

interface Props {
  elapsed: number;
  isRunning: boolean;
  isSolved: boolean;
  bestTime: number | null;
  countdown?: number;
  remaining?: number | null;
  timeLimit?: number | null;
  expired?: boolean;
  onPause: () => void;
  onResume: () => void;
}

const PuzzleTimer = ({
  elapsed, isRunning, isSolved, bestTime, countdown = 0,
  remaining = null, timeLimit = null, expired = false,
  onPause, onResume,
}: Props) => {
  const inCountdown = countdown > 0 && !isSolved;
  const hasTimeLimit = timeLimit !== null && timeLimit > 0;
  const isLowTime = hasTimeLimit && remaining !== null && remaining <= 30 && remaining > 0;

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5",
        expired && "border-destructive/50",
        isLowTime && !expired && "border-orange-500/50"
      )}>
        <Timer className={cn(
          "h-4 w-4",
          expired ? "text-destructive" : isLowTime ? "text-orange-500" : "text-muted-foreground"
        )} />
        {inCountdown ? (
          <span className="font-mono text-lg font-semibold tabular-nums text-primary animate-pulse">
            {countdown}
          </span>
        ) : hasTimeLimit ? (
          <>
            <span className={cn(
              "font-mono text-lg font-semibold tabular-nums",
              expired ? "text-destructive" : isLowTime ? "text-orange-500" : isSolved ? "text-primary" : "text-foreground"
            )}>
              {formatTime(remaining ?? 0)}
            </span>
            {!isSolved && !expired && (
              <button
                onClick={isRunning ? onPause : onResume}
                className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={isRunning ? "Pause" : "Resume"}
              >
                {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
            )}
          </>
        ) : (
          <>
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
          </>
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
      {expired && !isSolved && (
        <span className="flex items-center gap-1 text-sm font-medium text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" /> Time's up!
        </span>
      )}
    </div>
  );
};

export default PuzzleTimer;
