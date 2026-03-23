import { useEffect, useRef, useState, useCallback } from "react";
import { Video, VideoOff, Mic, MicOff, PhoneOff, SwitchCamera } from "lucide-react";
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
  onSwitchCamera?: () => void;
}

export function VideoCallScreen({
  callState,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  callDuration,
  onEndCall,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
}: VideoCallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // --- Draggable self-view state ---
  const selfViewRef = useRef<HTMLDivElement>(null);
  const [selfPos, setSelfPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!selfViewRef.current) return;
    dragging.current = true;
    dragMoved.current = false;
    const rect = selfViewRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragMoved.current = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const elW = selfViewRef.current?.offsetWidth || 112;
    const elH = selfViewRef.current?.offsetHeight || 160;
    const rawX = e.clientX - dragOffset.current.x;
    const rawY = e.clientY - dragOffset.current.y;
    // Clamp within viewport
    const x = Math.max(8, Math.min(vw - elW - 8, rawX));
    const y = Math.max(8, Math.min(vh - elH - 8, rawY));
    setSelfPos({ x, y });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

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

  const statusText = (() => {
    switch (callState) {
      case "requesting-media": return "Requesting access…";
      case "outgoing-ringing": return "Ringing…";
      case "connecting": return "Connecting…";
      case "connected": return formatDuration(callDuration);
      default: return "";
    }
  })();

  // Default self-view position (top-right) if not dragged
  const selfViewStyle: React.CSSProperties = selfPos
    ? { position: "absolute", left: selfPos.x, top: selfPos.y }
    : {
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
        right: "1rem",
      };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* Remote video — fills entire viewport, object-contain to prevent zoom/crop */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      </div>

      {/* Status overlay (ringing / connecting) */}
      {callState !== "connected" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
        </div>
      )}

      {/* Self-view PIP — draggable */}
      {localStream && (
        <div
          ref={selfViewRef}
          className="z-20 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-black touch-none select-none cursor-grab active:cursor-grabbing"
          style={selfViewStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
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
        <div
          className="absolute z-20 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
            left: "1rem",
          }}
        >
          <span className="text-xs text-white/80 font-medium">{statusText}</span>
        </div>
      )}

      {/* Floating controls — always above safe area, overlaying video */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-5 px-6 py-5"
        style={{
          paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
          background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
        }}
      >
        <button
          onClick={onToggleMute}
          className={`w-13 h-13 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm ${
            isMuted ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
          }`}
          style={{ width: 52, height: 52 }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={onToggleCamera}
          className={`rounded-full flex items-center justify-center transition-colors backdrop-blur-sm ${
            isCameraOff ? "bg-white text-black" : "bg-white/15 text-white hover:bg-white/25"
          }`}
          style={{ width: 52, height: 52 }}
          aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
        >
          {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {onSwitchCamera && (
          <button
            onClick={() => { hapticTap(); onSwitchCamera(); }}
            className="rounded-full flex items-center justify-center transition-colors backdrop-blur-sm bg-white/15 text-white hover:bg-white/25"
            style={{ width: 52, height: 52 }}
            aria-label="Switch camera"
          >
            <SwitchCamera size={20} />
          </button>
        )}

        <button
          onClick={() => { hapticTap(); onEndCall(); }}
          className="rounded-full bg-destructive flex items-center justify-center text-white hover:bg-destructive/90 transition-colors"
          style={{ width: 52, height: 52 }}
          aria-label="End call"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
