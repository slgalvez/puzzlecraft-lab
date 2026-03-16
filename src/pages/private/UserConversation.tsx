import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, Timer, Check, CheckCheck, Eye, Trash2 } from "lucide-react";
import { isPuzzleMessage, PuzzleMessageBubble } from "@/components/private/PuzzleMessageBubble";

interface Message {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  is_disappearing: boolean;
  expires_at: string | null;
}

const DURATION_LABELS: Record<string, string> = { "view-once": "View once", "1h": "1 hour", "24h": "24 hours", "7d": "7 days" };

const UserConversation = () => {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState("24h");
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);
  const [togglingDisappearing, setTogglingDisappearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const fetchConversation = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("get-my-conversation", token);
      setConversationId(data.conversation.id);
      setMessages(data.messages);
      setUnreadCount(data.unread_count);
      setDisappearingEnabled(data.conversation.disappearing_enabled);
      setDisappearingDuration(data.conversation.disappearing_duration);
      setError(null);
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      if (loading) setError("Unable to load conversation");
    } finally {
      setLoading(false);
    }
  }, [token, loading, handleSessionExpired]);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = newMessage.trim();
    if (!body || !conversationId || !token || sending) return;
    setSending(true);
    setNewMessage("");
    try {
      const data = await invokeMessaging("send-message", token, {
        conversation_id: conversationId,
        message: body,
      });
      setMessages((prev) => [...prev, data.message]);
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      setNewMessage(body);
      toast({ title: "Could not send message", description: "Please try again." });
    } finally {
      setSending(false);
    }
  };

  const handleToggleDisappearing = async (enabled: boolean, duration?: string) => {
    if (!conversationId || !token) return;
    setTogglingDisappearing(true);
    try {
      const data = await invokeMessaging("toggle-disappearing", token, {
        conversation_id: conversationId,
        enabled,
        duration: duration || disappearingDuration,
      });
      setDisappearingEnabled(data.disappearing_enabled);
      setDisappearingDuration(data.disappearing_duration);
      setShowDisappearingMenu(false);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not update setting", description: "Please try again." });
    } finally {
      setTogglingDisappearing(false);
    }
  };

  const handleClearConversation = async () => {
    if (!conversationId || !token || clearing) return;
    setClearing(true);
    try {
      await invokeMessaging("clear-conversation", token, { conversation_id: conversationId });
      setMessages([]);
      setShowClearConfirm(false);
      toast({ title: "Conversation cleared", description: "Your message history has been cleared." });
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
        <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchConversation(); }}>
            Retry
          </Button>
        </div>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Conversation">
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-4 sm:px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Conversation</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowClearConfirm(!showClearConfirm)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Clear conversation"
            >
              <Trash2 size={12} />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              onClick={() => setShowDisappearingMenu(!showDisappearingMenu)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                disappearingEnabled
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Timer size={12} />
              <span className="hidden sm:inline">
                {disappearingEnabled ? DURATION_LABELS[disappearingDuration] || disappearingDuration : "Auto-delete"}
              </span>
            </button>
          </div>
        </div>

        {/* Clear confirmation */}
        {showClearConfirm && (
          <div className="border-b border-border px-4 sm:px-5 py-3 bg-destructive/5 space-y-2">
            <p className="text-xs text-destructive">
              Clear your message history? The other participant will still see their copy until they clear it.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                disabled={clearing}
                onClick={handleClearConversation}
              >
                {clearing ? "Clearing..." : "Clear History"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-border"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Disappearing menu */}
        {showDisappearingMenu && !showClearConfirm && (
          <div className="border-b border-border px-4 sm:px-5 py-3 bg-secondary/30 space-y-2">
            <p className="text-xs text-muted-foreground">
              {disappearingEnabled ? "Messages auto-delete after the set duration." : "Enable auto-delete for new messages."}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {(["view-once", "1h", "24h", "7d"] as const).map((dur) => (
                <button
                  key={dur}
                  disabled={togglingDisappearing}
                  onClick={() => handleToggleDisappearing(true, dur)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    disappearingEnabled && disappearingDuration === dur
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {DURATION_LABELS[dur]}
                </button>
              ))}
              {disappearingEnabled && (
                <button
                  disabled={togglingDisappearing}
                  onClick={() => handleToggleDisappearing(false)}
                  className="px-2.5 py-1 rounded text-xs border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  Disable
                </button>
              )}
            </div>
          </div>
        )}

        {/* Disappearing active indicator */}
        {disappearingEnabled && !showDisappearingMenu && !showClearConfirm && (
          <div className="px-4 sm:px-5 py-1.5 bg-primary/5 border-b border-border">
            <p className="text-[10px] text-primary flex items-center gap-1">
              <Timer size={10} /> Auto-delete active · {DURATION_LABELS[disappearingDuration] || disappearingDuration}
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-auto px-4 sm:px-5 py-4 space-y-2.5">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                Send a message to start the conversation.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_profile_id === user?.id;

              // Render puzzle system messages as special bubbles
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

              const isViewOnce = msg.is_disappearing && msg.expires_at && msg.created_at &&
                (new Date(msg.expires_at).getTime() - new Date(msg.created_at).getTime() > 8 * 24 * 60 * 60 * 1000);
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                      {msg.is_disappearing && (
                        isViewOnce
                          ? <Eye size={8} className={isMine ? "text-primary-foreground/40" : "text-muted-foreground/60"} />
                          : <Timer size={8} className={isMine ? "text-primary-foreground/40" : "text-muted-foreground/60"} />
                      )}
                      <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {formatTime(msg.created_at)}
                      </span>
                      {isMine && (
                        msg.read_at
                          ? <CheckCheck size={10} className="text-primary-foreground/60" />
                          : <Check size={10} className="text-primary-foreground/40" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Compose */}
        <form onSubmit={handleSend} className="border-t border-border px-4 sm:px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              maxLength={5000}
              autoComplete="off"
            />
            <Button type="submit" size="sm" disabled={sending || !newMessage.trim()}>
              <Send size={14} />
            </Button>
          </div>
        </form>
      </div>
    </PrivateLayout>
  );
};

export default UserConversation;
