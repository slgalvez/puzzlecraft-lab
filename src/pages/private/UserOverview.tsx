import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { MessageSquare, Puzzle, Plus, Check, Clock, Send, Trash2 } from "lucide-react";
import { WhatsNewBanner } from "@/components/private/WhatsNewBanner";

interface PuzzleSummary {
  id: string;
  created_by: string;
  sent_to: string;
  puzzle_type: string;
  solved_by: string | null;
  solved_at: string | null;
  solve_time: number | null;
  created_at: string;
  creator_name?: string;
  recipient_name?: string;
}

interface ActivityItem {
  id: string;
  type: "message" | "puzzle_received" | "puzzle_sent" | "puzzle_solved";
  description: string;
  timestamp: string;
}

const PUZZLE_LABELS: Record<string, string> = {
  "word-fill": "Word Fill-In",
  cryptogram: "Cryptogram",
  crossword: "Crossword",
  "word-search": "Word Search",
};

const UserOverview = () => {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [puzzles, setPuzzles] = useState<PuzzleSummary[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityClearedAt, setActivityClearedAt] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    try {
      const [convData, puzzleData, activityData] = await Promise.all([
        invokeMessaging("get-my-conversation", token),
        invokeMessaging("list-puzzles", token),
        invokeMessaging("get-activity-cleared-at", token),
      ]);

      const clearedAt = activityData.activity_cleared_at;
      setActivityClearedAt(clearedAt);
      const clearedTime = clearedAt ? new Date(clearedAt).getTime() : 0;

      setUnreadCount(convData.unread_count || 0);
      setPuzzles(puzzleData.puzzles || []);

      // Build activity feed
      const items: ActivityItem[] = [];

      // Unread messages as activity
      if (convData.unread_count > 0) {
        const msgTime = convData.messages?.length
          ? convData.messages[convData.messages.length - 1].created_at
          : new Date().toISOString();
        if (new Date(msgTime).getTime() > clearedTime) {
          items.push({
            id: "unread",
            type: "message",
            description: `${convData.unread_count} new message${convData.unread_count > 1 ? "s" : ""} in conversation`,
            timestamp: msgTime,
          });
        }
      }

      // Puzzle activity
      for (const p of puzzleData.puzzles || []) {
        const label = PUZZLE_LABELS[p.puzzle_type] || p.puzzle_type;
        if (p.sent_to === user.id && p.solved_by) {
          const ts = p.solved_at || p.created_at;
          if (new Date(ts).getTime() > clearedTime) {
            items.push({
              id: `solved-${p.id}`,
              type: "puzzle_solved",
              description: `You solved ${p.creator_name}'s ${label}`,
              timestamp: ts,
            });
          }
        } else if (p.sent_to === user.id && !p.solved_by) {
          if (new Date(p.created_at).getTime() > clearedTime) {
            items.push({
              id: `recv-${p.id}`,
              type: "puzzle_received",
              description: `${p.creator_name} sent you a ${label}`,
              timestamp: p.created_at,
            });
          }
        } else if (p.created_by === user.id) {
          if (p.solved_by) {
            const ts = p.solved_at || p.created_at;
            if (new Date(ts).getTime() > clearedTime) {
              items.push({
                id: `their-solve-${p.id}`,
                type: "puzzle_solved",
                description: `${p.recipient_name} solved your ${label}`,
                timestamp: ts,
              });
            }
          } else {
            if (new Date(p.created_at).getTime() > clearedTime) {
              items.push({
                id: `sent-${p.id}`,
                type: "puzzle_sent",
                description: `You sent ${p.recipient_name} a ${label}`,
                timestamp: p.created_at,
              });
            }
          }
        }
      }

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items.slice(0, 10));
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
    } finally {
      setLoading(false);
    }
  }, [token, user, handleSessionExpired]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleClearActivity = async () => {
    if (!token || clearing) return;
    setClearing(true);
    try {
      await invokeMessaging("clear-activity", token);
      setActivities([]);
      setShowClearConfirm(false);
      fetchData();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
    } finally {
      setClearing(false);
    }
  };

  const received = puzzles.filter((p) => p.sent_to === user?.id);
  const sent = puzzles.filter((p) => p.created_by === user?.id);
  const solved = received.filter((p) => p.solved_by);
  const unsolved = received.filter((p) => !p.solved_by);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const activityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "message":
        return <MessageSquare size={12} className="text-primary" />;
      case "puzzle_received":
        return <Puzzle size={12} className="text-primary" />;
      case "puzzle_sent":
        return <Send size={12} className="text-muted-foreground" />;
      case "puzzle_solved":
        return <Check size={12} className="text-primary" />;
    }
  };

  return (
    <PrivateLayout title="Overview">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-10">
        {/* Welcome */}
        <div className="px-0.5">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            Hi, {user?.first_name}
          </h2>
          <p className="text-[13px] text-muted-foreground/70 mt-0.5">
            Here's what's happening
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border border-border/40 bg-secondary/20 text-xs text-foreground hover:bg-secondary/40 active:scale-[0.97] transition-all"
            onClick={() => navigate("/p/conversation")}
          >
            <MessageSquare size={18} className="text-primary" />
            <span className="font-medium">Conversation</span>
            {unreadCount > 0 && (
              <span className="text-[10px] text-primary font-medium">{unreadCount} new</span>
            )}
          </button>
          <button
            className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border border-border/40 bg-secondary/20 text-xs text-foreground hover:bg-secondary/40 active:scale-[0.97] transition-all"
            onClick={() => navigate("/p/for-you")}
          >
            <Puzzle size={18} className="text-primary" />
            <span className="font-medium">Puzzles for You</span>
            {unsolved.length > 0 && (
              <span className="text-[10px] text-primary font-medium">{unsolved.length} unsolved</span>
            )}
          </button>
          <button
            className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border border-border/40 bg-secondary/20 text-xs text-foreground hover:bg-secondary/40 active:scale-[0.97] transition-all"
            onClick={() => navigate("/p/for-you")}
          >
            <Plus size={18} className="text-primary" />
            <span className="font-medium">Create Puzzle</span>
          </button>
        </div>

        {/* Compact stats */}
        <div className="flex items-center gap-6 px-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-foreground tabular-nums">{unreadCount}</span>
            <span className="text-[11px] text-muted-foreground/60">unread</span>
            {unreadCount > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse ml-0.5" />
            )}
          </div>
          <span className="w-px h-3.5 bg-border/50" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-foreground tabular-nums">{unsolved.length}</span>
            <span className="text-[11px] text-muted-foreground/60">unsolved</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">Activity</h3>
            {activities.length > 0 && !showClearConfirm && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/30 transition-colors"
              >
                <Trash2 size={11} />
                <span>Clear</span>
              </button>
            )}
          </div>
          {showClearConfirm && (
            <div className="rounded-xl bg-destructive/5 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Clear all recent activity?</p>
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={clearing} onClick={handleClearActivity}>
                  {clearing ? "Clearing..." : "Clear All"}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs border-border/50" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {loading ? (
            <p className="text-[11px] text-muted-foreground/40 animate-pulse py-3 text-center">Loading…</p>
          ) : activities.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/40 py-1 px-0.5">Nothing new</p>
          ) : (
            <div className="space-y-px">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-1.5 py-2 rounded-lg hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted/50 shrink-0">
                    {activityIcon(a.type)}
                  </div>
                  <p className="flex-1 min-w-0 text-xs text-foreground/80 truncate">{a.description}</p>
                  <span className="text-[10px] text-muted-foreground/40 shrink-0 tabular-nums">
                    {formatTime(a.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PrivateLayout>
  );
};

export default UserOverview;
