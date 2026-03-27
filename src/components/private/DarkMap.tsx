import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getLocationLabels, type LocationLabel } from "@/lib/locationLabels";
import { Crosshair } from "lucide-react";

interface Marker {
  lat: number;
  lng: number;
  type: "me" | "other";
  label?: string;
}

interface DarkMapProps {
  markers: Marker[];
  labels?: LocationLabel[];
  className?: string;
  interactive?: boolean;
  onMapLongPress?: (lat: number, lng: number) => void;
}

// iOS-style glowing blue dot
function createMeDotIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(0,122,255,0.15);animation:iosPulse 2s ease-out infinite"></div>
      <div style="position:absolute;width:16px;height:16px;border-radius:50%;background:rgba(0,122,255,0.25)"></div>
      <div style="width:10px;height:10px;border-radius:50%;background:#007AFF;border:2px solid white;box-shadow:0 0 8px rgba(0,122,255,0.6);position:relative;z-index:1"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createOtherIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center">
      <div style="width:10px;height:10px;border-radius:50%;background:#FF6B6B;border:2px solid white;box-shadow:0 0 6px rgba(255,107,107,0.5)"></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createLabelIcon(emoji: string, name: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;pointer-events:none">
      <div style="font-size:18px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">${emoji}</div>
      <div style="font-size:9px;color:white;background:rgba(0,0,0,0.6);padding:1px 4px;border-radius:3px;white-space:nowrap;backdrop-filter:blur(4px)">${name}</div>
    </div>`,
    iconSize: [40, 36],
    iconAnchor: [20, 18],
  });
}

// Inject pulse keyframes once
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes iosPulse {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    .dark-map-container .leaflet-control-attribution {
      display: none !important;
    }
    .dark-map-container .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
    }
    .dark-map-container .leaflet-control-zoom a {
      background: rgba(30,30,30,0.85) !important;
      color: #ccc !important;
      border: none !important;
      backdrop-filter: blur(8px);
    }
    .dark-map-container .leaflet-control-zoom a:hover {
      background: rgba(50,50,50,0.9) !important;
      color: white !important;
    }
  `;
  document.head.appendChild(style);
}

export default function DarkMap({ markers, labels, className = "", interactive = true, onMapLongPress }: DarkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const labelMarkersRef = useRef<L.Marker[]>([]);
  const initialFitDone = useRef(false);
  const userInteracted = useRef(false);
  const [showRecenter, setShowRecenter] = useState(false);

  // Track if user has panned/zoomed
  const onUserInteraction = useCallback(() => {
    userInteracted.current = true;
    setShowRecenter(true);
  }, []);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    userInteracted.current = false;
    setShowRecenter(false);

    const bounds: L.LatLngExpression[] = [];
    markersRef.current.forEach((m) => bounds.push(m.getLatLng()));
    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 16, animate: true });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15, { animate: true });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    injectStyles();

    const map = L.map(containerRef.current, {
      zoomControl: interactive,
      attributionControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: false,
      keyboard: false,
    }).setView([0, 0], 15);

    // CartoDB Dark Matter tiles — free, no API key
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Detect user interaction to pause auto-follow
    if (interactive) {
      map.on("dragstart", onUserInteraction);
      map.on("zoomstart", () => {
        // Only count as user interaction if it's not programmatic
        if (!map._programmaticZoom) onUserInteraction();
      });
    }

    mapRef.current = map;

    // Long press for adding labels
    if (onMapLongPress) {
      let pressTimer: ReturnType<typeof setTimeout> | null = null;
      let pressCoords: { lat: number; lng: number } | null = null;

      map.on("mousedown", (e: L.LeafletMouseEvent) => {
        pressCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
        pressTimer = setTimeout(() => {
          if (pressCoords) onMapLongPress(pressCoords.lat, pressCoords.lng);
        }, 600);
      });
      map.on("mouseup mousemove", () => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      });

      // Touch support
      map.on("contextmenu", (e: L.LeafletMouseEvent) => {
        e.originalEvent.preventDefault();
        onMapLongPress(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      initialFitDone.current = false;
      userInteracted.current = false;
    };
  }, [interactive, onMapLongPress, onUserInteraction]);

  // Update markers — only auto-fit on first load or when user hasn't interacted
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds: L.LatLngExpression[] = [];

    markers.forEach((m) => {
      const icon = m.type === "me" ? createMeDotIcon() : createOtherIcon();
      const marker = L.marker([m.lat, m.lng], { icon, interactive: false }).addTo(map);
      if (m.label) {
        marker.bindTooltip(m.label, {
          permanent: false,
          direction: "top",
          offset: [0, -14],
          className: "dark-map-tooltip",
        });
      }
      markersRef.current.push(marker);
      bounds.push([m.lat, m.lng]);
    });

    // Only auto-fit on first load or if user hasn't interacted
    if (!userInteracted.current) {
      if (bounds.length > 1) {
        (map as any)._programmaticZoom = true;
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 16, animate: initialFitDone.current });
        setTimeout(() => { (map as any)._programmaticZoom = false; }, 300);
      } else if (bounds.length === 1) {
        (map as any)._programmaticZoom = true;
        map.setView(bounds[0], 15, { animate: initialFitDone.current });
        setTimeout(() => { (map as any)._programmaticZoom = false; }, 300);
      }
      initialFitDone.current = true;
    }
  }, [markers]);

  // Update label markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    labelMarkersRef.current.forEach((m) => m.remove());
    labelMarkersRef.current = [];

    const allLabels = labels ?? getLocationLabels();
    allLabels.forEach((l) => {
      const marker = L.marker([l.lat, l.lng], {
        icon: createLabelIcon(l.icon, l.name),
        interactive: false,
      }).addTo(map);
      labelMarkersRef.current.push(marker);
    });
  }, [labels]);

  return (
    <div className={`relative ${className}`} style={{ overflow: "hidden" }}>
      <div
        ref={containerRef}
        className="dark-map-container w-full h-full"
        style={{ background: "#1a1a2e", position: "relative", zIndex: 0 }}
      />
      {/* Re-center button */}
      {interactive && showRecenter && (
        <button
          onClick={handleRecenter}
          className="absolute bottom-3 right-3 z-[500] bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-lg border border-border/30 hover:bg-background/90 transition-colors"
          title="Re-center"
        >
          <Crosshair size={16} className="text-primary" />
        </button>
      )}
    </div>
  );
}
