import { useEffect, useRef } from "react";
import { Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react";
import type { CallState } from "@/hooks/useVideoCall";
import { hapticTap } from "@/lib/haptic";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VideoCallScreenProps {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;
  endReason: string | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onDismiss: () => void;
}

export function VideoCallScreen({
  callState,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  callDuration,
  endReason,
  onEndCall,
  onToggleMute,
  onToggleCamera,
  onDismiss,
}: VideoCallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isActive = callState !== "ended" && callState !== "idle";

  const statusText = (() => {
    switch (callState) {
      case "requesting-media": return "Requesting access…";
      case "outgoing-ringing": return "Ringing…";
      case "connecting": return "Connecting…";
      case "connected": return formatDuration(callDuration);
      case "ended":
        if (endReason === "declined") return "Call declined";
        if (endReason === "missed") return "No answer";
        if (endReason === "canceled") return "Call canceled";
        if (endReason === "normal") return "Call ended";
        return endReason || "Call ended";
      default: return "";
    }
  })();

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Remote video (full background) */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Status overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {callState !== "connected" && (
            <div className="text-center">
              <p className="text-white/90 text-lg font-medium drop-shadow-lg">{statusText}</p>
              {callState === "outgoing-ringing" && (
                <div className="mt-3 flex justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0s" }} />
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Self-view (picture-in-picture) */}
        {localStream && (
          <div className="absolute top-4 right-4 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {isCameraOff && (
              <div className="absolute inset-0 bg-card flex items-center justify-center">
                <VideoOff size={20} className="text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {/* Connected duration pill */}
        {callState === "connected" && (
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
            <span className="text-xs text-white/80 font-medium">{statusText}</span>
          </div>
        )}
      </div>

      {/* Controls bar */}
      {isActive ? (
        <div className="shrink-0 bg-black/90 backdrop-blur-sm px-6 py-5 flex items-center justify-center gap-6"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
            }`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            onClick={onToggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isCameraOff ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
            }`}
            aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>

          <button
            onClick={() => { hapticTap(); onEndCall(); }}
            className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center text-white hover:bg-destructive/90 transition-colors"
            aria-label="End call"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      ) : (
        <div className="shrink-0 bg-black/90 backdrop-blur-sm px-6 py-5 flex items-center justify-center"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            onClick={onDismiss}
            className="px-6 py-2.5 rounded-full bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
