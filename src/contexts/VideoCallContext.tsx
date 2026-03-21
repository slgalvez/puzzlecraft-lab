/**
 * Global video call context — lifts call state above individual conversation pages
 * so calls persist across navigation (PIP mode).
 */
import { createContext, useContext, useCallback, useEffect, useRef } from "react";
import { useVideoCall, type CallState, type IncomingCallInfo } from "@/hooks/useVideoCall";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

interface VideoCallContextType {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;
  endReason: string | null;
  incomingCall: IncomingCallInfo | null;
  /** The conversation ID this call belongs to */
  activeConversationId: string | null;
  startCall: () => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  /** Set which conversation the call UI should bind to */
  setConversationId: (id: string | null) => void;
  /** Whether PIP mode should show (active call + not on full call screen) */
  showPIP: boolean;
  /** Go to full-screen call view */
  expandCall: () => void;
}

const VideoCallContext = createContext<VideoCallContextType | null>(null);

export function VideoCallProvider({ children }: { children: React.ReactNode }) {
  const { token, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const conversationIdRef = useRef<string | null>(null);
  const activeConvIdState = useRef<string | null>(null);

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const videoCall = useVideoCall({
    token: token || "",
    conversationId: conversationIdRef.current,
    onSessionExpired: handleSessionExpired,
  });

  // Auto-navigate back when call ends (no "Call ended" screen)
  const prevCallState = useRef<CallState>("idle");
  useEffect(() => {
    if (prevCallState.current !== "ended" && videoCall.callState === "ended") {
      // Immediately reset to idle — no "Call ended" screen
      const timer = setTimeout(() => {
        videoCall.dismissEnd();
      }, 100);
      return () => clearTimeout(timer);
    }
    prevCallState.current = videoCall.callState;
  }, [videoCall.callState, videoCall.dismissEnd]);

  const setConversationId = useCallback((id: string | null) => {
    conversationIdRef.current = id;
    activeConvIdState.current = id;
  }, []);

  const isInCallActive = videoCall.callState !== "idle" && videoCall.callState !== "ended";
  const isOnConversationPage = location.pathname.startsWith("/p/conversation");

  // Show PIP when there's an active call and user navigated away from conversation
  const showPIP = isInCallActive && !isOnConversationPage;

  const expandCall = useCallback(() => {
    const convId = activeConvIdState.current;
    if (!convId) return;
    // Navigate to the conversation page
    // We don't know if admin or user, so check current user role
    navigate(`/p/conversation`);
  }, [navigate]);

  return (
    <VideoCallContext.Provider
      value={{
        callState: videoCall.callState,
        localStream: videoCall.localStream,
        remoteStream: videoCall.remoteStream,
        isMuted: videoCall.isMuted,
        isCameraOff: videoCall.isCameraOff,
        callDuration: videoCall.callDuration,
        endReason: videoCall.endReason,
        incomingCall: videoCall.incomingCall,
        activeConversationId: activeConvIdState.current,
        startCall: videoCall.startCall,
        acceptCall: videoCall.acceptCall,
        declineCall: videoCall.declineCall,
        endCall: videoCall.endCall,
        toggleMute: videoCall.toggleMute,
        toggleCamera: videoCall.toggleCamera,
        setConversationId,
        showPIP,
        expandCall,
      }}
    >
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCallContext() {
  const ctx = useContext(VideoCallContext);
  if (!ctx) throw new Error("useVideoCallContext must be used within VideoCallProvider");
  return ctx;
}
