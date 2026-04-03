import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { hapticTap } from "@/lib/haptic";

interface ActivityItem {
  id: string;
  type: "friend_solved" | "friend_sent";
  actorName: string;
  puzzleType: string;
  solveTime: number | null;
  timestamp: Date;
  puzzleId: string;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatRelative(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_LABELS: Record<string, string> = {
  crossword:    "Crossword",
  "word-search": "Word Search",
  cryptogram:   "Cryptogram",
  "word-fill":  "Word Fill-In",
};

async function fetchRecentActivity(): Promise<ActivityItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const items: ActivityItem[] = [];

  // Friends who solved puzzles you shared (craft_recipients with recent completions)
  try {
    const { data: myPuzzles } = await supabase
      .from("shared_puzzles")
      .select("id")
      .limit(20);

    if (myPuzzles && myPuzzles.length > 0) {
      const puzzleIds = myPuzzles.map((p) => p.id);
      const { data: solved } = await supabase
        .from("craft_recipients")
        .select("id, puzzle_id, display_name, solve_time, completed_at")
        .in("puzzle_id", puzzleIds)
        .not("completed_at", "is", null)
        .gte("completed_at", cutoff)
        .order("completed_at", { ascending: false })
        .limit(5);

      if (solved) {
        for (const row of solved) {
          items.push({
            id: `solved-${row.id}`,
            type: "friend_solved",
            actorName: row.display_name ?? "Someone",
            puzzleType: "puzzle",
            solveTime: row.solve_time,
            timestamp: new Date(row.completed_at!),
            puzzleId: row.puzzle_id,
          });
        }
      }
    }
  } catch {}

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 4);
}

export function FriendActivityFeed({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const items = await fetchRecentActivity();
    setActivity(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading || activity.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-muted-foreground" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Friend activity
          </p>
        </div>
        <button
          onClick={() => { hapticTap(); navigate("/craft"); }}
          className="flex items-center gap-0.5 text-[10px] font-medium text-primary"
        >
          See all <ChevronRight size={11} />
        </button>
      </div>

      <div className="rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
        {activity.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              hapticTap();
              navigate(
                item.type === "friend_sent"
                  ? `/s/${item.puzzleId}`
                  : "/craft"
              );
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/40"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground uppercase">
              {item.actorName.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug truncate">
                {item.type === "friend_solved" ? (
                  <>
                    <span className="font-semibold">{item.actorName}</span>
                    {" solved your "}
                    {TYPE_LABELS[item.puzzleType] ?? item.puzzleType}
                    {item.solveTime && (
                      <span className="text-muted-foreground">
                        {" in "}
                        <span className="font-mono font-medium text-foreground">
                          {formatTime(item.solveTime)}
                        </span>
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{item.actorName}</span>
                    {" sent you a "}
                    {TYPE_LABELS[item.puzzleType] ?? item.puzzleType}
                  </>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatRelative(item.timestamp)}
                {item.type === "friend_sent" && (
                  <span className="ml-2 text-primary font-medium">Tap to play</span>
                )}
              </p>
            </div>

            {item.type === "friend_sent" && (
              <ChevronRight size={14} className="text-muted-foreground/50 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
