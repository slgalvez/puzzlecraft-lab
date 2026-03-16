import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";

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

const AdminDashboard = () => {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("list-conversations", token);
      setConversations(data.conversations);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <PrivateLayout title="Overview">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conversations</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{conversations.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 relative">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Unread</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalUnread}</p>
            {totalUnread > 0 && (
              <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {conversations.filter((c) => c.last_message).length}
            </p>
          </div>
        </div>

        {/* Conversation list */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No conversations yet. Users will appear here once they send their first message.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  to={`/p/conversation/${conv.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {conv.unread_count > 0 && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <p className={`text-sm font-medium text-foreground truncate ${conv.unread_count > 0 ? "font-semibold" : ""}`}>
                        {conv.user_name}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 min-w-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                      {conv.disappearing_enabled && (
                        <Timer size={10} className="text-primary shrink-0" />
                      )}
                    </div>
                    <p className={`mt-0.5 text-xs truncate ${conv.unread_count > 0 ? "text-foreground/80" : "text-muted-foreground"}`}>
                      {conv.last_message || "No messages yet"}
                    </p>
                  </div>
                  <span className="ml-4 text-xs text-muted-foreground shrink-0">
                    {formatTime(conv.last_message_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PrivateLayout>
  );
};

export default AdminDashboard;
