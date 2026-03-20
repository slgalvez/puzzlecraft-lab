import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import {
  isBannerDismissed,
  dismissBanner,
  WHATS_NEW_FEATURES,
} from "@/lib/featureHints";

export function WhatsNewBanner() {
  const [visible, setVisible] = useState(!isBannerDismissed());

  if (!visible) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="relative rounded-xl border border-border/40 bg-secondary/20 px-4 py-4 space-y-3">
        {/* Dismiss */}
        <button
          onClick={() => {
            dismissBanner();
            setVisible(false);
          }}
          className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-secondary/40 hover:text-muted-foreground"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>

        {/* Feature updates */}
        <div className="flex items-start gap-2.5 pr-6">
          <Sparkles size={14} className="shrink-0 text-primary mt-0.5" />
          <p className="text-xs text-foreground/80">
            <span className="font-medium text-foreground">New:&nbsp;</span>
            {WHATS_NEW_FEATURES.join(" · ")}
          </p>
        </div>

        {/* Notification explanation */}
        <div className="pl-[22px] space-y-1.5">
          <p className="text-[11px] text-muted-foreground/70">
            Notifications are subtle:
          </p>
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground/60">
              • Something new → new message
            </p>
            <p className="text-[11px] text-muted-foreground/60">
              • Continue session → video call
            </p>
          </div>
        </div>

        {/* Settings hint */}
        <p className="pl-[22px] text-[11px] text-muted-foreground/50">
          Manage notification style in Settings
        </p>
      </div>
    </div>
  );
}
