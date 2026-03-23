import { useEffect, useRef, useState, useCallback } from "react";
import { Video, VideoOff, Mic, MicOff, PhoneOff, SwitchCamera } from "lucide-react";
import type { CallState } from "@/hooks/useVideoCall";
import { hapticTap } from "@/lib/haptic";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type ConnectionQuality = "good" | "fair" | "poor" | "unknown";

interface VideoCallScreenProps {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isFrontCamera?: boolean;
  callDuration: number;
  endReason: string | null;
  connectionQuality?: ConnectionQuality;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera?: () => void;
}

// Snap self-view to nearest screen corner
const SNAP_MARGIN = 12;
function snapToCorner(x: number, y: number, elW: number, elH: number): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const safeTop = 64;
  const safeBottom = 108;

  const corners = [
    { x: SNAP_MARGIN, y: safeTop },
    { x: vw - elW - SNAP_MARGIN, y: safeTop },
    { x: SNAP_MARGIN, y: vh - elH - safeBottom },
    { x: vw - elW - SNAP_MARGIN, y: vh - elH - safeBottom },
  ];

  let closest = corners[0];
  let minDist = Infinity;
  const cx = x + elW / 2;
  const cy = y + elH / 2;

  for (const c of corners) {
    const d = Math.hypot(cx - (c.x + elW / 2), cy - (c.y + elH / 2));
    if (d < minDist) {
      minDist = d;
      closest = c;
    }
  }
  return closest;
}

function QualityIndicator({ quality }: { quality: ConnectionQuality }) {
  if (quality === "unknown") return null;
  const color = quality === "good" ? "bg-green-500" : quality === "fair" ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-[9px] text-white/60 font-medium capitalize">{quality}</span>
    </div>
  );
}

