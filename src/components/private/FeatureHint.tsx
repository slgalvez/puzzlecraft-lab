import { useState, useEffect } from "react";
import { isHintSeen, markHintSeen, type HintId } from "@/lib/featureHints";

interface FeatureHintProps {
  id: HintId;
  text: string;
  /** Delay in ms before showing (default 800) */
  delay?: number;
  /** Position relative to anchor: "above" | "below" (default "above") */
  position?: "above" | "below";
}

/**
 * A small, one-time tooltip-style hint anchored to its parent.
 * Wrap the target element in a relative container and place <FeatureHint> inside.
 */
export function FeatureHint({
  id,
  text,
  delay = 800,
  position = "above",
}: FeatureHintProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isHintSeen(id)) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [id, delay]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      markHintSeen(id);
      setShow(false);
    }, 4000);
    return () => clearTimeout(t);
  }, [show, id]);

  if (!show) return null;

  const posClass =
    position === "below"
      ? "top-full mt-1.5"
      : "bottom-full mb-1.5";

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 ${posClass} z-50 whitespace-nowrap rounded-lg border border-border/50 bg-popover px-2.5 py-1 text-[11px] text-popover-foreground shadow-md animate-in fade-in zoom-in-95 duration-200 pointer-events-none`}
    >
      {text}
    </div>
  );
}
