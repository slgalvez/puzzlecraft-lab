import { useState } from "react";
import { Timer, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const DURATION_LABELS: Record<string, string> = {
  "view-once": "View once",
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
};

interface ConversationToolbarProps {
  disappearingEnabled: boolean;
  disappearingDuration: string;
  onToggleDisappearing: (enabled: boolean, duration?: string) => Promise<void>;
  onClear: () => Promise<void>;
  clearing: boolean;
  togglingDisappearing: boolean;
}

export function ConversationToolbar({
  disappearingEnabled,
  disappearingDuration,
  onToggleDisappearing,
  onClear,
  clearing,
  togglingDisappearing,
}: ConversationToolbarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const closeAll = () => {
    setShowClearConfirm(false);
    setShowDisappearingMenu(false);
    setShowMore(false);
  };

  return (
    <>
      {/* Compact toolbar — single overflow button for secondary actions */}
      <div className="flex items-center justify-end px-3 sm:px-4 py-1 shrink-0">
        <div className="flex items-center gap-1">
          {/* Disappearing indicator (always visible when active) */}
          {disappearingEnabled && !showDisappearingMenu && !showClearConfirm && (
            <span className="text-[10px] text-primary/50 flex items-center gap-1 mr-1">
              <Timer size={9} /> {DURATION_LABELS[disappearingDuration] || disappearingDuration}
            </span>
          )}

          <button
            onClick={() => {
              setShowMore(!showMore);
              setShowClearConfirm(false);
              setShowDisappearingMenu(false);
            }}
            className="p-2 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/30 transition-colors"
            title="More options"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* More dropdown */}
      {showMore && (
        <div className="px-3 sm:px-4 py-1.5 bg-secondary/10 border-t border-border/10">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setShowClearConfirm(true); setShowMore(false); setShowDisappearingMenu(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
            <button
              onClick={() => { setShowDisappearingMenu(true); setShowMore(false); setShowClearConfirm(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] transition-colors ${
                disappearingEnabled
                  ? "text-primary/80 bg-primary/[0.06]"
                  : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/30 active:bg-secondary/50"
              }`}
            >
              <Timer size={12} />
              <span>{disappearingEnabled ? DURATION_LABELS[disappearingDuration] || disappearingDuration : "Auto-delete"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Clear confirmation */}
      {showClearConfirm && (
        <div className="px-4 py-2.5 bg-destructive/[0.04] space-y-2">
          <p className="text-[11px] text-destructive/80">
            Clear your message history? The other participant keeps their copy.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={clearing} onClick={() => { onClear(); closeAll(); }}>
              {clearing ? "Clearing..." : "Clear"}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs border-border/50" onClick={closeAll}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Disappearing menu */}
      {showDisappearingMenu && !showClearConfirm && (
        <div className="px-4 py-2.5 bg-secondary/20 space-y-2">
          <p className="text-[10px] text-muted-foreground/50">
            {disappearingEnabled ? "Messages auto-delete after the set time." : "Turn on auto-delete for new messages."}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["view-once", "1h", "24h", "7d"] as const).map((dur) => (
              <button
                key={dur}
                disabled={togglingDisappearing}
                onClick={() => { onToggleDisappearing(true, dur); closeAll(); }}
                className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                  disappearingEnabled && disappearingDuration === dur
                    ? "border-primary/40 text-primary bg-primary/[0.08]"
                    : "border-border/30 text-muted-foreground/60 hover:text-foreground hover:border-border/60"
                }`}
              >
                {DURATION_LABELS[dur]}
              </button>
            ))}
            {disappearingEnabled && (
              <button
                disabled={togglingDisappearing}
                onClick={() => { onToggleDisappearing(false); closeAll(); }}
                className="px-2.5 py-1 rounded-full text-[11px] border border-border/30 text-muted-foreground/60 hover:text-foreground hover:border-border/60 transition-colors"
              >
                Off
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
