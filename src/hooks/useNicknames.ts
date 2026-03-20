import { useState, useEffect, useCallback } from "react";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";

/**
 * Hook for managing private contact nicknames.
 * Returns a map of contact_profile_id → nickname, plus set/remove helpers.
 */
export function useNicknames(token: string | null, onSessionExpired?: () => void) {
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const fetchNicknames = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("get-nicknames", token);
      setNicknames(data.nicknames || {});
    } catch (e) {
      if (e instanceof SessionExpiredError) onSessionExpired?.();
    } finally {
      setLoaded(true);
    }
  }, [token, onSessionExpired]);

  useEffect(() => {
    fetchNicknames();
  }, [fetchNicknames]);

  const resolve = useCallback(
    (profileId: string, defaultName: string): string => {
      return nicknames[profileId] || defaultName;
    },
    [nicknames]
  );

  const setNickname = useCallback(
    async (contactProfileId: string, nickname: string) => {
      if (!token) return;
      const trimmed = nickname.trim();
      if (!trimmed) return;
      setNicknames((prev) => ({ ...prev, [contactProfileId]: trimmed }));
      try {
        await invokeMessaging("set-nickname", token, {
          contact_profile_id: contactProfileId,
          nickname: trimmed,
        });
      } catch (e) {
        if (e instanceof SessionExpiredError) onSessionExpired?.();
        fetchNicknames(); // revert on error
      }
    },
    [token, onSessionExpired, fetchNicknames]
  );

  const removeNickname = useCallback(
    async (contactProfileId: string) => {
      if (!token) return;
      setNicknames((prev) => {
        const next = { ...prev };
        delete next[contactProfileId];
        return next;
      });
      try {
        await invokeMessaging("remove-nickname", token, {
          contact_profile_id: contactProfileId,
        });
      } catch (e) {
        if (e instanceof SessionExpiredError) onSessionExpired?.();
        fetchNicknames();
      }
    },
    [token, onSessionExpired, fetchNicknames]
  );

  return { nicknames, loaded, resolve, setNickname, removeNickname };
}