export function VideoCallScreen({
  callState,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  isFrontCamera = true,
  callDuration,
  connectionQuality = "unknown",
  onEndCall,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
}: VideoCallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // ── Controls auto-hide ──
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(controlsTimer.current);
    if (callState === "connected") {
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  }, [callState]);

  useEffect(() => {
    showControls();
    return () => clearTimeout(controlsTimer.current);
  }, [callState, showControls]);

  const handleScreenTap = useCallback(() => {
    if (callState !== "connected") return;
    if (controlsVisible) {
      clearTimeout(controlsTimer.current);
      setControlsVisible(false);
    } else {
      showControls();
    }
  }, [callState, controlsVisible, showControls]);

  // ── Draggable self-view with corner snap + shrink ──
  const selfViewRef = useRef<HTMLDivElement>(null);
  const [selfPos, setSelfPos] = useState<{ x: number; y: number } | null>(null);
  const [selfShrunken, setSelfShrunken] = useState(false);
  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const shrinkTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastSelfTap = useRef(0);

  const resetShrinkTimer = useCallback(() => {
    setSelfShrunken(false);
    clearTimeout(shrinkTimer.current);
    shrinkTimer.current = setTimeout(() => setSelfShrunken(true), 6000);
  }, []);

  useEffect(() => {
    if (callState === "connected") resetShrinkTimer();
    return () => clearTimeout(shrinkTimer.current);
  }, [callState, resetShrinkTimer]);

  const handleSelfPointerDown = useCallback((e: React.PointerEvent) => {
    if (!selfViewRef.current) return;
    dragging.current = true;
    dragMoved.current = false;
    const rect = selfViewRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    resetShrinkTimer();
  }, [resetShrinkTimer]);

  const handleSelfPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragMoved.current = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const elW = selfViewRef.current?.offsetWidth || 112;
    const elH = selfViewRef.current?.offsetHeight || 160;
    const rawX = e.clientX - dragOffset.current.x;
    const rawY = e.clientY - dragOffset.current.y;
    setSelfPos({
      x: Math.max(8, Math.min(vw - elW - 8, rawX)),
      y: Math.max(8, Math.min(vh - elH - 8, rawY)),
    });
  }, []);

  const handleSelfPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    // Snap to nearest corner after drag
    if (dragMoved.current && selfPos) {
      const elW = selfViewRef.current?.offsetWidth || 112;
      const elH = selfViewRef.current?.offsetHeight || 160;
      setSelfPos(snapToCorner(selfPos.x, selfPos.y, elW, elH));
    }

    // Tap (not drag) interactions
    if (!dragMoved.current) {
      const now = Date.now();
      if (now - lastSelfTap.current < 300 && onSwitchCamera) {
        hapticTap();
        onSwitchCamera();
        lastSelfTap.current = 0;
      } else {
        lastSelfTap.current = now;
        setSelfShrunken(false);
        resetShrinkTimer();
      }
    }
  }, [selfPos, onSwitchCamera, resetShrinkTimer]);

  // ── Attach streams ──
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // ── Status text ──
  const statusText = (() => {
    switch (callState) {
      case "requesting-media": return "Requesting access…";
      case "outgoing-ringing": return "Ringing…";
      case "connecting": return "Connecting…";
      case "connected": return formatDuration(callDuration);
      default: return "";
    }
  })();

  // ── Entry transition ──
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setEntered(true));
  }, []);

  // Self-view style with snap transition
  const selfViewStyle: React.CSSProperties = selfPos
    ? {
        position: "absolute",
        left: selfPos.x,
        top: selfPos.y,
        transition: dragging.current ? "none" : "all 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
      }
    : {
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0px) + 4.5rem)",
        right: "0.75rem",
        transition: "all 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
      };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black flex flex-col transition-opacity duration-300 ${entered ? "opacity-100" : "opacity-0"}`}
      style={{ height: "100dvh", paddingTop: "env(safe-area-inset-top, 0px)" }}
      onClick={handleScreenTap}
    >
      {/* Remote video — full viewport, object-contain to prevent crop */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      </div>

      {/* Status overlay for non-connected states */}
      {callState !== "connected" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-4">
              <Video size={28} className="text-white/80" />
            </div>
            <p className="text-white/90 text-lg font-medium drop-shadow-lg">{statusText}</p>
            {(callState === "outgoing-ringing" || callState === "connecting") && (
              <div className="mt-3 flex justify-center gap-1.5">
                {[0, 0.2, 0.4].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 rounded-full bg-white/50 animate-pulse"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Self-view PIP — draggable, snaps to corners, shrinks on inactivity */}
      {localStream && (
        <div
          ref={selfViewRef}
          className={`z-20 rounded-2xl overflow-hidden border border-white/20 bg-black touch-none select-none cursor-grab active:cursor-grabbing transition-all duration-300 ${
            selfShrunken
              ? "w-20 h-28 sm:w-24 sm:h-32 opacity-60 shadow-lg"
              : "w-28 h-40 sm:w-32 sm:h-44 opacity-100 shadow-2xl"
          }`}
          style={selfViewStyle}
          onPointerDown={handleSelfPointerDown}
          onPointerMove={handleSelfPointerMove}
          onPointerUp={handleSelfPointerUp}
          onClick={(e) => e.stopPropagation()}
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

      {/* Top bar — duration pill + connection quality */}
      <div
        className={`absolute z-20 left-0 right-0 flex items-center justify-between px-4 transition-all duration-300 ${
          controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {callState === "connected" ? (
          <>
            <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md">
              <span className="text-xs text-white/80 font-medium">{statusText}</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md">
              <QualityIndicator quality={connectionQuality} />
            </div>
          </>
        ) : (
          <div />
        )}
      </div>

      {/* Bottom controls — auto-hide with fade + slide */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-4 px-6 py-5 transition-all duration-300 ${
          controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{
          paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
          background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => { hapticTap(); onToggleMute(); showControls(); }}
          className={`rounded-full flex items-center justify-center transition-all backdrop-blur-md ${
            isMuted ? "bg-white text-black shadow-lg" : "bg-white/15 text-white hover:bg-white/25"
          }`}
          style={{ width: 52, height: 52 }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={() => { hapticTap(); onToggleCamera(); showControls(); }}
          className={`rounded-full flex items-center justify-center transition-all backdrop-blur-md ${
            isCameraOff ? "bg-white text-black shadow-lg" : "bg-white/15 text-white hover:bg-white/25"
          }`}
          style={{ width: 52, height: 52 }}
          aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
        >
          {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {onSwitchCamera && (
          <button
            onClick={() => { hapticTap(); onSwitchCamera(); showControls(); }}
            className="rounded-full flex items-center justify-center transition-all backdrop-blur-md bg-white/15 text-white hover:bg-white/25"
            style={{ width: 52, height: 52 }}
            aria-label="Switch camera"
          >
            <SwitchCamera size={20} />
          </button>
        )}

        <button
          onClick={() => { hapticTap(); onEndCall(); }}
          className="rounded-full bg-destructive flex items-center justify-center text-white hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/30"
          style={{ width: 56, height: 56 }}
          aria-label="End call"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
