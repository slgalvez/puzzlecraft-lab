import { useState, useEffect, useRef, useCallback } from "react";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";

export interface SharedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
}

/** Freshness status derived from updated_at */
export type FreshnessStatus = "live" | "recent" | "stale";

export function getFreshness(updatedAt: string): FreshnessStatus {
  const age = Date.now() - new Date(updatedAt).getTime();
  if (age < 30_000) return "live";      // <30s = live
  if (age < 120_000) return "recent";   // <2min = recent
  return "stale";                        // >2min = stale
}

export function freshnessLabel(updatedAt: string): string {
  const age = Date.now() - new Date(updatedAt).getTime();
  if (age < 10_000) return "Live now";
  if (age < 30_000) return "Updated just now";
  if (age < 60_000) return `Updated ${Math.floor(age / 1000)}s ago`;
  if (age < 3_600_000) return `Updated ${Math.floor(age / 60_000)} min ago`;
  if (age < 86_400_000) return `Last seen ${Math.floor(age / 3_600_000)}h ago`;
  return "Last seen recently";
}

interface LocationSharingState {
  isSharingMine: boolean;
  myLocation: SharedLocation | null;
  incomingLocation: SharedLocation | null;
  loading: boolean;
  error: string | null;
  startSharing: () => void;
  stopSharing: () => void;
}

export function useLocationSharing(
  token: string | null,
  conversationId: string | null,
  onSessionExpired: () => void,
): LocationSharingState {
  const [isSharingMine, setIsSharingMine] = useState(false);
  const [myLocation, setMyLocation] = useState<SharedLocation | null>(null);
  const [incomingLocation, setIncomingLocation] = useState<SharedLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const sharingRef = useRef(false);
  const tokenRef = useRef(token);
  const convRef = useRef(conversationId);
  tokenRef.current = token;
  convRef.current = conversationId;

  // Poll for the other user's shared location
  const fetchSharedLocation = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const data = await invokeMessaging("get-shared-location", token, {
        conversation_id: conversationId,
      });
      if (data.incoming) {
        setIncomingLocation((prev) => {
          // Only update if coords actually changed or freshness differs
          if (
            prev &&
            prev.latitude === data.incoming.latitude &&
            prev.longitude === data.incoming.longitude &&
            prev.updated_at === data.incoming.updated_at
          ) {
            return prev;
          }
          return {
            latitude: data.incoming.latitude,
            longitude: data.incoming.longitude,
            accuracy: data.incoming.accuracy,
            updated_at: data.incoming.updated_at,
          };
        });
      } else {
        setIncomingLocation(null);
      }
    } catch (e) {
      if (e instanceof SessionExpiredError) return onSessionExpired();
    }
  }, [token, conversationId, onSessionExpired]);

  // Start polling
  useEffect(() => {
    if (!token || !conversationId) return;
    fetchSharedLocation();
    pollRef.current = setInterval(fetchSharedLocation, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchSharedLocation, token, conversationId]);

  // Force re-render every 10s to update freshness labels
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!incomingLocation) return;
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, [incomingLocation]);

  const sendUpdate = useCallback(
    async (latitude: number, longitude: number, accuracy: number | null, isStart = false) => {
      if (!tokenRef.current || !convRef.current) return;
      try {
        const action = isStart ? "start-location-sharing" : "update-location";
        await invokeMessaging(action, tokenRef.current, {
          conversation_id: convRef.current,
          latitude,
          longitude,
          accuracy,
        });
      } catch (e) {
        if (e instanceof SessionExpiredError) return onSessionExpired();
        console.warn("[location] update failed:", e);
      }
    },
    [onSessionExpired],
  );

  // Exit snapshot: send final location when page hides
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sharingRef.current) {
        // Send a last-known location snapshot
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sendUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          },
          () => {}, // silently fail
          { enableHighAccuracy: false, maximumAge: 30000, timeout: 3000 },
        );
      }
      if (document.visibilityState === "visible" && sharingRef.current) {
        // Re-entry refresh: immediately get fresh location
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sendUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [sendUpdate]);

  const startSharing = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Location not supported on this device");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const myLoc: SharedLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updated_at: new Date().toISOString(),
        };
        setMyLocation(myLoc);
        setIsSharingMine(true);
        sharingRef.current = true;
        setLoading(false);
        sendUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, true);

        // Start watching
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            if (!sharingRef.current) return;
            setMyLocation({
              latitude: watchPos.coords.latitude,
              longitude: watchPos.coords.longitude,
              accuracy: watchPos.coords.accuracy,
              updated_at: new Date().toISOString(),
            });
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
          setError("Location permission denied — check your browser or device settings to allow location access for this site");
        } else if (posErr.code === 2) {
          setError("Location unavailable — make sure Location Services are enabled in your device settings");
        } else {
          setError("Location request timed out — try again");
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

    if (tokenRef.current && convRef.current) {
      try {
        await invokeMessaging("stop-location-sharing", tokenRef.current, {
          conversation_id: convRef.current,
        });
      } catch (e) {
        if (e instanceof SessionExpiredError) return onSessionExpired();
      }
    }
  }, [onSessionExpired]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (sharingRef.current && tokenRef.current && convRef.current) {
        sharingRef.current = false;
        invokeMessaging("stop-location-sharing", tokenRef.current, {
          conversation_id: convRef.current,
        }).catch(() => {});
      }
    };
  }, []);

  return {
    isSharingMine,
    myLocation,
    incomingLocation,
    loading,
    error,
    startSharing,
    stopSharing,
  };
}
