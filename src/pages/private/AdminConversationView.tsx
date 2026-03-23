import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Video } from "lucide-react";
import { isPuzzleMessage, PuzzleMessageBubble } from "@/components/private/PuzzleMessageBubble";
import { MessageBubble } from "@/components/private/MessageBubble";
import { computeMessageGroups } from "@/lib/messageGrouping";
import { MessageComposer, type EditingMessage, isGifMessage, getGifUrl } from "@/components/private/MessageComposer";
import { ConversationToolbar } from "@/components/private/ConversationToolbar";
import { isCallMessage, CallSystemMessage } from "@/components/private/CallSystemMessage";
import { useVideoCall } from "@/hooks/useVideoCall";
import { VideoCallScreen } from "@/components/private/VideoCallScreen";
import { IncomingCallBanner } from "@/components/private/IncomingCallBanner";
import { useNicknames } from "@/hooks/useNicknames";
import { NicknameEditor } from "@/components/private/NicknameEditor";

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
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { containerRef: messagesContainerRef, bottomRef: messagesEndRef, markUserSent } = useChatScroll(messageIds);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const loadingRef = useRef(true);
  const fetchInFlightRef = useRef(false);
  const lastMessagesKeyRef = useRef("");

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const { resolve, setNickname, removeNickname, nicknames } = useNicknames(token, handleSessionExpired);

  const videoCall = useVideoCall({
    token: token || "",
    conversationId: conversationId || null,
    onSessionExpired: handleSessionExpired,
  });

  const fetchConversation = useCallback(async () => {
    if (!token || !conversationId || fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    try {
      const data = await invokeMessaging("get-conversation", token, { conversation_id: conversationId });
      const nextMessages = Array.isArray(data.messages) ? data.messages : [];
      const nextMessagesKey = nextMessages.map((message) => `${message.id}:${message.read_at ?? ""}:${message.body}:${JSON.stringify(message.reactions ?? {})}`).join("|");

      setConversation(data.conversation);
      if (lastMessagesKeyRef.current !== nextMessagesKey) {
        lastMessagesKeyRef.current = nextMessagesKey;
        setMessages(nextMessages);
      }
      setError(null);
      console.debug("[admin-conversation] loaded", nextMessages.length, "messages");
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      if (loadingRef.current) setError("Unable to load conversation");
    } finally {
      fetchInFlightRef.current = false;
      loadingRef.current = false;
      setLoading(false);
    }
  }, [token, conversationId, handleSessionExpired]);

  useEffect(() => {
    fetchConversation();
    pollRef.current = setInterval(fetchConversation, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchConversation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchConversation]);

  // (scroll handled by useChatScroll hook)

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
    markUserSent();
    try {
      const data = await invokeMessaging("send-message", token, {
        conversation_id: conversationId,
        message: body,
      });
      setMessages((prev) => prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]);
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

  const handleStartEdit = useCallback((messageId: string, body: string) => {
    setEditingMessage({ id: messageId, body });
  }, []);

  const handleUnsend = async (messageId: string) => {
    if (!token) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await invokeMessaging("unsend-message", token, { message_id: messageId });
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not unsend message", description: "Please try again." });
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

  const allImageUrls = useMemo(
    () => messages.filter((m) => isGifMessage(m.body)).map((m) => getGifUrl(m.body)),
    [messages]
  );

  const groupInfo = useMemo(() => computeMessageGroups(messages), [messages]);

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
    <PrivateLayout title={conversation ? resolve(conversation.user_profile_id, conversation.user_name) : "Conversation"} fullHeight>
      {/* Video call overlays */}
      {videoCall.callState !== "idle" && videoCall.callState !== "ended" && (
        <VideoCallScreen
          callState={videoCall.callState}
          localStream={videoCall.localStream}
          remoteStream={videoCall.remoteStream}
          isMuted={videoCall.isMuted}
          isCameraOff={videoCall.isCameraOff}
          callDuration={videoCall.callDuration}
          endReason={videoCall.endReason}
          connectionQuality={videoCall.connectionQuality}
          onEndCall={videoCall.endCall}
          onToggleMute={videoCall.toggleMute}
          onToggleCamera={videoCall.toggleCamera}
          onSwitchCamera={videoCall.switchCamera}
        />
      )}
      {videoCall.incomingCall && videoCall.callState === "idle" && (
        <IncomingCallBanner
          call={videoCall.incomingCall}
          resolvedCallerName={resolve(videoCall.incomingCall.callerProfileId, videoCall.incomingCall.callerName)}
          onAccept={videoCall.acceptCall}
          onDecline={videoCall.declineCall}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Back + name bar */}
        <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 shrink-0">
          <Link to="/p/conversations" className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 -ml-1">
            <ArrowLeft size={18} />
          </Link>
          <span className="text-[15px] font-semibold text-foreground flex-1 tracking-tight">
            {conversation ? resolve(conversation.user_profile_id, conversation.user_name) : "Conversation"}
          </span>
          {conversation && (
            <NicknameEditor
              contactProfileId={conversation.user_profile_id}
              currentNickname={nicknames[conversation.user_profile_id]}
              defaultName={conversation.user_name}
              onSave={setNickname}
              onRemove={removeNickname}
            />
          )}
          <button
            onClick={videoCall.startCall}
            disabled={videoCall.callState !== "idle"}
            className="p-2 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-secondary/30 transition-colors disabled:opacity-30"
            title="Start video call"
          >
            <Video size={18} />
          </button>
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
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-1 scroll-smooth">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[13px] text-muted-foreground/40">No messages in this conversation yet</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.sender_profile_id === user?.id;

              if (isCallMessage(msg.body)) {
                return (
                  <CallSystemMessage
                    key={msg.id}
                    body={msg.body}
                    formatTime={formatTime}
                    createdAt={msg.created_at}
                    onCallBack={videoCall.callState === "idle" ? videoCall.startCall : undefined}
                  />
                );
              }

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
                  onStartEdit={handleStartEdit}
                  onUnsend={handleUnsend}
                  allImageUrls={allImageUrls}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <MessageComposer
          onSend={handleSend}
          sending={sending}
          placeholder="Reply"
          token={token || ""}
          conversationId={conversationId || null}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onSaveEdit={(id, body) => { handleEdit(id, body); setEditingMessage(null); }}
        />
      </div>
    </PrivateLayout>
  );
};

export default AdminConversationView;
