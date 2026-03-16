import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, Plus, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface UserOption {
  id: string;
  first_name: string;
  last_name: string;
  profile_id: string;
  is_active: boolean;
  role: string;
}

const DURATION_LABELS: Record<string, string> = {
  "view-once": "View once",
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
};

const AdminConversations = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("list-conversations", token);
      setConversations(data.conversations);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const fetchUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const data = await invokeMessaging("list-users", token);
      setUsers(
        (data.users || [])
          .filter((u: UserOption) => u.role !== "admin" && u.is_active)
          .map((u: UserOption) => ({
            ...u,
            profile_id: u.profile_id || u.id,
          }))
      );
    } catch {
      // silent
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenNew = () => {
    setShowNewDialog(true);
    fetchUsers();
  };

  const handleStartConversation = async (userProfileId: string) => {
    if (!token || starting) return;
    setStarting(userProfileId);
    try {
      const data = await invokeMessaging("start-conversation", token, {
        user_profile_id: userProfileId,
      });
      setShowNewDialog(false);
      navigate(`/p/conversation/${data.conversation_id}`);
    } catch {
      // silent
    } finally {
      setStarting(null);
    }
  };

  const existingUserIds = new Set(conversations.map((c) => c.user_profile_id));
  const availableUsers = users.filter((u) => !existingUserIds.has(u.profile_id));

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <PrivateLayout title="Conversations">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            All Conversations
          </h2>
          <Button size="sm" variant="outline" onClick={handleOpenNew} className="gap-1.5 text-xs">
            <Plus size={14} />
            New
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No conversations yet. Click "New" to start one.
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
                        conv.disappearing_duration === "view-once"
                          ? <Eye size={10} className="text-primary shrink-0" />
                          : <Timer size={10} className="text-primary shrink-0" />
                      )}
                    </div>
                    <p className={`mt-0.5 text-xs truncate ${conv.unread_count > 0 ? "text-foreground/80" : "text-muted-foreground"}`}>
                      {conv.last_message || "No messages yet"}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conv.last_message_at)}
                    </span>
                    {conv.disappearing_enabled && (
                      <span className="text-[10px] text-primary">
                        {DURATION_LABELS[conv.disappearing_duration] || conv.disappearing_duration}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Start a conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-64 overflow-auto">
            {loadingUsers ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading users...</p>
            ) : availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {users.length === 0 ? "No users found." : "All users already have a conversation."}
              </p>
            ) : (
              availableUsers.map((u) => (
                <button
                  key={u.profile_id}
                  onClick={() => handleStartConversation(u.profile_id)}
                  disabled={starting === u.profile_id}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-left hover:bg-secondary/60 transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-foreground">
                    {u.first_name} {u.last_name}
                  </span>
                  {starting === u.profile_id && (
                    <span className="text-xs text-muted-foreground">Starting...</span>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PrivateLayout>
  );
};

export default AdminConversations;
