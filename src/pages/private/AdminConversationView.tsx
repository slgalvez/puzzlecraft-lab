import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { isPuzzleMessage, PuzzleMessageBubble } from "@/components/private/PuzzleMessageBubble";
import { MessageBubble } from "@/components/private/MessageBubble";
import { MessageComposer } from "@/components/private/MessageComposer";
import { ConversationToolbar } from "@/components/private/ConversationToolbar";

interface Message {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  is_disappearing: boolean;
  expires_at: string | null;
  reactions: Record<string, string[]>;
}

interface ConversationInfo {
  id: string;
  user_profile_id: string;
  admin_profile_id: string;
  user_name: string;
  disappearing_enabled: boolean;
  disappearing_duration: string;
}

const AdminConversationView = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingDisappearing, setTogglingDisappearing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const fetchConversation = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const data = await invokeMessaging("get-conversation", token, { conversation_id: conversationId });
      setConversation(data.conversation);
      setMessages(data.messages);
      setError(null);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      if (loading) setError("Unable to load conversation");
    } finally {
      setLoading(false);
    }
  }, [token, conversationId, loading, handleSessionExpired]);

  useEffect(() => {
    fetchConversation();
    pollRef.current = setInterval(fetchConversation, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!conversationId || !token) return;
    const unread = messages.some((m) => m.sender_profile_id !== user?.id && !m.read_at);
    if (unread) {
      invokeMessaging("mark-read", token, { conversation_id: conversationId }).catch(() => {});
    }
  }, [messages, conversationId, token, user?.id]);

  const handleSend = async (body: string) => {
    if (!conversationId || !token) return;
    setSending(true);
    try {
      const data = await invokeMessaging("send-message", token, {
        conversation_id: conversationId,
        message: body,
      });
      setMessages((prev) => [...prev, data.message]);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not send message", description: "Please try again." });
      throw e;
    } finally {
      setSending(false);
    }
  };

  const handleReact = async (messageId: string, reaction: string) => {
    if (!token) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = { ...(m.reactions || {}) };
        const existing = reactions[reaction] || [];
        if (existing.includes(user?.id || "")) {
          reactions[reaction] = existing.filter((id) => id !== user?.id);
          if (reactions[reaction].length === 0) delete reactions[reaction];
        } else {
          reactions[reaction] = [...existing, user?.id || ""];
        }
        return { ...m, reactions };
      })
    );
    try {
      await invokeMessaging("react-to-message", token, { message_id: messageId, reaction });
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
    }
  };

  const handleEdit = async (messageId: string, newBody: string) => {
    if (!token) return;
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, body: newBody } : m));
    try {
      await invokeMessaging("edit-message", token, { message_id: messageId, body: newBody });
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not edit message", description: "Please try again." });
      fetchConversation();
    }
  };

  const handleToggleDisappearing = async (enabled: boolean, duration?: string) => {
    if (!conversationId || !token) return;
    setTogglingDisappearing(true);
    try {
      const data = await invokeMessaging("toggle-disappearing", token, {
        conversation_id: conversationId,
        enabled,
        duration: duration || conversation?.disappearing_duration || "24h",
      });
      setConversation((prev) =>
        prev ? { ...prev, disappearing_enabled: data.disappearing_enabled, disappearing_duration: data.disappearing_duration } : prev
      );
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not update setting", description: "Please try again." });
    } finally {
      setTogglingDisappearing(false);
    }
  };

  const handleClear = async () => {
    if (!conversationId || !token || clearing) return;
    setClearing(true);
    try {
      await invokeMessaging("clear-conversation", token, { conversation_id: conversationId });
      setMessages([]);
      toast({ title: "Conversation cleared" });
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not clear conversation", description: "Please try again." });
    } finally {
      setClearing(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <PrivateLayout title="Conversation">
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </PrivateLayout>
    );
  }

  if (error) {
    return (
      <PrivateLayout title="Conversation">
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchConversation(); }}>
            Retry
          </Button>
        </div>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title={conversation?.user_name || "Conversation"} fullHeight>
      <div className="flex flex-col h-full">
        {/* Back + name bar */}
        <div className="flex items-center gap-3 border-b border-border px-3 sm:px-4 py-2.5 shrink-0">
          <Link to="/p/conversations" className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-sm font-medium text-foreground">{conversation?.user_name || "Conversation"}</span>
        </div>

        <ConversationToolbar
          disappearingEnabled={conversation?.disappearing_enabled ?? false}
          disappearingDuration={conversation?.disappearing_duration ?? "24h"}
          onToggleDisappearing={handleToggleDisappearing}
          onClear={handleClear}
          clearing={clearing}
          togglingDisappearing={togglingDisappearing}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-3 py-3 space-y-1">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">No messages in this conversation yet.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.sender_profile_id === user?.id;

              if (isPuzzleMessage(msg.body)) {
                return (
                  <PuzzleMessageBubble
                    key={msg.id}
                    body={msg.body}
                    isMine={isMine}
                    formatTime={formatTime}
                    createdAt={msg.created_at}
                  />
                );
              }

              const nextMsg = messages[i + 1];
              const showTail = !nextMsg || nextMsg.sender_profile_id !== msg.sender_profile_id || isPuzzleMessage(nextMsg.body);

              return (
                <MessageBubble
                  key={msg.id}
                  id={msg.id}
                  body={msg.body}
                  isMine={isMine}
                  createdAt={msg.created_at}
                  readAt={msg.read_at}
                  isDisappearing={msg.is_disappearing}
                  expiresAt={msg.expires_at}
                  reactions={msg.reactions || {}}
                  currentUserId={user?.id || ""}
                  formatTime={formatTime}
                  showTail={showTail}
                  onReact={handleReact}
                  onEdit={handleEdit}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <MessageComposer onSend={handleSend} sending={sending} placeholder="Reply" token={token || ""} conversationId={conversationId || null} />
      </div>
    </PrivateLayout>
  );
};

export default AdminConversationView;
