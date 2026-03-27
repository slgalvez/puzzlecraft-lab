import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ExternalLink, Navigation, Loader2, Activity, Plus, X, Tag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import { useLocationSharing, getFreshness, type FreshnessStatus } from "@/hooks/useLocationSharing";
import { distanceMiles, formatDistance, detectMotion, humanTimestamp, type MotionState } from "@/lib/locationUtils";
import { getLocationLabels, saveLocationLabel, deleteLocationLabel, getDefaultIcons, type LocationLabel } from "@/lib/locationLabels";
import PrivateLayout from "@/components/private/PrivateLayout";
import DarkMap from "@/components/private/DarkMap";

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

export default function LocationView() {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("them");
  const [loadingConv, setLoadingConv] = useState(true);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [labels, setLabels] = useState<LocationLabel[]>([]);
  const [addingLabel, setAddingLabel] = useState<{ lat: number; lng: number } | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelIcon, setLabelIcon] = useState("⭐");
  const [showLabels, setShowLabels] = useState(true);
  const [editingLabel, setEditingLabel] = useState<LocationLabel | null>(null);

  // Load labels
  useEffect(() => {
    setLabels(getLocationLabels());
  }, []);

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

  // Get viewer's own position for map display even when not sharing
  const [viewerPos, setViewerPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    // Attempt a single silent position request (won't prompt if already denied)
    navigator.geolocation.getCurrentPosition(
      (pos) => setViewerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silently fail — don't block UI
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 },
    );
  }, []);

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

  const mapMarkers = [
    ...(myCoords ? [{ lat: myCoords.lat, lng: myCoords.lng, type: "me" as const, label: "You" }] : []),
    ...(inCoords ? [{ lat: inCoords.lat, lng: inCoords.lng, type: "other" as const, label: otherName }] : []),
  ];

  const handleMapLongPress = useCallback((lat: number, lng: number) => {
    setAddingLabel({ lat, lng });
    setLabelName("");
    setLabelIcon("⭐");
  }, []);

  const handleSaveLabel = () => {
    if (!addingLabel || !labelName.trim()) return;
    const label: LocationLabel = {
      id: Date.now().toString(36),
      name: labelName.trim(),
      icon: labelIcon,
      lat: addingLabel.lat,
      lng: addingLabel.lng,
    };
    saveLocationLabel(label);
    setLabels(getLocationLabels());
    setAddingLabel(null);
  };

  const handleDeleteLabel = (id: string) => {
    deleteLocationLabel(id);
    setLabels(getLocationLabels());
    setEditingLabel(null);
  };

  const handleStartEdit = (label: LocationLabel) => {
    setEditingLabel(label);
    setLabelName(label.name);
    setLabelIcon(label.icon);
  };

  const handleSaveEdit = () => {
    if (!editingLabel || !labelName.trim()) return;
    saveLocationLabel({ ...editingLabel, name: labelName.trim(), icon: labelIcon });
    setLabels(getLocationLabels());
    setEditingLabel(null);
  };

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
       <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative" style={{ isolation: "isolate" }}>
        {/* Map area */}
        {hasData ? (
          <div className="flex-1 relative min-h-0 overflow-hidden" style={{ zIndex: 0 }}>
            <DarkMap
              markers={mapMarkers}
              labels={showLabels ? labels : []}
              className="w-full h-full"
              interactive
              onMapLongPress={handleMapLongPress}
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

            {/* Labels toggle */}
            {labels.length > 0 && (
              <button
                onClick={() => setShowLabels((v) => !v)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-background/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[10px] text-foreground flex items-center gap-1.5"
              >
                <Tag size={10} className={showLabels ? "text-primary" : "text-muted-foreground"} />
                {showLabels ? "Labels" : "Labels off"}
              </button>
            )}

            {/* Add label panel */}
            {addingLabel && (
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-background/90 backdrop-blur-md rounded-lg p-3 space-y-2 shadow-lg max-w-[200px]" style={{ zIndex: 1000 }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground">Add label</span>
                  <button onClick={() => setAddingLabel(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {getDefaultIcons().map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setLabelIcon(icon)}
                      className={`text-base p-0.5 rounded ${labelIcon === icon ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted/30"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  placeholder="e.g. Home, Work..."
                  className="w-full bg-muted/30 border border-border/30 rounded-md px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50"
                  maxLength={20}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveLabel()}
                />
                <button
                  onClick={handleSaveLabel}
                  disabled={!labelName.trim()}
                  className="w-full text-[10px] bg-primary text-primary-foreground rounded-md py-1 disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            )}

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

        {/* Saved labels list */}
        {labels.length > 0 && (
          <div className="shrink-0 border-t border-border/20 px-4 py-1.5 flex gap-2 overflow-x-auto scrollbar-none">
            {labels.map((l) => (
              <button
                key={l.id}
                onClick={() => handleStartEdit(l)}
                className="flex items-center gap-1.5 shrink-0 bg-muted/20 hover:bg-muted/30 rounded-full px-2.5 py-0.5 group transition-colors"
              >
                <span className="text-xs">{l.icon}</span>
                <span className="text-[10px] text-foreground/80">{l.name}</span>
                {myCoords && (
                  <span className="text-[9px] text-muted-foreground">
                    {formatDistance(distanceMiles(myCoords.lat, myCoords.lng, l.lat, l.lng))}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Edit label panel */}
        {editingLabel && (
          <div className="shrink-0 border-t border-border/20 px-4 py-2 bg-card/60 backdrop-blur-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground">Edit label</span>
              <button onClick={() => setEditingLabel(null)} className="text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {getDefaultIcons().map((icon) => (
                <button
                  key={icon}
                  onClick={() => setLabelIcon(icon)}
                  className={`text-base p-0.5 rounded ${labelIcon === icon ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted/30"}`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                className="flex-1 bg-muted/30 border border-border/30 rounded-md px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50"
                maxLength={20}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
              />
              <button
                onClick={handleSaveEdit}
                disabled={!labelName.trim()}
                className="text-[10px] bg-primary text-primary-foreground rounded-md px-3 py-1 disabled:opacity-40"
              >
                Save
              </button>
            </div>
            <button
              onClick={() => handleDeleteLabel(editingLabel.id)}
              className="text-[10px] text-destructive/60 hover:text-destructive transition-colors"
            >
              Delete label
            </button>
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
