import { useState } from "react";
import { Timer, Trash2 } from "lucide-react";
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

  return (
    <>
      {/* Toolbar buttons */}
      <div className="flex items-center justify-end px-3 sm:px-4 py-1.5 shrink-0">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { setShowClearConfirm(!showClearConfirm); setShowDisappearingMenu(false); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
            title="Clear conversation"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={() => { setShowDisappearingMenu(!showDisappearingMenu); setShowClearConfirm(false); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
              disappearingEnabled
                ? "text-primary/80 bg-primary/[0.06]"
                : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/30 active:bg-secondary/50"
            }`}
          >
            <Timer size={12} />
            <span className="hidden sm:inline">
              {disappearingEnabled ? DURATION_LABELS[disappearingDuration] || disappearingDuration : "Auto-delete"}
            </span>
          </button>
        </div>
      </div>

      {/* Clear confirmation */}
      {showClearConfirm && (
        <div className="px-4 py-2.5 bg-destructive/[0.04] space-y-2">
          <p className="text-[11px] text-destructive/80">
            Clear your message history? The other participant keeps their copy.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={clearing} onClick={onClear}>
              {clearing ? "Clearing..." : "Clear"}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs border-border/50" onClick={() => setShowClearConfirm(false)}>
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
                onClick={() => onToggleDisappearing(true, dur)}
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
                onClick={() => onToggleDisappearing(false)}
                className="px-2.5 py-1 rounded-full text-[11px] border border-border/30 text-muted-foreground/60 hover:text-foreground hover:border-border/60 transition-colors"
              >
                Off
              </button>
            )}
          </div>
        </div>
      )}

      {/* Disappearing active indicator (compact) */}
      {disappearingEnabled && !showDisappearingMenu && !showClearConfirm && (
        <div className="px-4 py-1 bg-primary/[0.03]">
          <p className="text-[10px] text-primary/60 flex items-center gap-1">
            <Timer size={9} /> Auto-delete · {DURATION_LABELS[disappearingDuration] || disappearingDuration}
          </p>
        </div>
      )}
    </>
  );
}
