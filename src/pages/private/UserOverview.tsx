import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { MessageSquare, Puzzle, Plus, MapPin, ArrowRight } from "lucide-react";
import { OverviewHeaderControls } from "@/components/private/OverviewHeaderControls";
import { WhatsNewBanner } from "@/components/private/WhatsNewBanner";
import { distanceMiles, formatDistance, humanTimestamp } from "@/lib/locationUtils";

interface PuzzleSummary {
  id: string;
  created_by: string;
  sent_to: string;
  puzzle_type: string;
  solved_by: string | null;
  created_at: string;
  creator_name?: string;
}

const PUZZLE_LABELS: Record<string, string> = {
  "word-fill": "Word Fill-In",
  cryptogram: "Cryptogram",
  crossword: "Crossword",
  "word-search": "Word Search",
};

function cleanPreview(text: string | null): string {
  if (!text) return "";
  if (text.startsWith("__")) return "";
  if (/\.(gif|png|jpg|jpeg|webp|mp4)(\?|$)/i.test(text)) return "Sent an image";
  if (/giphy\.com|tenor\.com/i.test(text)) return "Sent a GIF";
  if (/^https?:\/\//i.test(text)) return "Sent a link";
  if (text.length > 50) return text.slice(0, 47) + "…";
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
  const [hasLocationActivity, setHasLocationActivity] = useState(false);
  const [locationMeta, setLocationMeta] = useState<{ name: string; dist: string | null; time: string } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);

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
      setConversationId(convData.conversation_id || null);
      const msgs = convData.messages || [];
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        setLastMessage(last.body);
        setLastMessageAt(last.created_at);
      }
      setPuzzles(puzzleData.puzzles || []);

      // Check location
      if (convData.conversation_id) {
        try {
          const locData = await invokeMessaging("get-shared-location", token, { conversation_id: convData.conversation_id });
          if (locData.incoming) {
            setHasLocationActivity(true);
            const inc = locData.incoming;
            let dist: string | null = null;
            if (myLat !== null && myLng !== null) {
              dist = formatDistance(distanceMiles(myLat, myLng, inc.latitude, inc.longitude));
            }
            setLocationMeta({
              name: convData.admin_name || "them",
              dist,
              time: humanTimestamp(inc.updated_at),
            });
          } else {
            setHasLocationActivity(false);
            setLocationMeta(null);
          }
        } catch {
          setHasLocationActivity(false);
          setLocationMeta(null);
        }
      }
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
    } finally {
      setLoading(false);
    }
  }, [token, user, handleSessionExpired]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const unsolved = puzzles.filter((p) => p.sent_to === user?.id && !p.solved_by);
  const newestUnsolved = unsolved.length > 0 ? unsolved[0] : null;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // "Active now" items — only shown when there's something live
  const activeItems: { icon: React.ReactNode; label: string; detail: string; action: () => void }[] = [];

  if (unreadCount > 0) {
    activeItems.push({
      icon: <MessageSquare size={13} className="text-primary" />,
      label: `${unreadCount} new message${unreadCount > 1 ? "s" : ""}`,
      detail: lastMessageAt ? formatTime(lastMessageAt) : "",
      action: () => navigate("/p/conversation"),
    });
  }

  if (hasLocationActivity && locationMeta) {
    const locLabel = locationMeta.dist
      ? `${locationMeta.name} · ${locationMeta.dist}`
      : `${locationMeta.name} sharing location`;
    activeItems.push({
      icon: <MapPin size={13} className="text-primary" />,
      label: locLabel,
      detail: locationMeta.time,
      action: () => navigate("/p/location"),
    });
  }

  // Contextual section
  const hasContext = unreadCount > 0 || unsolved.length > 0;
  const contextLabel = hasContext ? "Pick up where you left off" : "Start something new";

  const preview = cleanPreview(lastMessage);

  return (
    <PrivateLayout title="Overview">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
        <WhatsNewBanner />

        {/* Header */}
        <div className="px-0.5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            Hi, {user?.first_name}
          </h2>
          <OverviewHeaderControls token={token} />
        </div>

        {/* Active now — only when relevant */}
        {activeItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest px-0.5">Active now</p>
            <div className="space-y-1">
              {activeItems.map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/[0.06] hover:bg-primary/[0.1] transition-colors text-left"
                >
                  {item.icon}
                  <span className="text-xs font-medium text-foreground flex-1">{item.label}</span>
                  {item.detail && <span className="text-[10px] text-muted-foreground/40 tabular-nums">{item.detail}</span>}
                  <ArrowRight size={12} className="text-muted-foreground/30" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation card */}
        <button
          onClick={() => navigate("/p/conversation")}
          className="w-full text-left rounded-xl border border-border/20 bg-secondary/5 hover:bg-secondary/15 active:scale-[0.995] transition-all px-3.5 py-3 group"
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-primary shrink-0" />
            <span className="text-[13px] font-semibold text-foreground flex-1">Conversation</span>
            {unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
            {lastMessageAt && (
              <span className="text-[10px] text-muted-foreground/30 tabular-nums">{formatTime(lastMessageAt)}</span>
            )}
          </div>
          {preview && (
            <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5 pl-[22px]">{preview}</p>
          )}
        </button>

        {/* Contextual actions */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest px-0.5">{contextLabel}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg border border-border/20 bg-secondary/5 text-foreground hover:bg-secondary/15 active:scale-[0.98] transition-all"
              onClick={() => navigate("/p/for-you")}
            >
              <Puzzle size={14} className="text-primary shrink-0" />
              <div className="text-left min-w-0">
                <span className="text-[12px] font-medium">Puzzles</span>
                {unsolved.length > 0 && (
                  <p className="text-[10px] text-primary">{unsolved.length} unsolved</p>
                )}
              </div>
            </button>
            <button
              className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg border border-border/20 bg-secondary/5 text-foreground hover:bg-secondary/15 active:scale-[0.98] transition-all"
              onClick={() => navigate("/p/for-you")}
            >
              <Plus size={14} className="text-primary shrink-0" />
              <span className="text-[12px] font-medium">Create Puzzle</span>
            </button>
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
};

export default UserOverview;
