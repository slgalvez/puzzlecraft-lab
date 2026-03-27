import { useState } from "react";
import { MapPin, Navigation, X, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
}

interface LocationCardProps {
  /** Whether the current user is sharing their location */
  isSharingMine: boolean;
  /** Loading state for starting location */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Incoming location from the other user */
  incomingLocation: SharedLocation | null;
  /** Other user's display name */
  otherName: string;
  onStartSharing: () => void;
  onStopSharing: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 10_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > 120_000; // 2 min
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

  const hasAnything = isSharingMine || incomingLocation || error;

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
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
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
      {incomingLocation && (
        <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
          {/* Map preview - static image from OpenStreetMap */}
          <a
            href={`https://www.google.com/maps?q=${incomingLocation.latitude},${incomingLocation.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative group"
          >
            <img
              src={`https://staticmap.openstreetmap.de/staticmap.php?center=${incomingLocation.latitude},${incomingLocation.longitude}&zoom=15&size=400x200&markers=${incomingLocation.latitude},${incomingLocation.longitude},red-pushpin`}
              alt="Location map"
              className="w-full h-[140px] object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
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
              <div className="flex items-center gap-1">
              {!isStale(incomingLocation.updated_at) && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                )}
                <span className={`text-[10px] ${isStale(incomingLocation.updated_at) ? "text-destructive" : "text-muted-foreground"}`}>
                  {isStale(incomingLocation.updated_at) ? "Paused · " : ""}
                  {timeAgo(incomingLocation.updated_at)}
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
