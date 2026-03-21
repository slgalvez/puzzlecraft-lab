import { useState, useEffect, useRef, useCallback, useMemo, MutableRefObject } from "react";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Video } from "lucide-react";
import { isPuzzleMessage, PuzzleMessageBubble } from "@/components/private/PuzzleMessageBubble";
import { MessageBubble } from "@/components/private/MessageBubble";
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

const UserConversation = () => {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [adminProfileId, setAdminProfileId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string>("Conversation");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState("24h");
  const [togglingDisappearing, setTogglingDisappearing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { containerRef: messagesContainerRef, bottomRef: messagesEndRef, markUserSent } = useChatScroll(messageIds);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const loadingRef = useRef(true);

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const { resolve, setNickname, removeNickname, nicknames } = useNicknames(token, handleSessionExpired);

  const videoCall = useVideoCall({
    token: token || "",
    conversationId,
    onSessionExpired: handleSessionExpired,
  });

  const fetchConversation = useCallback(async () => {
    if (!token) return;
    try {
      console.debug("[conversation] fetching...");
      const data = await invokeMessaging("get-my-conversation", token);
      setConversationId(data.conversation.id);
      setAdminProfileId(data.conversation.admin_profile_id);
      setAdminName(data.conversation.admin_name || "Conversation");
      setMessages(data.messages);
      setDisappearingEnabled(data.conversation.disappearing_enabled);
      setDisappearingDuration(data.conversation.disappearing_duration);
      setError(null);
      console.debug("[conversation] loaded", data.messages?.length, "messages");
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      console.warn("[conversation] fetch error:", e);
      if (loadingRef.current) setError("Unable to load conversation");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [token, handleSessionExpired]);

  // Loading failsafe: if loading persists more than 20s, show error
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("[conversation] loading timed out after 20s");
        setLoading(false);
        setError("Connection timed out — please try again");
      }
    }, 20_000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    fetchConversation();
    pollRef.current = setInterval(fetchConversation, 3000);
    return () => clearInterval(pollRef.current);
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
        duration: duration || disappearingDuration,
      });
      setDisappearingEnabled(data.disappearing_enabled);
      setDisappearingDuration(data.disappearing_duration);
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
    <PrivateLayout title={adminProfileId ? resolve(adminProfileId, adminName) : "Conversation"} fullHeight>
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
          onEndCall={videoCall.endCall}
          onToggleMute={videoCall.toggleMute}
          onToggleCamera={videoCall.toggleCamera}
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
        {/* Header with nickname + video call */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 shrink-0 justify-end">
          {adminProfileId && (
            <NicknameEditor
              contactProfileId={adminProfileId}
              currentNickname={nicknames[adminProfileId]}
              defaultName={adminName}
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
          disappearingEnabled={disappearingEnabled}
          disappearingDuration={disappearingDuration}
          onToggleDisappearing={handleToggleDisappearing}
          onClear={handleClear}
          clearing={clearing}
          togglingDisappearing={togglingDisappearing}
        />

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-1 scroll-smooth">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[13px] text-muted-foreground/40">
                Send a message to start the conversation
              </p>
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
          placeholder="Message"
          token={token || ""}
          conversationId={conversationId}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onSaveEdit={(id, body) => { handleEdit(id, body); setEditingMessage(null); }}
        />
      </div>
    </PrivateLayout>
  );
};

export default UserConversation;
