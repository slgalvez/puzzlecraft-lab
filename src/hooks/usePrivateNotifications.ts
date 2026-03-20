import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  dispatchNotification,
  sendPushNotification,
  getNotificationsEnabled,
  type NotifyEventType,
  type NotifyResult,
} from "@/lib/privateNotifications";

/**
 * Hook that manages notification dispatch for the private app.
 * Returns banner state + a `notify` function to trigger notifications.
 */
export function usePrivateNotifications() {
  const [bannerPhrase, setBannerPhrase] = useState<string | null>(null);
  const location = useLocation();
  const prevUnreadRef = useRef<number>(0);
  const prevIncomingCallRef = useRef<boolean>(false);

  const clearBanner = useCallback(() => {
    setBannerPhrase(null);
  }, []);

  const notify = useCallback((eventType: NotifyEventType, messageCount?: number) => {
    const result = dispatchNotification(eventType, messageCount);
    if (!result) return;

    if (result.action === "push") {
      sendPushNotification(result.phrase);
    } else if (result.action === "banner") {
      setBannerPhrase(result.phrase);
    }
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
