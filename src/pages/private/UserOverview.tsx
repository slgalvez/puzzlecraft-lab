import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { MessageSquare, Puzzle, Plus } from "lucide-react";
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

function cleanPreview(text: string | null): string {
  if (!text) return "No messages yet";
  if (text.startsWith("__")) return "";
  if (/\.(gif|png|jpg|jpeg|webp|mp4)(\?|$)/i.test(text)) return "Sent an image";
  if (/giphy\.com|tenor\.com/i.test(text)) return "Sent a GIF";
  if (/^https?:\/\//i.test(text)) return "Sent a link";
  if (text.length > 60) return text.slice(0, 57) + "…";
  return text;
}

const UserOverview = () => {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);
  const [puzzles, setPuzzles] = useState<PuzzleSummary[]>([]);

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
      const msgs = convData.messages || [];
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        setLastMessage(last.body);
        setLastMessageAt(last.created_at);
      }
      setPuzzles(puzzleData.puzzles || []);
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

  const unsolved = puzzles.filter((p) => p.sent_to === user?.id && !p.solved_by);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

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

        {/* Conversation — primary section */}
        <button
          onClick={() => navigate("/p/conversation")}
          className="w-full text-left rounded-xl border border-border/30 bg-secondary/10 hover:bg-secondary/25 active:scale-[0.99] transition-all p-3.5 space-y-1"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-primary" />
              <span className="text-[13px] font-semibold text-foreground">Conversation</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="text-[10px] text-primary font-medium">{unreadCount} new</span>
              )}
              {lastMessageAt && (
                <span className="text-[10px] text-muted-foreground/40 tabular-nums">{formatTime(lastMessageAt)}</span>
              )}
            </div>
          </div>
          {lastMessage && (
            <p className="text-xs text-muted-foreground/60 truncate pl-[22px]">
              {cleanPreview(lastMessage)}
            </p>
          )}
        </button>

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

export default UserOverview;
