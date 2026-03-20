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
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground/80 animate-in fade-in slide-in-from-top-2 duration-300">
      <Sparkles size={14} className="shrink-0 text-primary" />
      <p className="min-w-0 flex-1">
        <span className="font-medium text-foreground">New:&nbsp;</span>
        {WHATS_NEW_FEATURES.join(" · ")}
      </p>
      <button
        onClick={() => {
          dismissBanner();
          setVisible(false);
        }}
        className="shrink-0 rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-secondary/40 hover:text-muted-foreground"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
