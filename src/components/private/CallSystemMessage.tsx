import { useState, useRef, useCallback } from "react";
import { Phone, PhoneMissed, PhoneOff, Video } from "lucide-react";
import { hapticTap } from "@/lib/haptic";

/** Detect call system messages */
export function isCallMessage(body: string): boolean {
  return body.startsWith("__CALL__:");
}

interface CallSystemMessageProps {
  body: string;
  formatTime: (iso: string) => string;
  createdAt: string;
  onCallBack?: () => void;
}

function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function CallSystemMessage({ body, formatTime, createdAt, onCallBack }: CallSystemMessageProps) {
  const parts = body.replace("__CALL__:", "").split(":");
  const type = parts[0];
  const duration = parts[1] ? parseInt(parts[1]) : 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pressed, setPressed] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const didLongPress = useRef(false);

  const openMenu = useCallback(() => {
    hapticTap();
    setMenuOpen(true);
  }, []);

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    setPressed(true);
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (onCallBack) openMenu();
      setPressed(false);
    }, 500);
  }, [onCallBack, openMenu]);

  const handlePointerUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
    setPressed(false);
    if (!didLongPress.current) {
      setExpanded((prev) => !prev);
    }
  }, []);

  const handlePointerCancel = useCallback(() => {
    clearTimeout(longPressTimer.current);
    setPressed(false);
  }, []);

  const handlePointerMove = useCallback(() => {
    // Cancel long press if finger moves (avoid conflicting with scroll)
    clearTimeout(longPressTimer.current);
    setPressed(false);
  }, []);

  const handleCallBack = useCallback(() => {
    setMenuOpen(false);
    onCallBack?.();
  }, [onCallBack]);

  let icon: React.ReactNode;
  let text: string;

  switch (type) {
    case "missed":
      icon = <PhoneMissed size={12} className="text-destructive" />;
      text = "Missed video call";
      break;
    case "declined":
      icon = <PhoneOff size={12} className="text-muted-foreground" />;
      text = "Declined video call";
      break;
    case "canceled":
      icon = <PhoneOff size={12} className="text-muted-foreground" />;
      text = "Canceled video call";
      break;
    case "ended":
      icon = <Video size={12} className="text-primary" />;
      text = duration > 0 ? `Video call · ${formatCallDuration(duration)}` : "Video call ended";
      break;
    default:
      icon = <Phone size={12} className="text-muted-foreground" />;
      text = "Video call";
  }

  return (
    <>
      {/* Backdrop overlay when menu is open */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-[2px] animate-fade-in"
          style={{ animationDuration: "150ms" }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="flex justify-center py-1.5 relative">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/60 border border-border/50 select-none touch-none transition-transform duration-150 ${
            pressed ? "scale-105" : ""
          } ${menuOpen ? "z-[81] scale-105 shadow-lg ring-1 ring-primary/20" : ""} ${
            onCallBack ? "cursor-pointer" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerMove={handlePointerMove}
          onContextMenu={(e) => e.preventDefault()}
        >
          {icon}
          <span className="text-[11px] text-muted-foreground">{text}</span>
          {!expanded && (
            <span className="text-[10px] text-muted-foreground/60">{formatTime(createdAt)}</span>
          )}
        </div>

        {/* Expanded detail row */}
        {expanded && (
          <div className="flex items-center justify-center gap-2 mt-1 animate-fade-in" style={{ animationDuration: "150ms" }}>
            <span className="text-[10px] text-muted-foreground/70">{formatTime(createdAt)}</span>
            {type === "ended" && duration > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground/30">·</span>
                <span className="text-[10px] text-muted-foreground/70">Duration: {formatCallDuration(duration)}</span>
              </>
            )}
          </div>
        )}

        {/* Context menu */}
        {menuOpen && (
          <div
            className="absolute z-[82] bottom-full mb-1.5 animate-scale-in"
            style={{ animationDuration: "150ms" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-popover border border-border rounded-xl shadow-xl overflow-hidden min-w-[140px]">
              <button
                onClick={handleCallBack}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <Video size={15} className="text-primary" />
                <span>Call back</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
