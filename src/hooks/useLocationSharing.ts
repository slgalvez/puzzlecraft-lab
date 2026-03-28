import { useState, useEffect, useRef, useCallback } from "react";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import {
  queryLocationPermission,
  getDeniedGuidance,
  getUnavailableGuidance,
} from "@/lib/locationPermission";

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
  if (age < 30_000) return "live";
  if (age < 120_000) return "recent";
  return "stale";
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
  const permissionGrantedRef = useRef(false);
  const startGpsWatchRef = useRef<(sendStartAction: boolean) => void>(() => {});
  tokenRef.current = token;
  convRef.current = conversationId;

  const SHARING_KEY = "location_sharing_active";

  // Poll for the other user's shared location + sync outgoing state (Fix #1)
  const fetchSharedLocation = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const data = await invokeMessaging("get-shared-location", token, {
        conversation_id: conversationId,
      });

      // Incoming location
      if (data.incoming) {
        setIncomingLocation((prev) => {
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

      // Fix #1: Sync outgoing state from backend
      // If backend says we're sharing but local state doesn't know, restore it
      if (data.outgoing?.active && !sharingRef.current) {
        // Backend says sharing is active — restore local state and restart GPS
        setIsSharingMine(true);
        sharingRef.current = true;
        sessionStorage.setItem(SHARING_KEY, "1");
        permissionGrantedRef.current = true;
        startGpsWatchRef.current(false);
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

  // Listen for permission changes (visibility/focus)
  useEffect(() => {
    let cancelled = false;

    const syncPermissionState = async () => {
      const state = await queryLocationPermission();
      if (cancelled) return;

      if (state === "granted") {
        permissionGrantedRef.current = true;
        setError((prev) => (prev && prev.toLowerCase().includes("location") ? null : prev));
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void syncPermissionState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    void syncPermissionState();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, []);

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
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            sendUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          },
          () => {},
          { enableHighAccuracy: false, maximumAge: 30000, timeout: 3000 },
        );
      }
      if (document.visibilityState === "visible" && sharingRef.current) {
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

  /** Start the GPS watch — called only from explicit user action or resume */
  const startGpsWatch = useCallback((sendStartAction: boolean) => {
    // Get initial position then start watching
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
        permissionGrantedRef.current = true;
        sessionStorage.setItem(SHARING_KEY, "1");
        setLoading(false);
        setError(null);

        if (sendStartAction) {
          sendUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, true);
        } else {
          sendUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        }

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
          permissionGrantedRef.current = false;
          setError(getDeniedGuidance());
        } else if (posErr.code === 2) {
          setError(getUnavailableGuidance());
        } else {
          setError("Location request timed out — try again");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [sendUpdate]);
  startGpsWatchRef.current = startGpsWatch;

  /** User-initiated start — the ONLY place we request permission */
  const startSharing = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError("Location is not supported on this device");
      return;
    }

    // Prevent double-tap
    if (sharingRef.current || loading) return;

    setLoading(true);
    setError(null);

    // Fix #2: Safety timeout — if getCurrentPosition never resolves (e.g. dismissed prompt)
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      if (!sharingRef.current) {
        setError("Location request timed out — try again");
      }
    }, 20_000);

    const originalStartGps = () => {
      clearTimeout(safetyTimer);
      startGpsWatch(true);
    };

    if (!permissionGrantedRef.current) {
      const permState = await queryLocationPermission();
      if (permState === "denied") {
        clearTimeout(safetyTimer);
        setLoading(false);
        setError(getDeniedGuidance());
        return;
      }
    }

    // Wrap startGpsWatch to clear the safety timer on success/error
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(safetyTimer);
        const myLoc: SharedLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updated_at: new Date().toISOString(),
        };
        setMyLocation(myLoc);
        setIsSharingMine(true);
        sharingRef.current = true;
        permissionGrantedRef.current = true;
        sessionStorage.setItem(SHARING_KEY, "1");
        setLoading(false);
        setError(null);

        sendUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, true);

        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            if (!sharingRef.current) return;
            setMyLocation({
              latitude: watchPos.coords.latitude,
              longitude: watchPos.coords.longitude,
              accuracy: watchPos.coords.accuracy,
              updated_at: new Date().toISOString(),
            });
            sendUpdate(watchPos.coords.latitude, watchPos.coords.longitude, watchPos.coords.accuracy);
          },
          (watchErr) => console.warn("[location] watch error:", watchErr.message),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
        );
      },
      (posErr) => {
        clearTimeout(safetyTimer);
        setLoading(false);
        if (posErr.code === 1) {
          permissionGrantedRef.current = false;
          setError(getDeniedGuidance());
        } else if (posErr.code === 2) {
          setError(getUnavailableGuidance());
        } else {
          setError("Location request timed out — try again");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [startGpsWatch, loading, sendUpdate]);

  // Fix #10: Clear myLocation immediately on stop
  const stopSharing = useCallback(async () => {
    sharingRef.current = false;
    setIsSharingMine(false);
    setMyLocation(null); // Clear immediately so all views update
    sessionStorage.removeItem(SHARING_KEY);

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

  // Auto-resume sharing if it was active before navigation
  useEffect(() => {
    if (!token || !conversationId) return;
    if (sharingRef.current) return;
    if (sessionStorage.getItem(SHARING_KEY) !== "1") return;
    permissionGrantedRef.current = true;
    setIsSharingMine(true);
    sharingRef.current = true;
    startGpsWatch(false);
  }, [token, conversationId, startGpsWatch]);

  // Cleanup on unmount — only clear watch, don't stop backend sharing
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
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
