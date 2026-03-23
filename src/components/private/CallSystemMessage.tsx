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

function formatCallDurationLong(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m} minute${m !== 1 ? "s" : ""}`;
  return `${m} minute${m !== 1 ? "s" : ""} ${s} second${s !== 1 ? "s" : ""}`;
}

function formatExpandedTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ` at ${time}`;
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
      text = "Video call";
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

      <div className="flex flex-col items-center py-1.5 relative">
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
        </div>

        {/* Expanded detail row — stacked below */}
        {expanded && (
          <div
            className="flex flex-col items-center gap-0.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {type === "ended" && duration > 0 && (
              <span className="text-[10px] text-muted-foreground/60">{formatCallDurationLong(duration)}</span>
            )}
            <span className="text-[10px] text-muted-foreground/50">{formatExpandedTime(createdAt)}</span>
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
