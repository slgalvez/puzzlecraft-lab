import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Loader2, AlertCircle, ExternalLink, Maximize2, Activity, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SharedLocation, getFreshness, type FreshnessStatus } from "@/hooks/useLocationSharing";
import { distanceMiles, formatDistance, detectMotion, humanTimestamp, type MotionState } from "@/lib/locationUtils";
import { getLocationLabels } from "@/lib/locationLabels";
import { useIsMobile } from "@/hooks/use-mobile";
import { isStandaloneMode } from "@/lib/locationPermission";
import DarkMap from "@/components/private/DarkMap";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LocationCardProps {
  isSharingMine: boolean;
  myLocation: SharedLocation | null;
  loading: boolean;
  error: string | null;
  incomingLocation: SharedLocation | null;
  otherName: string;
  onStartSharing: () => void;
  onStopSharing: () => void;
}

function StatusDot({ status, animated = true }: { status: FreshnessStatus; animated?: boolean }) {
  if (status === "live") {
    return (
      <span className="relative flex h-2 w-2">
        {animated && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />}
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
    );
  }
  if (status === "recent") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-foreground/50" />
      </span>
    );
  }
  return (
    <span className="relative flex h-2 w-2">
      <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/30" />
    </span>
  );
}

export function LocationCard({
  isSharingMine,
  myLocation,
  loading,
  error,
  incomingLocation,
  otherName,
  onStartSharing,
  onStopSharing,
}: LocationCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [, setTick] = useState(0);
  const isMobile = useIsMobile();
  const isStandalone = isStandaloneMode();
  const useBottomSheet = isMobile && !isStandalone;
  const [expanded, setExpanded] = useState(false);

  // Fix #3: Silent viewer position fallback for map display
  const [viewerPos, setViewerPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setViewerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 },
    );
  }, []);

  // Motion detection
  const prevIncomingRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const [motionState, setMotionState] = useState<MotionState>("unknown");

  useEffect(() => {
    if (!incomingLocation) {
      prevIncomingRef.current = null;
      setMotionState("unknown");
      return;
    }
    const curr = { lat: incomingLocation.latitude, lng: incomingLocation.longitude, time: new Date(incomingLocation.updated_at).getTime() };
    const motion = detectMotion(prevIncomingRef.current, curr);
    if (motion !== "unknown") setMotionState(motion);
    prevIncomingRef.current = curr;
  }, [incomingLocation?.latitude, incomingLocation?.longitude, incomingLocation?.updated_at]);

  // Fix #4: Only interpolate when expanded to avoid unnecessary state updates
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [displayCoords, setDisplayCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!incomingLocation) {
      prevCoordsRef.current = null;
      setDisplayCoords(null);
      return;
    }
    const target = { lat: incomingLocation.latitude, lng: incomingLocation.longitude };
    const prev = prevCoordsRef.current;
    if (!prev) {
      prevCoordsRef.current = target;
      setDisplayCoords(target);
      return;
    }
    // Only animate interpolation when map is visible (expanded or mapOpen)
    if (!expanded && !mapOpen) {
      prevCoordsRef.current = target;
      setDisplayCoords(target);
      return;
    }
    const steps = 6;
    let step = 0;
    const dLat = (target.lat - prev.lat) / steps;
    const dLng = (target.lng - prev.lng) / steps;
    const timer = setInterval(() => {
      step++;
      setDisplayCoords({ lat: prev.lat + dLat * step, lng: prev.lng + dLng * step });
      if (step >= steps) { clearInterval(timer); prevCoordsRef.current = target; }
    }, 100);
    return () => clearInterval(timer);
  }, [incomingLocation?.latitude, incomingLocation?.longitude, expanded, mapOpen]);

  // Tick for freshness
  useEffect(() => {
    if (!incomingLocation && !isSharingMine) return;
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, [incomingLocation, isSharingMine]);

  // Stop confirmation fade
  useEffect(() => {
    if (!stopConfirm) return;
    const t = setTimeout(() => setStopConfirm(false), 2000);
    return () => clearTimeout(t);
  }, [stopConfirm]);

  const inCoords = displayCoords || (incomingLocation ? { lat: incomingLocation.latitude, lng: incomingLocation.longitude } : null);
  // Fix #3: Use myLocation if sharing, otherwise viewerPos for map display
  const myCoords = myLocation ? { lat: myLocation.latitude, lng: myLocation.longitude } : viewerPos;
  const freshness = incomingLocation ? getFreshness(incomingLocation.updated_at) : null;
  const timestamp = incomingLocation ? humanTimestamp(incomingLocation.updated_at) : "";
  const hasAnyLocationActivity = isSharingMine || incomingLocation;

  const mapMarkers = [
    ...(myCoords ? [{ lat: myCoords.lat, lng: myCoords.lng, type: "me" as const }] : []),
    ...(inCoords ? [{ lat: inCoords.lat, lng: inCoords.lng, type: "other" as const }] : []),
  ];
  const savedLabels = getLocationLabels();

  // Distance
  const distance = (myCoords && inCoords) ? distanceMiles(myCoords.lat, myCoords.lng, inCoords.lat, inCoords.lng) : null;
  const distLabel = distance !== null ? formatDistance(distance) : null;

  const handleTopTap = () => {
    if (isSharingMine || incomingLocation) {
      setExpanded((v) => !v);
    } else {
      setDrawerOpen((v) => !v);
    }
  };

  const handleStartFromSheet = () => {
    setDrawerOpen(false);
    onStartSharing();
  };

  const handleStop = () => {
    onStopSharing();
    setStopConfirm(true);
    setExpanded(false);
  };

  return (
    <div>
      {/* ── Thin inline status row ── */}
      <button
        onClick={handleTopTap}
        className={`flex w-full items-center gap-1 px-1 py-px text-left text-[9px] leading-tight transition-colors ${
          isSharingMine
            ? "text-primary"
            : incomingLocation
              ? "text-foreground"
              : "text-muted-foreground/50 hover:text-muted-foreground"
        }`}
      >
        {stopConfirm ? (
          <span className="text-muted-foreground animate-fade-in">Location sharing stopped</span>
        ) : isSharingMine ? (
          <>
            <StatusDot status="live" />
            <span className="font-medium">Sharing live location</span>
            {distLabel && <span className="text-muted-foreground ml-0.5">· {distLabel}</span>}
          </>
        ) : incomingLocation ? (
          <>
            <StatusDot status={freshness!} animated={freshness === "live"} />
            {/* Fix #5: Make incoming status more prominent */}
            <span className="font-medium">{otherName} is sharing</span>
            <span className="text-muted-foreground ml-0.5">· {timestamp}</span>
            {distLabel && <span className="text-muted-foreground ml-0.5">· {distLabel}</span>}
            {motionState === "moving" && freshness === "live" && (
              <Activity size={8} className="text-primary ml-0.5" />
            )}
          </>
        ) : (
          <>
            <MapPin size={9} />
            <span>Location</span>
          </>
        )}
      </button>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 flex items-start gap-2 mt-0.5">
          <AlertCircle size={12} className="text-destructive mt-0.5 shrink-0" />
          <div className="space-y-1 flex-1">
            <div className="text-[10px] text-destructive space-y-0.5">
              {error.split("\n").map((line, i) => (
                <p key={i} className={i === 0 ? "font-medium" : "text-destructive/80 pl-1"}>{line}</p>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={onStartSharing} className="text-[10px] h-6">
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* ── Collapsible map card ── */}
      {hasAnyLocationActivity && expanded && (
        <div className="rounded-md border border-border/20 bg-card/40 overflow-hidden mt-0.5">
          <button onClick={() => setMapOpen(true)} className="block relative group w-full">
            <DarkMap
              markers={mapMarkers}
              labels={savedLabels}
              className="w-full h-[110px]"
              interactive={false}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Maximize2 size={14} className="text-background opacity-0 group-hover:opacity-70 transition-opacity drop-shadow-lg" />
            </div>
          </button>
          <div className="px-2 py-1 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MapPin size={10} className="text-primary" />
              {incomingLocation && freshness ? (
                <span className="text-[10px] text-foreground">
                  {freshness === "live" ? "Live" : timestamp}
                  {distLabel && <span className="text-muted-foreground"> · {distLabel}</span>}
                  {motionState === "moving" && freshness === "live" && (
                    <span className="text-primary"> · On the move</span>
                  )}
                  {motionState === "stopped" && freshness === "live" && (
                    <span className="text-muted-foreground"> · Stopped</span>
                  )}
                </span>
              ) : isSharingMine ? (
                <span className="text-[10px] text-primary">Live</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMapOpen(true)}
                className="text-[9px] text-primary hover:underline"
              >
                Open Map
              </button>
              {isSharingMine && (
                <button
                  onClick={handleStop}
                  className="text-[9px] text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom sheet / dialog to start sharing ── */}
      {useBottomSheet ? (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2">
                <MapPin size={18} className="text-primary" />
                Share your location
              </DrawerTitle>
              <DrawerDescription className="text-sm">
                Share your current location with {otherName} in real time. You can stop at any time.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-2 space-y-3">
              <button
                onClick={handleStartFromSheet}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Navigation size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Share live location</p>
                  <p className="text-xs text-muted-foreground">Updates while the app is open</p>
                </div>
                {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
              </button>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline" size="sm">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-primary" />
                Share your location
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Share your current location with {otherName} in real time. You can stop at any time.
            </p>
            <button
              onClick={handleStartFromSheet}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Navigation size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Share live location</p>
                <p className="text-xs text-muted-foreground">Updates while the app is open</p>
              </div>
              {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            </button>
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>Cancel</Button>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Full-screen map modal ── */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <MapPin size={15} className="text-primary" />
              Live location
              {distLabel && (
                <span className="text-[10px] text-muted-foreground font-normal ml-1">· {distLabel}</span>
              )}
              {incomingLocation && (
                <span className="ml-auto flex items-center gap-1.5">
                  <StatusDot status={freshness!} />
                  <span className={`text-[10px] ${freshness === "live" ? "text-primary" : "text-muted-foreground"}`}>
                    {timestamp}
                  </span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="w-full relative">
            <DarkMap
              markers={mapMarkers}
              labels={savedLabels}
              className="w-full h-[50vh]"
              interactive
            />
            {/* Legend overlay */}
            <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded-md px-2.5 py-1.5 space-y-0.5">
              {myCoords && (
                <div className="flex items-center gap-1.5 text-[10px] text-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  You
                </div>
              )}
              {inCoords && (
                <div className="flex items-center gap-1.5 text-[10px] text-foreground">
                  <StatusDot status={freshness ?? "stale"} />
                  <span>{otherName}</span>
                  {motionState === "moving" && freshness === "live" && (
                    <span className="text-primary text-[9px]">· On the move</span>
                  )}
                  {motionState === "stopped" && freshness === "live" && (
                    <span className="text-muted-foreground text-[9px]">· Stopped</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {incomingLocation?.accuracy && (
                <p className="text-[10px] text-muted-foreground">±{Math.round(incomingLocation.accuracy)}m</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isSharingMine && (
                <button
                  onClick={handleStop}
                  className="text-[10px] text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  Stop sharing
                </button>
              )}
              {inCoords && (
                <a
                  href={`https://www.google.com/maps?q=${inCoords.lat},${inCoords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={10} />
                  Maps
                </a>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
