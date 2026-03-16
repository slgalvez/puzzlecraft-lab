import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { MessageSquare, Gift, Plus, Check, Clock, Send } from "lucide-react";

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

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    try {
      const [convData, puzzleData] = await Promise.all([
        invokeMessaging("get-my-conversation", token),
        invokeMessaging("list-puzzles", token),
      ]);

      setUnreadCount(convData.unread_count || 0);
      setPuzzles(puzzleData.puzzles || []);

      // Build activity feed
      const items: ActivityItem[] = [];

      // Unread messages as activity
      if (convData.unread_count > 0) {
        items.push({
          id: "unread",
          type: "message",
          description: `${convData.unread_count} new message${convData.unread_count > 1 ? "s" : ""} in conversation`,
          timestamp: convData.messages?.length
            ? convData.messages[convData.messages.length - 1].created_at
            : new Date().toISOString(),
        });
      }

      // Puzzle activity
      for (const p of puzzleData.puzzles || []) {
        const label = PUZZLE_LABELS[p.puzzle_type] || p.puzzle_type;
        if (p.sent_to === user.id && p.solved_by) {
          items.push({
            id: `solved-${p.id}`,
            type: "puzzle_solved",
            description: `You solved ${p.creator_name}'s ${label}`,
            timestamp: p.solved_at || p.created_at,
          });
        } else if (p.sent_to === user.id && !p.solved_by) {
          items.push({
            id: `recv-${p.id}`,
            type: "puzzle_received",
            description: `${p.creator_name} sent you a ${label}`,
            timestamp: p.created_at,
          });
        } else if (p.created_by === user.id) {
          if (p.solved_by) {
            items.push({
              id: `their-solve-${p.id}`,
              type: "puzzle_solved",
              description: `${p.recipient_name} solved your ${label}`,
              timestamp: p.solved_at || p.created_at,
            });
          } else {
            items.push({
              id: `sent-${p.id}`,
              type: "puzzle_sent",
              description: `You sent ${p.recipient_name} a ${label}`,
              timestamp: p.created_at,
            });
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
  }, [fetchData]);

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
        return <Gift size={12} className="text-primary" />;
      case "puzzle_sent":
        return <Send size={12} className="text-muted-foreground" />;
      case "puzzle_solved":
        return <Check size={12} className="text-primary" />;
    }
  };

  return (
    <PrivateLayout title="Overview">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Hi, {user?.first_name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Here's what's happening
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto py-3 flex flex-col gap-1.5 text-xs"
            onClick={() => navigate("/p/conversation")}
          >
            <MessageSquare size={16} className="text-primary" />
            <span>Conversation</span>
            {unreadCount > 0 && (
              <span className="text-[10px] text-primary font-medium">{unreadCount} new</span>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex flex-col gap-1.5 text-xs"
            onClick={() => navigate("/p/for-you")}
          >
            <Gift size={16} className="text-primary" />
            <span>Puzzles for You</span>
            {unsolved.length > 0 && (
              <span className="text-[10px] text-primary font-medium">{unsolved.length} unsolved</span>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-auto py-3 flex flex-col gap-1.5 text-xs"
            onClick={() => navigate("/p/for-you")}
          >
            <Plus size={16} className="text-primary" />
            <span>Create Puzzle</span>
          </Button>
        </div>

        {/* Puzzle Summary */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Puzzles</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-foreground">{received.length}</p>
              <p className="text-[11px] text-muted-foreground">Received</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{solved.length}</p>
              <p className="text-[11px] text-muted-foreground">Solved</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{sent.length}</p>
              <p className="text-[11px] text-muted-foreground">Sent</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
          {loading ? (
            <p className="text-xs text-muted-foreground animate-pulse py-4 text-center">Loading…</p>
          ) : activities.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <Clock size={20} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted shrink-0">
                    {activityIcon(a.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{a.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
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
