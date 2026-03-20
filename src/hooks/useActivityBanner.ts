import { useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { ActivityItem } from "@/components/private/ActivityBanner";

/**
 * Manages activity banner items with context-aware suppression.
 * Only one banner shows at a time. New items replace the current one.
 */
export function useActivityBanner() {
  const [currentItem, setCurrentItem] = useState<ActivityItem | null>(null);
  const location = useLocation();
  const lastShownRef = useRef<string | null>(null);
  const cooldownUntilRef = useRef<number>(0);

  const dismiss = useCallback(() => {
    setCurrentItem(null);
    cooldownUntilRef.current = Date.now() + 800;
  }, []);

  const showBanner = useCallback(
    (item: Omit<ActivityItem, "id" | "timestamp">) => {
      const now = Date.now();
      if (now < cooldownUntilRef.current) return;

      const path = location.pathname;

      // Suppress message banner if already in conversation
      if (item.type === "message") {
        if (
          path === "/p/conversation" ||
          path.startsWith("/p/conversation/") ||
          path.startsWith("/p/conversations/")
        ) {
          return;
        }
      }

      // Suppress puzzle banner if on for-you page
      if (item.type === "puzzle" && path === "/p/for-you") {
        return;
      }

      // Deduplicate: same type+sender within 15s
      const dedupeKey = `${item.type}-${item.senderName}`;
      if (dedupeKey === lastShownRef.current && now - cooldownUntilRef.current < 15_000) {
        return;
      }
      lastShownRef.current = dedupeKey;

      const id = `${item.type}-${item.senderName}-${now}`;
      setCurrentItem({ ...item, id, timestamp: now });
    },
    [location.pathname]
  );

  return { currentItem, dismiss, showBanner };
}