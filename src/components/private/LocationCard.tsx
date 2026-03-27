import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, X, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SharedLocation, getFreshness, freshnessLabel, type FreshnessStatus } from "@/hooks/useLocationSharing";

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
  const [expanded, setExpanded] = useState(false);
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

    // Animate over ~600ms in 6 steps
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

  const hasAnything = isSharingMine || incomingLocation || error;
  const freshness = incomingLocation ? getFreshness(incomingLocation.updated_at) : null;
  const label = incomingLocation ? freshnessLabel(incomingLocation.updated_at) : "";
  const coords = displayCoords || (incomingLocation ? { lat: incomingLocation.latitude, lng: incomingLocation.longitude } : null);

  return (
    <div className="space-y-2">
      {/* Compact toggle row */}
      {!hasAnything && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-1 py-1"
        >
          <MapPin size={14} />
          <span>Location sharing</span>
        </button>
      )}

      {expanded && !hasAnything && (
        <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <MapPin size={15} className="text-primary" />
              <span className="font-medium">Live Location</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-muted-foreground/50 hover:text-muted-foreground p-0.5"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share your current location with {otherName} in real time.
          </p>
          <Button
            size="sm"
            onClick={onStartSharing}
            disabled={loading}
            className="w-full text-xs gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Requesting access…
              </>
            ) : (
              <>
                <Navigation size={13} />
                Share Live Location
              </>
            )}
          </Button>
        </div>
      )}

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

      {/* My sharing status */}
      {isSharingMine && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusDot status="live" />
              <span className="text-xs font-medium text-primary">Sharing live location</span>
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

      {/* Incoming location from other user */}
      {incomingLocation && coords && (
        <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
          {/* Map preview */}
          <a
            href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative group"
          >
            <img
              src={`https://staticmap.openstreetmap.de/staticmap.php?center=${coords.lat},${coords.lng}&zoom=15&size=400x200&markers=${coords.lat},${coords.lng},red-pushpin`}
              alt="Location map"
              className="w-full h-[140px] object-cover transition-opacity duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ExternalLink size={20} className="text-background opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
            </div>
          </a>
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
            {incomingLocation.accuracy && (
              <p className="text-[10px] text-muted-foreground/60">
                ±{Math.round(incomingLocation.accuracy)}m accuracy
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
