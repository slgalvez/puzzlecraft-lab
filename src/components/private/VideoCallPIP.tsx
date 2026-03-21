import { useRef, useState, useEffect, useCallback, useContext, createContext } from "react";
import { PhoneOff, Maximize2 } from "lucide-react";
import { hapticTap } from "@/lib/haptic";

/**
 * PIP state is managed externally and passed via this context.
 * If no provider exists, PIP simply doesn't render.
 */
export interface PIPState {
  active: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  isCameraOff: boolean;
  callDuration: number;
  callState: string;
  onEnd: () => void;
  onExpand: () => void;
}

export const PIPContext = createContext<PIPState | null>(null);

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoCallPIP() {
  const pip = useContext(PIPContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pos, setPos] = useState({ x: 16, y: 80 });
  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // Attach stream to video
  useEffect(() => {
    if (!videoRef.current || !pip) return;
    const stream = pip.remoteStream || pip.localStream;
    if (stream) videoRef.current.srcObject = stream;
  }, [pip?.remoteStream, pip?.localStream]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    dragMoved.current = false;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragMoved.current = true;
    setPos({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!pip || !pip.active) return null;

  return (
    <div
      className="fixed z-[95] touch-none select-none"
      style={{ right: pos.x, top: pos.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Video bubble */}
      <div
        className="w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black relative cursor-grab active:cursor-grabbing"
        onClick={() => {
          if (!dragMoved.current) pip.onExpand();
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!pip.remoteStream}
          className="absolute inset-0 w-full h-full object-cover"
          style={!pip.remoteStream ? { transform: "scaleX(-1)" } : undefined}
        />

        {pip.isCameraOff && !pip.remoteStream && (
          <div className="absolute inset-0 bg-card/80 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Call active</span>
          </div>
        )}

        {/* Duration pill */}
        {pip.callState === "connected" && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm">
            <span className="text-[9px] text-white/80 font-medium">{formatDuration(pip.callDuration)}</span>
          </div>
        )}

        {/* Expand icon */}
        <div className="absolute bottom-1.5 left-1.5">
          <Maximize2 size={12} className="text-white/60" />
        </div>
      </div>

      {/* End call button below bubble */}
      <div className="flex justify-center mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            hapticTap();
            pip.onEnd();
          }}
          className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center text-white shadow-lg"
          aria-label="End call"
        >
          <PhoneOff size={14} />
        </button>
      </div>
    </div>
  );
}
