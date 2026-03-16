import { useNavigate } from "react-router-dom";
import { Puzzle, Gift, Check } from "lucide-react";

interface Props {
  body: string;
  isMine: boolean;
  formatTime: (iso: string) => string;
  createdAt: string;
}

/** Detect and parse puzzle system messages */
export function isPuzzleMessage(body: string): boolean {
  return body.startsWith("__PUZZLE_SENT__:") || body.startsWith("__PUZZLE_SOLVED__:");
}

export function PuzzleMessageBubble({ body, isMine, formatTime, createdAt }: Props) {
  const navigate = useNavigate();
  const isSent = body.startsWith("__PUZZLE_SENT__:");
  const parts = body.split(":");
  // Format: __PUZZLE_SENT__:puzzleId:puzzleType:label
  const label = parts.slice(3).join(":") || "Puzzle";

  const handleOpen = () => {
    navigate("/p/for-you");
  };

  return (
    <div className="flex justify-center my-1">
      <div className="max-w-[85%] sm:max-w-[70%] rounded-xl px-4 py-2.5 bg-muted/50 border border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 shrink-0">
            {isSent ? (
              <Gift size={12} className="text-primary" />
            ) : (
              <Check size={12} className="text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground leading-snug">
              {isSent ? (
                isMine
                  ? <>You sent a <span className="font-medium">{label}</span> puzzle</>
                  : <>Sent you a <span className="font-medium">{label}</span> puzzle</>
              ) : (
                isMine
                  ? <>You solved the <span className="font-medium">{label}</span> puzzle!</>
                  : <>Solved your <span className="font-medium">{label}</span> puzzle!</>
              )}
            </p>
            <span className="text-[10px] text-muted-foreground">{formatTime(createdAt)}</span>
          </div>
          {isSent && (
            <button
              onClick={handleOpen}
              className="shrink-0 text-[11px] text-primary hover:text-primary/80 font-medium px-2 py-1 rounded hover:bg-primary/5 transition-colors"
            >
              Open
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
