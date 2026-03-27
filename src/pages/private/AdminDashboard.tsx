import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Timer, Trash2, MessageSquare, Puzzle, Plus } from "lucide-react";
import { useNicknames } from "@/hooks/useNicknames";
import { WhatsNewBanner } from "@/components/private/WhatsNewBanner";

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
}

function cleanPreview(text: string | null): string {
  if (!text) return "No messages yet";
  if (text.startsWith("__")) return "";
  if (/\.(gif|png|jpg|jpeg|webp|mp4)(\?|$)/i.test(text)) return "Sent an image";
  if (/giphy\.com|tenor\.com/i.test(text)) return "Sent a GIF";
  if (/^https?:\/\//i.test(text)) return "Sent a link";
  if (text.length > 60) return text.slice(0, 57) + "…";
  return text;
}

const AdminDashboard = () => {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [puzzles, setPuzzles] = useState<PuzzleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const { resolve } = useNicknames(token, handleSessionExpired);

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    try {
      const [convData, puzzleData] = await Promise.all([
        invokeMessaging("list-conversations", token),
        invokeMessaging("list-puzzles", token),
      ]);
      setConversations(convData.conversations || []);
      setPuzzles(puzzleData.puzzles || []);
      setError(null);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
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
      toast({ title: "All conversations cleared" });
      fetchData();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not clear conversations" });
    } finally {
      setClearingAll(false);
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
  const unsolved = puzzles.filter((p) => p.sent_to === user?.id && !p.solved_by);

  return (
    <PrivateLayout title="Overview">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <WhatsNewBanner />

        {/* Welcome */}
        <div className="px-0.5">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            Hi, {user?.first_name}
          </h2>
          <p className="text-[12px] text-muted-foreground/50 mt-0.5">Welcome back</p>
        </div>

        {/* Conversations — primary section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare size={14} className="text-primary" />
              Conversations
              {totalUnread > 0 && (
                <span className="text-[10px] text-primary font-medium">{totalUnread} new</span>
              )}
            </h3>
            {conversations.length > 0 && (
              <button
                onClick={() => setShowClearAll(!showClearAll)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/30 transition-colors"
              >
                <Trash2 size={10} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          {showClearAll && (
            <div className="px-3 py-2.5 bg-destructive/5 rounded-lg space-y-2">
              <p className="text-xs text-destructive">Clear message history across all conversations?</p>
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={clearingAll} onClick={handleClearAll}>
                  {clearingAll ? "Clearing..." : "Clear All"}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs border-border/50" onClick={() => setShowClearAll(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-6 text-center text-[11px] text-muted-foreground/40 animate-pulse">Loading...</div>
          ) : error ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchData(); }}>Retry</Button>
            </div>
          ) : conversations.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-muted-foreground/40">No conversations yet</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-border/20">
              {conversations.map((conv, i) => {
                const isUnread = conv.unread_count > 0;
                const preview = cleanPreview(conv.last_message);
                return (
                  <Link
                    key={conv.id}
                    to={`/p/conversation/${conv.id}`}
                    className={`flex items-center gap-3 px-3 sm:px-4 py-3 transition-colors ${
                      isUnread ? "bg-primary/[0.04]" : ""
                    } hover:bg-secondary/30 active:bg-secondary/50 ${
                      i > 0 ? "border-t border-border/15" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-[13px] truncate ${isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                          {resolve(conv.user_profile_id, conv.user_name)}
                        </p>
                        {conv.disappearing_enabled && (
                          <Timer size={10} className="text-primary/60 shrink-0" />
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground/40 shrink-0 tabular-nums">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      {preview && (
                        <p className={`mt-0.5 text-xs truncate leading-snug ${isUnread ? "text-foreground/60" : "text-muted-foreground/40"}`}>
                          {preview}
                        </p>
                      )}
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

        {/* Quick action cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="flex items-center gap-3 py-3 px-3.5 rounded-xl border border-border/30 bg-secondary/10 text-xs text-foreground hover:bg-secondary/25 active:scale-[0.98] transition-all"
            onClick={() => navigate("/p/for-you")}
          >
            <Puzzle size={16} className="text-primary shrink-0" />
            <div className="text-left min-w-0">
              <span className="font-medium text-[13px]">Puzzles</span>
              {unsolved.length > 0 && (
                <p className="text-[10px] text-primary font-medium">{unsolved.length} unsolved</p>
              )}
            </div>
          </button>
          <button
            className="flex items-center gap-3 py-3 px-3.5 rounded-xl border border-border/30 bg-secondary/10 text-xs text-foreground hover:bg-secondary/25 active:scale-[0.98] transition-all"
            onClick={() => navigate("/p/for-you")}
          >
            <Plus size={16} className="text-primary shrink-0" />
            <span className="font-medium text-[13px]">Create Puzzle</span>
          </button>
        </div>
      </div>
    </PrivateLayout>
  );
};

export default AdminDashboard;
