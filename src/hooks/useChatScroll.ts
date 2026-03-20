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

  useEffect(() => {
    if (messageIds.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // First load: instant scroll to bottom (with slight delay for DOM paint)
    if (!initialScrollDone.current) {
      // Double rAF ensures the browser has painted the messages
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("instant");
          initialScrollDone.current = true;
        });
      });
      prevIdsRef.current = messageIds;
      return;
    }

    const prevIds = prevIdsRef.current;
    const shouldForceScroll = userSentRef.current;
    userSentRef.current = false;

    // Detect: new messages at the END (normal new message flow)
    const newAtEnd = messageIds.length > prevIds.length &&
      messageIds[messageIds.length - 1] !== prevIds[prevIds.length - 1];

    // Detect: new messages prepended at START (older messages loaded)
    const prependedAtStart = messageIds.length > prevIds.length &&
      prevIds.length > 0 &&
      messageIds[messageIds.length - 1] === prevIds[prevIds.length - 1] &&
      messageIds[0] !== prevIds[0];

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

  return { containerRef, bottomRef, markUserSent };
}
