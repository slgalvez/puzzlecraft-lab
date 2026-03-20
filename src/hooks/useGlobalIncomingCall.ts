import { useState, useEffect, useRef, useCallback } from "react";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";

export interface GlobalIncomingCall {
  callId: string;
  callerName: string;
  callerProfileId: string;
  conversationId: string;
}

/**
 * Polls for incoming calls across ALL conversations the user participates in.
 * Used in PrivateLayout so the banner shows on every Secret Lab page.
 */
export function useGlobalIncomingCall(token: string | null, onSessionExpired: () => void) {
  const [incomingCall, setIncomingCall] = useState<GlobalIncomingCall | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const sessionExpiredRef = useRef(false);

  const handleExpired = useCallback(() => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;
    clearInterval(pollRef.current);
    setIncomingCall(null);
    onSessionExpired();
  }, [onSessionExpired]);

  const api = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    try {
      return await invokeMessaging(action, token!, data);
    } catch (e) {
      if (e instanceof SessionExpiredError) handleExpired();
      throw e;
    }
  }, [token, handleExpired]);

  const acceptCall = useCallback(async (callId: string) => {
    // Navigate handled by consumer — just clear state
    setIncomingCall(null);
  }, []);

  const declineCall = useCallback(async (callId: string) => {
    try {
      await api("decline-call", { call_id: callId });
    } catch {
      // Ignore
    }
    setIncomingCall(null);
  }, [api]);

  useEffect(() => {
    if (!token) {
      sessionExpiredRef.current = false;
      clearInterval(pollRef.current);
      return;
    }

    const check = async () => {
      if (sessionExpiredRef.current) return;
      try {
        const data = await api("check-incoming-call-global");
        if (data.call) {
          setIncomingCall({
            callId: data.call.id,
            callerName: data.call.caller_name,
            callerProfileId: data.call.caller_profile_id,
            conversationId: data.call.conversation_id,
          });
        } else {
          setIncomingCall(null);
        }
      } catch (e) {
        if (e instanceof SessionExpiredError) return;
        // Ignore polling errors
      }
    };

    // Delay first check so it doesn't race with page load
    const timer = setTimeout(check, 2000);
    pollRef.current = setInterval(check, 4000);

    return () => {
      clearTimeout(timer);
      clearInterval(pollRef.current);
    };
  }, [token, api]);

  return { incomingCall, acceptCall, declineCall };
}
