import { useRef, useEffect, useCallback } from "react";

const SCROLL_CACHE_KEY = "chat_scroll_offset";

/**
 * iMessage-like chat scroll behavior:
 * - Instant scroll to bottom on first load
 * - Smooth scroll to bottom when new messages arrive (only if user is near bottom)
 * - Preserve scroll position when older messages are prepended via polling
 * - Cache/restore scroll position across tab switches (e.g. Location ↔ Conversation)
 */
export function useChatScroll(messageIds: string[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const prevIdsRef = useRef<string[]>([]);
  const userSentRef = useRef(false);
  const restoredRef = useRef(false);

  /** Call this right before sending a message to force scroll-to-bottom */
  const markUserSent = useCallback(() => {
    userSentRef.current = true;
  }, []);

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "instant") => {
    // Use multiple strategies for reliability across browsers
    const container = containerRef.current;
    const bottom = bottomRef.current;
    if (bottom) {
      bottom.scrollIntoView({ behavior });
    } else if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Cache scroll offset on unmount
  useEffect(() => {
    const container = containerRef.current;
    return () => {
      if (container && initialScrollDone.current) {
        // Store distance from bottom so we can restore relative to new content
        const distFromBottom = container.scrollHeight - container.scrollTop;
        try {
          sessionStorage.setItem(SCROLL_CACHE_KEY, String(distFromBottom));
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (messageIds.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // First load: try to restore cached scroll, otherwise scroll to bottom
    if (!initialScrollDone.current) {
      if (!restoredRef.current) {
        restoredRef.current = true;
        const cached = sessionStorage.getItem(SCROLL_CACHE_KEY);
        if (cached) {
          const distFromBottom = parseInt(cached, 10);
          if (!isNaN(distFromBottom) && distFromBottom > 0) {
            // Restore after layout
            requestAnimationFrame(() => {
              container.scrollTop = container.scrollHeight - distFromBottom;
              // If we ended up near bottom anyway, snap to exact bottom
              if (container.scrollHeight - container.scrollTop - container.clientHeight < 60) {
                scrollToBottom("instant");
              }
              setTimeout(() => { initialScrollDone.current = true; }, 150);
            });
            try { sessionStorage.removeItem(SCROLL_CACHE_KEY); } catch {}
            prevIdsRef.current = messageIds;
            return;
          }
          try { sessionStorage.removeItem(SCROLL_CACHE_KEY); } catch {}
        }
      }

      scrollToBottom("instant");
      requestAnimationFrame(() => {
        scrollToBottom("instant");
        // Safety: re-scroll after a short delay to catch late layout shifts (images, etc.)
        setTimeout(() => {
          scrollToBottom("instant");
          initialScrollDone.current = true;
        }, 150);
      });
      prevIdsRef.current = messageIds;
      return;
    }

    const prevIds = prevIdsRef.current;
    const shouldForceScroll = userSentRef.current;
    userSentRef.current = false;

    // Filter out temporary/failed IDs for comparison (they stay at the end and mask real new messages)
    const realIds = messageIds.filter((id) => !id.startsWith("failed-"));
    const prevRealIds = prevIds.filter((id) => !id.startsWith("failed-"));

    // Detect: new messages at the END (normal new message flow)
    const newAtEnd = realIds.length > prevRealIds.length &&
      realIds[realIds.length - 1] !== prevRealIds[prevRealIds.length - 1];

    // Detect: new messages prepended at START (older messages loaded)
    const prependedAtStart = realIds.length > prevRealIds.length &&
      prevRealIds.length > 0 &&
      realIds[realIds.length - 1] === prevRealIds[prevRealIds.length - 1] &&
      realIds[0] !== prevRealIds[0];

    if (prependedAtStart) {
      // Preserve scroll position: calculate how much height was added
      const prevScrollHeight = container.scrollHeight;
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        const addedHeight = newScrollHeight - prevScrollHeight;
        container.scrollTop += addedHeight;
      });
    } else if (shouldForceScroll || (newAtEnd && isNearBottom())) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }

    prevIdsRef.current = messageIds;
  }, [messageIds, isNearBottom, scrollToBottom]);

  /** Scroll to bottom only if user is near bottom — call when typing indicator appears */
  const scrollIfNearBottom = useCallback(() => {
    if (isNearBottom()) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
  }, [isNearBottom, scrollToBottom]);

  return { containerRef, bottomRef, markUserSent, scrollIfNearBottom };
}
