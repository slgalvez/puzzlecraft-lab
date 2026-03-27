import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, X, Loader2, AlertCircle, ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SharedLocation, getFreshness, freshnessLabel, type FreshnessStatus } from "@/hooks/useLocationSharing";
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
  DialogClose,
} from "@/components/ui/dialog";

interface LocationCardProps {
  isSharingMine: boolean;
  loading: boolean;
  error: string | null;
  incomingLocation: SharedLocation | null;
  otherName: string;
  onStartSharing: () => void;
  onStopSharing: () => void;
}

/** Dot color by freshness */
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

export function LocationCard({
  isSharingMine,
  loading,
  error,
  incomingLocation,
  otherName,
  onStartSharing,
  onStopSharing,
}: LocationCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  // Force tick for freshness label updates
  const [, setTick] = useState(0);
  // Smooth coordinate interpolation
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
      const current = {
        lat: prev.lat + dLat * step,
        lng: prev.lng + dLng * step,
      };
      setDisplayCoords(current);
      if (step >= steps) {
        clearInterval(timer);
        prevCoordsRef.current = target;
      }
    }, 100);

    return () => clearInterval(timer);
  }, [incomingLocation?.latitude, incomingLocation?.longitude]);

  // Tick for freshness updates
  useEffect(() => {
    if (!incomingLocation) return;
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, [incomingLocation]);

  const freshness = incomingLocation ? getFreshness(incomingLocation.updated_at) : null;
  const label = incomingLocation ? freshnessLabel(incomingLocation.updated_at) : "";
  const coords = displayCoords || (incomingLocation ? { lat: incomingLocation.latitude, lng: incomingLocation.longitude } : null);

  const handleTopTap = () => {
    if (isSharingMine) {
      // Tap again to stop
      onStopSharing();
    } else {
      setDrawerOpen(true);
    }
  };

  const handleStartFromSheet = () => {
    setDrawerOpen(false);
    onStartSharing();
  };

  return (
    <div className="space-y-2">
      {/* Top element — always visible as the control */}
      <button
        onClick={handleTopTap}
        className={`flex items-center gap-2 text-xs px-1 py-1 transition-colors w-full text-left ${
          isSharingMine
            ? "text-primary"
            : "text-muted-foreground/60 hover:text-muted-foreground"
        }`}
      >
        {isSharingMine ? (
          <>
            <StatusDot status="live" />
            <span className="font-medium">Sharing location…</span>
            <span className="ml-auto text-[10px] text-muted-foreground/50">Tap to stop</span>
          </>
        ) : (
          <>
            <MapPin size={14} />
            <span>Location sharing</span>
          </>
        )}
      </button>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-destructive mt-0.5 shrink-0" />
          <div className="space-y-1 flex-1">
            <p className="text-xs text-destructive">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={onStartSharing}
              className="text-xs h-7"
            >
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* My sharing status detail */}
      {isSharingMine && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusDot status="live" />
              <span className="text-xs font-medium text-primary">Live location active</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onStopSharing}
              className="text-xs h-7 text-muted-foreground hover:text-destructive"
            >
              Stop
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {otherName} can see your current location
          </p>
        </div>
      )}

      {/* Incoming location card */}
      {incomingLocation && coords && (
        <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
          {/* Map preview */}
          <button
            onClick={() => setMapOpen(true)}
            className="block relative group w-full"
          >
            <img
              src={`https://staticmap.openstreetmap.de/staticmap.php?center=${coords.lat},${coords.lng}&zoom=15&size=400x200&markers=${coords.lat},${coords.lng},red-pushpin`}
              alt="Location map"
              className="w-full h-[140px] object-cover transition-opacity duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Maximize2 size={18} className="text-background opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
            </div>
          </button>
          <div className="p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-primary" />
                <span className="text-xs font-medium text-foreground">
                  {otherName}'s location
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot status={freshness!} />
                <span
                  className={`text-[10px] ${
                    freshness === "live"
                      ? "text-primary"
                      : freshness === "recent"
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              {incomingLocation.accuracy && (
                <p className="text-[10px] text-muted-foreground/60">
                  ±{Math.round(incomingLocation.accuracy)}m accuracy
                </p>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                <a
                  href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  <ExternalLink size={10} />
                  Open
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet for starting location sharing */}
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

      {/* Full-screen map modal */}
      {incomingLocation && coords && (
        <Dialog open={mapOpen} onOpenChange={setMapOpen}>
          <DialogContent className="max-w-[95vw] w-full sm:max-w-lg p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="flex items-center gap-2 text-sm">
                <MapPin size={15} className="text-primary" />
                {otherName}'s location
                <span className="ml-auto flex items-center gap-1.5">
                  <StatusDot status={freshness!} />
                  <span className={`text-[10px] ${freshness === "live" ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="w-full">
              <img
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${coords.lat},${coords.lng}&zoom=16&size=600x400&markers=${coords.lat},${coords.lng},red-pushpin`}
                alt="Location map"
                className="w-full h-[50vh] object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-4 pt-2 flex items-center justify-between">
              {incomingLocation.accuracy && (
                <p className="text-xs text-muted-foreground">±{Math.round(incomingLocation.accuracy)}m accuracy</p>
              )}
              <a
                href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink size={12} />
                Open in Google Maps
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
