import { useRef, useEffect, useCallback } from "react";

/**
 * iMessage-like chat scroll behavior:
 * - Instant scroll to bottom on first load
 * - Smooth scroll to bottom when new messages arrive (only if user is near bottom)
 * - Preserve scroll position when older messages are prepended via polling
 */
export function useChatScroll(messageIds: string[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const prevIdsRef = useRef<string[]>([]);
  const userSentRef = useRef(false);

  /** Call this right before sending a message to force scroll-to-bottom */
  const markUserSent = useCallback(() => {
    userSentRef.current = true;
  }, []);

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    // Within 120px of the bottom = "near bottom"
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (messageIds.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // First load: instant scroll to bottom
    if (!initialScrollDone.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
      initialScrollDone.current = true;
      prevIdsRef.current = messageIds;
      return;
    }

    const prevIds = prevIdsRef.current;

    // Detect what changed
    const newAtEnd = messageIds.length > prevIds.length && messageIds[messageIds.length - 1] !== prevIds[prevIds.length - 1];
    const shouldForceScroll = userSentRef.current;
    userSentRef.current = false;

    if (shouldForceScroll || (newAtEnd && isNearBottom())) {
      // New message at bottom — smooth scroll if near bottom or user just sent
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
    // If messages changed but no new ones at end (e.g. polling update, reactions, edits),
    // or user scrolled up — do nothing, preserve position

    prevIdsRef.current = messageIds;
  }, [messageIds, isNearBottom]);

  return { containerRef, bottomRef, markUserSent };
}
