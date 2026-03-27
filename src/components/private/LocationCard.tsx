import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Loader2, AlertCircle, ExternalLink, Maximize2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SharedLocation, getFreshness, freshnessLabel, type FreshnessStatus } from "@/hooks/useLocationSharing";
import { useIsMobile } from "@/hooks/use-mobile";
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

function StatusDot({ status }: { status: FreshnessStatus }) {
  if (status === "live") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
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

/** Build an OpenStreetMap static map URL with one or two markers */
function buildStaticMapUrl(
  coords: { lat: number; lng: number }[],
  size: string,
  zoom?: number,
) {
  if (coords.length === 0) return "";

  // If two markers, compute center and appropriate zoom
  let center: { lat: number; lng: number };
  let z = zoom ?? 15;

  if (coords.length === 2) {
    center = {
      lat: (coords[0].lat + coords[1].lat) / 2,
      lng: (coords[0].lng + coords[1].lng) / 2,
    };
    // Rough zoom based on distance
    const dlat = Math.abs(coords[0].lat - coords[1].lat);
    const dlng = Math.abs(coords[0].lng - coords[1].lng);
    const maxDelta = Math.max(dlat, dlng);
    if (maxDelta > 0.1) z = 11;
    else if (maxDelta > 0.05) z = 12;
    else if (maxDelta > 0.02) z = 13;
    else if (maxDelta > 0.005) z = 14;
    else z = 15;
  } else {
    center = coords[0];
  }

  const markers = coords
    .map((c) => `${c.lat},${c.lng},red-pushpin`)
    .join("|");

  return `https://staticmap.openstreetmap.de/staticmap.php?center=${center.lat},${center.lng}&zoom=${z}&size=${size}&markers=${markers}`;
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
  const [, setTick] = useState(0);
  const isMobile = useIsMobile();

  // Smooth coordinate interpolation for incoming
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
  }, [incomingLocation?.latitude, incomingLocation?.longitude]);

  // Tick for freshness
  useEffect(() => {
    if (!incomingLocation && !isSharingMine) return;
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, [incomingLocation, isSharingMine]);

  const inCoords = displayCoords || (incomingLocation ? { lat: incomingLocation.latitude, lng: incomingLocation.longitude } : null);
  const myCoords = myLocation ? { lat: myLocation.latitude, lng: myLocation.longitude } : null;
  const freshness = incomingLocation ? getFreshness(incomingLocation.updated_at) : null;
  const label = incomingLocation ? freshnessLabel(incomingLocation.updated_at) : "";
  const hasAnyLocationActivity = isSharingMine || incomingLocation;

  // Build markers list for maps
  const allMapCoords: { lat: number; lng: number }[] = [];
  if (myCoords) allMapCoords.push(myCoords);
  if (inCoords) allMapCoords.push(inCoords);

  const handleTopTap = () => {
    if (isSharingMine || incomingLocation) {
      setMapOpen(true);
    } else {
      setDrawerOpen(true);
    }
  };

  const handleStartFromSheet = () => {
    setDrawerOpen(false);
    onStartSharing();
  };

  return (
    <div className="space-y-1.5">
      {/* ── Top status bar ── */}
      <button
        onClick={handleTopTap}
        className={`flex items-center gap-1.5 text-[11px] px-1.5 py-px transition-colors w-full text-left rounded ${
          isSharingMine
            ? "text-primary"
            : incomingLocation
              ? "text-foreground"
              : "text-muted-foreground/60 hover:text-muted-foreground"
        }`}
      >
        {isSharingMine ? (
          <>
            <StatusDot status="live" />
            <span className="font-medium">Sharing location…</span>
            <button
              onClick={(e) => { e.stopPropagation(); onStopSharing(); }}
              className="ml-auto text-[9px] text-muted-foreground/60 hover:text-destructive transition-colors flex items-center gap-0.5"
            >
              <Square size={8} />
              Stop
            </button>
          </>
        ) : incomingLocation ? (
          <>
            <StatusDot status={freshness!} />
            <span className="font-medium">{otherName} — {label}</span>
            <Maximize2 size={10} className="ml-auto text-muted-foreground/30" />
          </>
        ) : (
          <>
            <MapPin size={12} />
            <span>Location sharing</span>
          </>
        )}
      </button>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 flex items-start gap-2">
          <AlertCircle size={14} className="text-destructive mt-0.5 shrink-0" />
          <div className="space-y-1 flex-1">
            <p className="text-xs text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={onStartSharing} className="text-xs h-7">
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* ── Thread location card (visible when any location activity) ── */}
      {hasAnyLocationActivity && (
        <div className="rounded-lg border border-border/25 bg-card/50 overflow-hidden">
          <button onClick={() => setMapOpen(true)} className="block relative group w-full">
            <img
              src={buildStaticMapUrl(allMapCoords.length > 0 ? allMapCoords : [], "400x160")}
              alt="Location map"
              className="w-full h-[130px] object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Maximize2 size={16} className="text-background opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
            </div>
          </button>
          <div className="px-2.5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-primary" />
              {incomingLocation && freshness ? (
                <span className="text-[11px] text-foreground">
                  📍 {freshness === "live" ? "Live now" : label}
                </span>
              ) : isSharingMine ? (
                <span className="text-[11px] text-primary">📍 Sharing live</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMapOpen(true)}
                className="text-[10px] text-primary hover:underline"
              >
                Open Map
              </button>
              {isSharingMine && (
                <button
                  onClick={onStopSharing}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom sheet / dialog to start sharing ── */}
      {isMobile ? (
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

      {/* ── Full-screen map modal (shows BOTH users) ── */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <MapPin size={15} className="text-primary" />
              Live location
              {incomingLocation && (
                <span className="ml-auto flex items-center gap-1.5">
                  <StatusDot status={freshness!} />
                  <span className={`text-[10px] ${freshness === "live" ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="w-full relative">
            <img
              src={buildStaticMapUrl(allMapCoords.length > 0 ? allMapCoords : [], "600x400")}
              alt="Location map"
              className="w-full h-[50vh] object-cover"
              loading="lazy"
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
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  {otherName}
                </div>
              )}
            </div>
          </div>

          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {incomingLocation?.accuracy && (
                <p className="text-[11px] text-muted-foreground">±{Math.round(incomingLocation.accuracy)}m</p>
              )}
              {isSharingMine && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onStopSharing}
                  className="text-xs h-7 text-muted-foreground hover:text-destructive"
                >
                  Stop sharing
                </Button>
              )}
            </div>
            {inCoords && (
              <a
                href={`https://www.google.com/maps?q=${inCoords.lat},${inCoords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink size={12} />
                Google Maps
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
