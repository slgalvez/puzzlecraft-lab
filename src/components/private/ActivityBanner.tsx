import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Puzzle, X } from "lucide-react";

export type ActivityType = "message" | "puzzle";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  senderName: string;
  preview?: string;
  navigateTo?: string;
  timestamp: number;
}

interface ActivityBannerProps {
  item: ActivityItem | null;
  onDismiss: () => void;
}

const ICON_MAP: Record<ActivityType, typeof MessageSquare> = {
  message: MessageSquare,
  puzzle: Puzzle,
};

const LABEL_MAP: Record<ActivityType, string> = {
  message: "New Message",
  puzzle: "New Puzzle",
};

const AUTO_DISMISS_MS = 4000;

export function ActivityBanner({ item, onDismiss }: ActivityBannerProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<ActivityItem | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const exitTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    setVisible(false);
    exitTimerRef.current = setTimeout(() => {
      setCurrent(null);
      onDismiss();
    }, 320);
  }, [onDismiss]);

  useEffect(() => {
    clearTimeout(dismissTimerRef.current);
    clearTimeout(exitTimerRef.current);

    if (item) {
      setCurrent(item);
      requestAnimationFrame(() => setVisible(true));
      dismissTimerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    } else {
      if (current) dismiss();
    }

    return () => {
      clearTimeout(dismissTimerRef.current);
      clearTimeout(exitTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  if (!current) return null;

  const Icon = ICON_MAP[current.type];
  const label = LABEL_MAP[current.type];

  const handleTap = () => {
    clearTimeout(dismissTimerRef.current);
    if (current.navigateTo) {
      navigate(current.navigateTo);
    }
    dismiss();
  };

  return (
    <div
      className={`fixed left-0 right-0 z-[85] px-3 pb-3 transition-all duration-300 ease-out ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-full pointer-events-none"
      }`}
      style={{
        top: "env(safe-area-inset-top, 0px)",
        paddingTop: "0.75rem",
      }}
    >
      <div
        className="max-w-sm mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150"
        onClick={handleTap}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleTap()}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {current.senderName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {current.preview || label}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearTimeout(dismissTimerRef.current);
              dismiss();
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/60 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}