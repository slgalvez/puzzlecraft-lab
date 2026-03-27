import { useState, useEffect, useRef, useCallback } from "react";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";

interface SharedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
}

interface LocationSharingState {
  /** Whether I am currently sharing my location */
  isSharingMine: boolean;
  /** The other user's shared location (if they are sharing) */
  incomingLocation: SharedLocation | null;
  /** Whether location is being fetched */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Start sharing my location */
  startSharing: () => void;
  /** Stop sharing my location */
  stopSharing: () => void;
}

export function useLocationSharing(
  token: string | null,
  conversationId: string | null,
  onSessionExpired: () => void,
): LocationSharingState {
  const [isSharingMine, setIsSharingMine] = useState(false);
  const [incomingLocation, setIncomingLocation] = useState<SharedLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const sharingRef = useRef(false);

  // Poll for the other user's shared location
  const fetchSharedLocation = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const data = await invokeMessaging("get-shared-location", token, {
        conversation_id: conversationId,
      });
      if (data.incoming) {
        setIncomingLocation({
          latitude: data.incoming.latitude,
          longitude: data.incoming.longitude,
          accuracy: data.incoming.accuracy,
          updated_at: data.incoming.updated_at,
        });
      } else {
        setIncomingLocation(null);
      }
      // Sync our own sharing status from backend
      if (data.outgoing?.active && !sharingRef.current) {
        // Backend says we're sharing but local state disagrees — reconcile
      }
    } catch (e) {
      if (e instanceof SessionExpiredError) return onSessionExpired();
      // Silent fail for polling
    }
  }, [token, conversationId, onSessionExpired]);

  // Start polling
  useEffect(() => {
    if (!token || !conversationId) return;
    fetchSharedLocation();
    pollRef.current = setInterval(fetchSharedLocation, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchSharedLocation, token, conversationId]);

  const sendUpdate = useCallback(
    async (latitude: number, longitude: number, accuracy: number | null, isStart = false) => {
      if (!token || !conversationId) return;
      try {
        const action = isStart ? "start-location-sharing" : "update-location";
        await invokeMessaging(action, token, {
          conversation_id: conversationId,
          latitude,
          longitude,
          accuracy,
        });
      } catch (e) {
        if (e instanceof SessionExpiredError) return onSessionExpired();
        console.warn("[location] update failed:", e);
      }
    },
    [token, conversationId, onSessionExpired],
  );

  const startSharing = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Location not supported on this device");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsSharingMine(true);
        sharingRef.current = true;
        setLoading(false);
        sendUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, true);

        // Start watching
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            if (!sharingRef.current) return;
            sendUpdate(
              watchPos.coords.latitude,
              watchPos.coords.longitude,
              watchPos.coords.accuracy,
            );
          },
          (watchErr) => {
            console.warn("[location] watch error:", watchErr.message);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
        );
      },
      (posErr) => {
        setLoading(false);
        if (posErr.code === 1) {
          setError("Location permission denied");
        } else if (posErr.code === 2) {
          setError("Location unavailable");
        } else {
          setError("Location request timed out");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [sendUpdate]);

  const stopSharing = useCallback(async () => {
    sharingRef.current = false;
    setIsSharingMine(false);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (token && conversationId) {
      try {
        await invokeMessaging("stop-location-sharing", token, {
          conversation_id: conversationId,
        });
      } catch (e) {
        if (e instanceof SessionExpiredError) return onSessionExpired();
      }
    }
  }, [token, conversationId, onSessionExpired]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Auto-stop sharing when leaving conversation
      if (sharingRef.current && token && conversationId) {
        sharingRef.current = false;
        invokeMessaging("stop-location-sharing", token, {
          conversation_id: conversationId,
        }).catch(() => {});
      }
    };
  }, [token, conversationId]);

  return {
    isSharingMine,
    incomingLocation,
    loading,
    error,
    startSharing,
    stopSharing,
  };
}
