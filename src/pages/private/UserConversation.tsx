import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Timer, Check, CheckCheck, Eye } from "lucide-react";

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
  const { user, token } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState("24h");
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);
  const [togglingDisappearing, setTogglingDisappearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const fetchConversation = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("get-my-conversation", token);
      setConversationId(data.conversation.id);
      setMessages(data.messages);
      setUnreadCount(data.unread_count);
      setDisappearingEnabled(data.conversation.disappearing_enabled);
      setDisappearingDuration(data.conversation.disappearing_duration);
    } catch {
      // Silently fail on poll
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConversation();
    pollRef.current = setInterval(fetchConversation, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!conversationId || !token) return;
    const unread = messages.some((m) => m.sender_profile_id !== user?.id && !m.read_at);
    if (unread) {
      invokeMessaging("mark-read", token, { conversation_id: conversationId }).catch(() => {});
    }
  }, [messages, conversationId, token, user?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !token || sending) return;
    setSending(true);
    try {
      const data = await invokeMessaging("send-message", token, {
        conversation_id: conversationId,
        message: newMessage.trim(),
      });
      setMessages((prev) => [...prev, data.message]);
      setNewMessage("");
    } catch {
      // Could show error toast
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
    } catch {
      // fail silently
    } finally {
      setTogglingDisappearing(false);
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
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Conversation">
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Conversation</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowDisappearingMenu(!showDisappearingMenu)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
              disappearingEnabled
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Timer size={12} />
            {disappearingEnabled ? DURATION_LABELS[disappearingDuration] || disappearingDuration : "Auto-delete"}
          </button>
        </div>

        {/* Disappearing menu */}
        {showDisappearingMenu && (
          <div className="border-b border-border px-5 py-3 bg-secondary/30 space-y-2">
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
        {disappearingEnabled && !showDisappearingMenu && (
          <div className="px-5 py-1.5 bg-primary/5 border-b border-border">
            <p className="text-[10px] text-primary flex items-center gap-1">
              <Timer size={10} /> Auto-delete active · {DURATION_LABELS[disappearingDuration] || disappearingDuration}
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-auto p-5 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                Send a message to start the conversation.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_profile_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3.5 py-2.5 ${
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                      {msg.is_disappearing && (
                        <Timer size={8} className={isMine ? "text-primary-foreground/40" : "text-muted-foreground/60"} />
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
        <form onSubmit={handleSend} className="border-t border-border px-5 py-3 shrink-0">
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
