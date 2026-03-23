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
  isFrontCamera: boolean;
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

const SNAP_MARGIN = 12;
function snapToCorner(x: number, y: number, w: number, h: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const corners = [
    { x: SNAP_MARGIN, y: 80 },
    { x: vw - w - SNAP_MARGIN, y: 80 },
    { x: SNAP_MARGIN, y: vh - h - 60 },
    { x: vw - w - SNAP_MARGIN, y: vh - h - 60 },
  ];
  let closest = corners[0];
  let minDist = Infinity;
  const cx = x + w / 2, cy = y + h / 2;
  for (const c of corners) {
    const d = Math.hypot(cx - (c.x + w / 2), cy - (c.y + h / 2));
    if (d < minDist) { minDist = d; closest = c; }
  }
  return closest;
}

export function VideoCallPIP() {
  const pip = useContext(PIPContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
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
    const rect = containerRef.current?.getBoundingClientRect();
    offset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragMoved.current = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = containerRef.current?.offsetWidth || 112;
    const h = containerRef.current?.offsetHeight || 180;
    setPos({
      x: Math.max(8, Math.min(vw - w - 8, e.clientX - offset.current.x)),
      y: Math.max(8, Math.min(vh - h - 8, e.clientY - offset.current.y)),
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragMoved.current && pos) {
      const w = containerRef.current?.offsetWidth || 112;
      const h = containerRef.current?.offsetHeight || 180;
      setPos(snapToCorner(pos.x, pos.y, w, h));
    }
  }, [pos]);

  if (!pip || !pip.active) return null;

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, transition: dragging.current ? "none" : "all 0.3s cubic-bezier(0.25,1,0.5,1)" }
    : { right: 16, top: 80, transition: "all 0.3s cubic-bezier(0.25,1,0.5,1)" };

  return (
    <div
      ref={containerRef}
      className="fixed z-[95] touch-none select-none"
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Video bubble */}
      <div
        className="w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black relative cursor-grab active:cursor-grabbing"
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
          style={pip.isFrontCamera && !pip.remoteStream ? { transform: "scaleX(-1)" } : undefined}
        />

        {pip.isCameraOff && !pip.remoteStream && (
          <div className="absolute inset-0 bg-card/80 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Call active</span>
          </div>
        )}

        {/* Duration pill */}
        {pip.callState === "connected" && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
            <span className="text-[9px] text-white/80 font-medium">{formatDuration(pip.callDuration)}</span>
          </div>
        )}

        {/* Expand icon */}
        <div className="absolute bottom-1.5 left-1.5">
          <Maximize2 size={12} className="text-white/60" />
        </div>
      </div>

      {/* End call button */}
      <div className="flex justify-center mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            hapticTap();
            pip.onEnd();
          }}
          className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center text-white shadow-lg shadow-destructive/30"
          aria-label="End call"
        >
          <PhoneOff size={14} />
        </button>
      </div>
    </div>
  );
}
