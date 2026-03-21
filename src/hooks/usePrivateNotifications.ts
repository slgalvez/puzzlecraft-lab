import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  dispatchNotification,
  getNotificationsEnabled,
  subscribeToPush,
  type NotifyEventType,
} from "@/lib/privateNotifications";

/**
 * Hook that manages notification dispatch for the private app.
 * Returns banner state + a `notify` function to trigger notifications.
 */
export function usePrivateNotifications(token?: string | null) {
  const [bannerPhrase, setBannerPhrase] = useState<string | null>(null);
  const location = useLocation();
  const prevUnreadRef = useRef<number>(0);
  const prevIncomingCallRef = useRef<boolean>(false);
  const lastSubscribedTokenRef = useRef<string | null>(null);

  // Auto-subscribe to push when notifications are enabled
  // Re-runs when token changes (new login) to resync device with backend
  useEffect(() => {
    if (!token) return;
    if (token === lastSubscribedTokenRef.current) return;
    if (!getNotificationsEnabled()) return;
    if (!("serviceWorker" in navigator)) return;

    lastSubscribedTokenRef.current = token;
    // Delay subscription to not block initial load
    const timer = setTimeout(() => {
      subscribeToPush(token).catch(() => {});
    }, 3000);

    return () => clearTimeout(timer);
  }, [token]);

  const clearBanner = useCallback(() => {
    setBannerPhrase(null);
  }, []);

  const notify = useCallback((eventType: NotifyEventType, messageCount?: number) => {
    const result = dispatchNotification(eventType, messageCount);
    if (!result) return;

    if (result.action === "banner") {
      setBannerPhrase(result.phrase);
    }
    // "push" action → handled server-side by send-push edge function (with rate limiting)
    // "silent" → do nothing (UI updates handled by conversation view)
  }, []);

  /**
   * Call this with current unread count to auto-detect new messages.
   * It tracks the previous count and only triggers on increases.
   */
  const checkUnread = useCallback((currentUnread: number) => {
    if (currentUnread > prevUnreadRef.current && prevUnreadRef.current >= 0) {
      const newCount = currentUnread - prevUnreadRef.current;
      notify("message", newCount);
    }
    prevUnreadRef.current = currentUnread;
  }, [notify]);

  /**
   * Call this with incoming call state to auto-detect new calls.
   */
  const checkIncomingCall = useCallback((hasIncomingCall: boolean) => {
    if (hasIncomingCall && !prevIncomingCallRef.current) {
      notify("call");
    }
    prevIncomingCallRef.current = hasIncomingCall;
  }, [notify]);

  // Reset banner when navigating to conversation
  useEffect(() => {
    if (
      location.pathname === "/p/conversation" ||
      location.pathname.startsWith("/p/conversation/")
    ) {
      setBannerPhrase(null);
    }
  }, [location.pathname]);

  return {
    bannerPhrase,
    clearBanner,
    notify,
    checkUnread,
    checkIncomingCall,
  };
}
