import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Timer, Trash2, MessageSquare, Puzzle, Plus, Check, Clock, Send } from "lucide-react";

interface ConversationSummary {
  id: string;
  user_profile_id: string;
  user_name: string;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  disappearing_enabled: boolean;
  disappearing_duration: string;
}

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

const AdminDashboard = () => {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [puzzles, setPuzzles] = useState<PuzzleSummary[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearActivity, setShowClearActivity] = useState(false);
  const [clearingActivity, setClearingActivity] = useState(false);

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    try {
      const [convData, puzzleData, activityData] = await Promise.all([
        invokeMessaging("list-conversations", token),
        invokeMessaging("list-puzzles", token),
        invokeMessaging("get-activity-cleared-at", token),
      ]);
      setConversations(convData.conversations || []);
      setPuzzles(puzzleData.puzzles || []);

      const clearedAt = activityData.activity_cleared_at;
      const clearedTime = clearedAt ? new Date(clearedAt).getTime() : 0;

      // Build activity feed from puzzles
      const items: ActivityItem[] = [];

      const totalUnread = (convData.conversations || []).reduce(
        (sum: number, c: ConversationSummary) => sum + c.unread_count,
        0
      );
      if (totalUnread > 0) {
        items.push({
          id: "unread",
          type: "message",
          description: `${totalUnread} unread message${totalUnread > 1 ? "s" : ""} across conversations`,
          timestamp: new Date().toISOString(),
        });
      }

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
      setError(null);
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      if (loading) setError("Unable to load data");
    } finally {
      setLoading(false);
    }
  }, [token, user, loading, handleSessionExpired]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleClearAll = async () => {
    if (!token || clearingAll) return;
    setClearingAll(true);
    try {
      await invokeMessaging("clear-all-conversations", token);
      setShowClearAll(false);
      toast({ title: "All conversations cleared", description: "Your message history has been cleared across all conversations." });
      fetchData();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not clear conversations", description: "Please try again." });
    } finally {
      setClearingAll(false);
    }
  };

  const handleClearActivity = async () => {
    if (!token || clearingActivity) return;
    setClearingActivity(true);
    try {
      await invokeMessaging("clear-activity", token);
      setActivities([]);
      setShowClearActivity(false);
      fetchData();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not clear activity", description: "Please try again." });
    } finally {
      setClearingActivity(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const received = puzzles.filter((p) => p.sent_to === user?.id);
  const sent = puzzles.filter((p) => p.created_by === user?.id);
  const solved = received.filter((p) => p.solved_by);
  const unsolved = received.filter((p) => !p.solved_by);

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
            onClick={() => navigate("/p/conversations")}
          >
            <MessageSquare size={18} className="text-primary" />
            <span className="font-medium">Conversations</span>
            {totalUnread > 0 && (
              <span className="text-[10px] text-primary font-medium">{totalUnread} new</span>
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
            <span className="text-lg font-semibold text-foreground tabular-nums">{totalUnread}</span>
            <span className="text-[11px] text-muted-foreground/60">unread</span>
            {totalUnread > 0 && (
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
            {activities.length > 0 && !showClearActivity && (
              <button
                onClick={() => setShowClearActivity(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/30 transition-colors"
              >
                <Trash2 size={11} />
                <span>Clear</span>
              </button>
            )}
          </div>
          {showClearActivity && (
            <div className="rounded-xl bg-destructive/5 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Clear all recent activity?</p>
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={clearingActivity} onClick={handleClearActivity}>
                  {clearingActivity ? "Clearing..." : "Clear All"}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs border-border/50" onClick={() => setShowClearActivity(false)}>
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

        {/* Conversations */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-sm font-semibold text-foreground">Conversations</h3>
            {conversations.length > 0 && (
              <button
                onClick={() => setShowClearAll(!showClearAll)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/30 transition-colors"
                title="Clear all conversations"
              >
                <Trash2 size={11} />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>

          {showClearAll && (
            <div className="px-3 py-3 bg-destructive/5 rounded-xl space-y-2">
              <p className="text-xs text-destructive">
                Clear your message history across all conversations? Users will still see their copies until they clear them.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={clearingAll} onClick={handleClearAll}>
                  {clearingAll ? "Clearing..." : "Clear All History"}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs border-border/50" onClick={() => setShowClearAll(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-[11px] text-muted-foreground/40 animate-pulse">Loading...</div>
          ) : error ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchData(); }}>Retry</Button>
            </div>
          ) : conversations.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-muted-foreground/40">No conversations yet</p>
          ) : (
            <div className="rounded-xl overflow-hidden">
              {conversations.map((conv, i) => {
                const isUnread = conv.unread_count > 0;
                return (
                  <Link
                    key={conv.id}
                    to={`/p/conversation/${conv.id}`}
                    className={`flex items-center gap-3 px-3 sm:px-4 py-3.5 transition-colors ${
                      isUnread ? "bg-primary/[0.04]" : ""
                    } hover:bg-secondary/30 active:bg-secondary/50 ${
                      i > 0 ? "border-t border-border/20" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-[13px] truncate ${isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                          {conv.user_name}
                        </p>
                        {conv.disappearing_enabled && (
                          <Timer size={10} className="text-primary/60 shrink-0" />
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground/40 shrink-0 tabular-nums">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className={`mt-0.5 text-xs truncate leading-snug ${isUnread ? "text-foreground/60" : "text-muted-foreground/50"}`}>
                        {conv.last_message || "No messages yet"}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PrivateLayout>
  );
};

export default AdminDashboard;
