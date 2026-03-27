import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ExternalLink, Navigation, Loader2, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import { useLocationSharing, getFreshness, type FreshnessStatus } from "@/hooks/useLocationSharing";
import { distanceMiles, formatDistance, detectMotion, humanTimestamp, type MotionState } from "@/lib/locationUtils";
import PrivateLayout from "@/components/private/PrivateLayout";

function StatusDot({ status }: { status: FreshnessStatus }) {
  if (status === "live") {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
      </span>
    );
  }
  if (status === "recent") {
    return <span className="inline-flex rounded-full h-2.5 w-2.5 bg-accent-foreground/50" />;
  }
  return <span className="inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/30" />;
}

function computeMapBbox(coords: { lat: number; lng: number }[]): string {
  if (coords.length === 0) return "";
  let center: { lat: number; lng: number };
  let span = 0.005;
  if (coords.length === 2) {
    center = {
      lat: (coords[0].lat + coords[1].lat) / 2,
      lng: (coords[0].lng + coords[1].lng) / 2,
    };
    const maxDelta = Math.max(Math.abs(coords[0].lat - coords[1].lat), Math.abs(coords[0].lng - coords[1].lng));
    span = Math.max(maxDelta * 1.5, 0.005);
  } else {
    center = coords[0];
  }
  return `${center.lng - span},${center.lat - span},${center.lng + span},${center.lat + span}`;
}

function buildOsmEmbedUrl(coords: { lat: number; lng: number }[]): string {
  const bbox = computeMapBbox(coords);
  const markerParam = coords.length > 0
    ? `&marker=${coords[0].lat},${coords[0].lng}`
    : "";
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markerParam}`;
}

export default function LocationView() {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("them");
  const [loadingConv, setLoadingConv] = useState(true);
  const [stopConfirm, setStopConfirm] = useState(false);

  const handleSessionExpired = useCallback(async () => {
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    (async () => {
      try {
        if (user.role === "admin") {
          const data = await invokeMessaging("list-conversations", token);
          const convs = data.conversations || [];
          if (!cancelled && convs.length > 0) {
            setConversationId(convs[0].id);
            setOtherName(convs[0].user_name || "them");
          }
        } else {
          const data = await invokeMessaging("get-my-conversation", token);
          if (!cancelled && data.conversation_id) {
            setConversationId(data.conversation_id);
            setOtherName(data.admin_name || "them");
          }
        }
      } catch (e) {
        if (e instanceof SessionExpiredError) handleSessionExpired();
      } finally {
        if (!cancelled) setLoadingConv(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token, user, handleSessionExpired]);

  const {
    isSharingMine,
    myLocation,
    incomingLocation,
    loading,
    error,
    startSharing,
    stopSharing,
  } = useLocationSharing(token, conversationId, handleSessionExpired);

  // Motion detection
  const prevInRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const [motionState, setMotionState] = useState<MotionState>("unknown");

  useEffect(() => {
    if (!incomingLocation) {
      prevInRef.current = null;
      setMotionState("unknown");
      return;
    }
    const curr = { lat: incomingLocation.latitude, lng: incomingLocation.longitude, time: new Date(incomingLocation.updated_at).getTime() };
    const motion = detectMotion(prevInRef.current, curr);
    if (motion !== "unknown") setMotionState(motion);
    prevInRef.current = curr;
  }, [incomingLocation?.latitude, incomingLocation?.longitude, incomingLocation?.updated_at]);

  const myCoords = myLocation ? { lat: myLocation.latitude, lng: myLocation.longitude } : null;
  const inCoords = incomingLocation ? { lat: incomingLocation.latitude, lng: incomingLocation.longitude } : null;
  const freshness = incomingLocation ? getFreshness(incomingLocation.updated_at) : null;
  const timestamp = incomingLocation ? humanTimestamp(incomingLocation.updated_at) : "";

  // Distance
  const distance = (myCoords && inCoords) ? distanceMiles(myCoords.lat, myCoords.lng, inCoords.lat, inCoords.lng) : null;
  const distLabel = distance !== null ? formatDistance(distance) : null;

  const allCoords: { lat: number; lng: number }[] = [];
  if (myCoords) allCoords.push(myCoords);
  if (inCoords) allCoords.push(inCoords);

  const hasData = allCoords.length > 0;

  // Re-render for freshness
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!incomingLocation && !isSharingMine) return;
    const t = setInterval(() => setTick((v) => v + 1), 10_000);
    return () => clearInterval(t);
  }, [incomingLocation, isSharingMine]);

  // Stop confirmation
  useEffect(() => {
    if (!stopConfirm) return;
    const t = setTimeout(() => setStopConfirm(false), 2000);
    return () => clearTimeout(t);
  }, [stopConfirm]);

  const handleStop = () => {
    stopSharing();
    setStopConfirm(true);
  };

  if (loadingConv) {
    return (
      <PrivateLayout title="Location" fullHeight>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Location" fullHeight>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Map area */}
        {hasData ? (
          <div className="flex-1 relative min-h-0 overflow-hidden">
            <iframe
              src={buildOsmEmbedUrl(allCoords)}
              title="Location map"
              className="w-full h-full border-0"
            />

            {/* Legend */}
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
              {myCoords && (
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                  You {isSharingMine && <span className="text-primary text-[10px]">· Live</span>}
                </div>
              )}
              {inCoords && (
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <StatusDot status={freshness!} />
                  <span>{otherName}</span>
                  <span className={`text-[10px] ${freshness === "live" ? "text-primary" : "text-muted-foreground"}`}>
                    · {timestamp}
                  </span>
                  {motionState === "moving" && freshness === "live" && (
                    <span className="flex items-center gap-0.5 text-[10px] text-primary">
                      <Activity size={9} /> Moving
                    </span>
                  )}
                  {motionState === "stopped" && freshness === "live" && (
                    <span className="text-[10px] text-muted-foreground">· Stopped</span>
                  )}
                </div>
              )}
              {distLabel && (
                <div className="text-[10px] text-muted-foreground pl-4">
                  📍 {distLabel}
                </div>
              )}
            </div>

            {/* External link */}
            {inCoords && (
              <a
                href={`https://www.google.com/maps?q=${inCoords.lat},${inCoords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-primary hover:underline flex items-center gap-1.5"
                style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
              >
                <ExternalLink size={12} />
                Open in Maps
              </a>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="h-14 w-14 rounded-full bg-muted/30 flex items-center justify-center">
              <MapPin size={24} className="text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">Location not being shared</p>
              <p className="text-xs text-muted-foreground">
                Start sharing from the chat to see locations here
              </p>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div
          className="shrink-0 border-t border-border/30 px-4 py-2.5 flex items-center justify-between"
          style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-center gap-2">
            {stopConfirm ? (
              <span className="text-xs text-muted-foreground animate-fade-in">Sharing stopped</span>
            ) : isSharingMine ? (
              <>
                <StatusDot status="live" />
                <span className="text-xs text-primary font-medium">Sharing your location</span>
                {distLabel && <span className="text-[10px] text-muted-foreground">· {distLabel}</span>}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Not sharing</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isSharingMine ? (
              <button
                onClick={handleStop}
                className="text-[11px] text-muted-foreground/50 hover:text-destructive transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={startSharing}
                disabled={loading}
                className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                Start sharing
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="shrink-0 px-4 py-2 border-t border-destructive/20 bg-destructive/5">
            <p className="text-[10px] text-destructive">{error}</p>
          </div>
        )}
      </div>
    </PrivateLayout>
  );
}
