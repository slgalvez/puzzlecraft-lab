/**
 * FriendActivityFeed.tsx  ← FULL REPLACEMENT
 * src/components/ios/FriendActivityFeed.tsx
 *
 * Previously: only showed craft puzzle solve activity (people solving
 * YOUR shared puzzles). No connection to the friends system.
 *
 * Now: uses useFriendActivity() to show real friend activity:
 *   - Friends' daily challenge solves
 *   - Friends solving your craft puzzles
 *   - Sorted by recency
 *
 * Still renders null when empty — no layout disruption.
 */

import { useNavigate } from "react-router-dom";
import { Activity, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFriendActivity } from "@/hooks/useFriendActivity";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { hapticTap } from "@/lib/haptic";

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtRelative(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_LABELS: Record<string, string> = {
  crossword:    "Crossword",
  "word-search":"Word Search",
  cryptogram:   "Cryptogram",
  "word-fill":  "Word Fill-In",
  "number-fill":"Number Fill-In",
  sudoku:       "Sudoku",
  kakuro:       "Kakuro",
  nonogram:     "Nonogram",
  puzzle:       "puzzle",
};

// ── Component ─────────────────────────────────────────────────────────────

export function FriendActivityFeed({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { account } = useUserAccount();
  const { activityFeed, loading } = useFriendActivity();

  // Not signed in, loading, or empty → render nothing (no layout disruption)
  if (!account || loading || activityFeed.length === 0) return null;

  // Show max 4 items in the iOS Play tab feed
  const visible = activityFeed.slice(0, 4);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Activity size={13} className="text-muted-foreground" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Friend activity
          </p>
        </div>
        <button
          onClick={() => { hapticTap(); navigate("/stats"); }}
          className="flex items-center gap-0.5 text-[10px] font-medium text-primary"
        >
          See all <ChevronRight size={11} />
        </button>
      </div>

      {/* Activity rows */}
      <div className="rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
        {visible.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              hapticTap();
              if (item.type === "craft_solve" && item.puzzleId) navigate(`/s/${item.puzzleId}`);
              else navigate("/daily");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/40"
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground uppercase">
              {item.actorName.charAt(0)}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug truncate">
                {item.type === "daily_solve" ? (
                  <>
                    <span className="font-semibold">{item.actorName}</span>
                    {" solved today's "}
                    <span className="capitalize">{TYPE_LABELS[item.puzzleType] ?? item.puzzleType}</span>
                    {item.solveTime != null && (
                      <span className="text-muted-foreground">
                        {" in "}
                        <span className="font-mono font-medium text-foreground">{fmtTime(item.solveTime)}</span>
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{item.actorName}</span>
                    {" solved your "}
                    {TYPE_LABELS[item.puzzleType] ?? item.puzzleType}
                    {item.solveTime != null && (
                      <span className="text-muted-foreground">
                        {" in "}
                        <span className="font-mono font-medium text-foreground">{fmtTime(item.solveTime)}</span>
                      </span>
                    )}
                  </>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {fmtRelative(item.timestamp)}
                {item.type === "craft_solve" && (
                  <span className="ml-2 text-primary font-medium">Tap to view</span>
                )}
              </p>
            </div>

            {item.type === "craft_solve" && (
              <ChevronRight size={14} className="text-muted-foreground/50 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
