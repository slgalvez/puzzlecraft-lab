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

/** Read the current --primary HSL value from .private-app and return as css hsl() */
function getThemeColor(): string {
  const el = document.querySelector(".private-app") as HTMLElement | null;
  const hsl = el?.style.getPropertyValue("--primary")?.trim();
  if (hsl) return `hsl(${hsl})`;
  return "#007AFF";
}

function getThemeColorRgba(alpha: number): string {
  const el = document.querySelector(".private-app") as HTMLElement | null;
  const hsl = el?.style.getPropertyValue("--primary")?.trim();
  if (!hsl) return `rgba(0,122,255,${alpha})`;
  // parse "H S% L%" and return hsla
  return `hsla(${hsl.replace(/%/g, "%,")} ${alpha})`;
}

// iOS-style glowing dot for "You" — uses theme color
function createMeDotIcon(): L.DivIcon {
  const c = getThemeColor();
  const c12 = getThemeColorRgba(0.12);
  const c20 = getThemeColorRgba(0.2);
  const c60 = getThemeColorRgba(0.6);
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:${c12};animation:iosPulse 2s ease-out infinite"></div>
      <div style="position:absolute;width:18px;height:18px;border-radius:50%;background:${c20}"></div>
      <div style="width:12px;height:12px;border-radius:50%;background:${c};border:2.5px solid white;box-shadow:0 0 10px ${c60};position:relative;z-index:1"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Distinct marker for the other user — warm color with initials
function createOtherIcon(name?: string): L.DivIcon {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center">
      <div style="width:28px;height:28px;border-radius:50%;background:#FF6B6B;border:2.5px solid white;box-shadow:0 0 8px rgba(255,107,107,0.4);display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-size:12px;font-weight:700;line-height:1">${initial}</span>
      </div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createLabelIcon(emoji: string, name: string): L.DivIcon {
  const c30 = getThemeColorRgba(0.3);
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;pointer-events:none">
      <div style="font-size:18px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))">${emoji}</div>
      <div style="font-size:9px;color:white;background:rgba(0,0,0,0.6);padding:1px 4px;border-radius:3px;white-space:nowrap;backdrop-filter:blur(4px);border-bottom:1.5px solid ${c30}">${name}</div>
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
    .dark-map-tooltip {
      background: rgba(20,20,20,0.85) !important;
      color: #e0e0e0 !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 6px !important;
      font-size: 11px !important;
      padding: 3px 8px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
      backdrop-filter: blur(8px);
    }
    .dark-map-tooltip::before {
      border-top-color: rgba(20,20,20,0.85) !important;
    }
  `;
  document.head.appendChild(style);
}

export default function DarkMap({ markers, labels, className = "", interactive = true, onMapLongPress }: DarkMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const labelMarkersRef = useRef<L.Marker[]>([]);
  const userInteracted = useRef(false);
  const [showRecenter, setShowRecenter] = useState(false);
  const prevMarkerCountRef = useRef(0);

  const onUserInteraction = useCallback(() => {
    userInteracted.current = true;
    setShowRecenter(true);
  }, []);

  const fitMapToBounds = useCallback((map: L.Map, bounds: L.LatLngExpression[], animate = false) => {
    if (bounds.length === 0) return;
    (map as any)._programmaticZoom = true;
    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), {
        padding: [60, 60],
        maxZoom: 15,
        animate,
      });
    } else {
      map.setView(bounds[0], 15, { animate });
    }
    setTimeout(() => { (map as any)._programmaticZoom = false; }, 300);
  }, []);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    userInteracted.current = false;
    setShowRecenter(false);

    const bounds: L.LatLngExpression[] = [];
    markersRef.current.forEach((m) => bounds.push(m.getLatLng()));
    fitMapToBounds(map, bounds, true);
  }, [fitMapToBounds]);

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

    // CartoDB Voyager — includes POI labels (businesses, landmarks, neighborhoods)
    // Dark theme achieved via CSS invert filter on .leaflet-tile-pane
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Detect user interaction to pause auto-follow
    if (interactive) {
      map.on("dragstart", onUserInteraction);
      map.on("zoomstart", () => {
        if (!(map as any)._programmaticZoom) onUserInteraction();
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

      map.on("contextmenu", (e: L.LeafletMouseEvent) => {
        e.originalEvent.preventDefault();
        onMapLongPress(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      prevMarkerCountRef.current = 0;
      userInteracted.current = false;
    };
  }, [interactive, onMapLongPress, onUserInteraction]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds: L.LatLngExpression[] = [];

    markers.forEach((m) => {
      const icon = m.type === "me" ? createMeDotIcon() : createOtherIcon(m.label);
      const marker = L.marker([m.lat, m.lng], { icon, interactive: false }).addTo(map);
      if (m.label) {
        marker.bindTooltip(m.label, {
          permanent: false,
          direction: "top",
          offset: [0, -16],
          className: "dark-map-tooltip",
        });
      }
      markersRef.current.push(marker);
      bounds.push([m.lat, m.lng]);
    });

    const currentCount = markers.length;
    const prevCount = prevMarkerCountRef.current;

    const shouldAutoFit =
      (prevCount === 0 && currentCount > 0) ||
      (prevCount === 1 && currentCount === 2) ||
      (!userInteracted.current && currentCount > 0);

    if (shouldAutoFit && bounds.length > 0) {
      if (prevCount === 1 && currentCount === 2) {
        userInteracted.current = false;
        setShowRecenter(false);
      }
      fitMapToBounds(map, bounds, prevCount > 0);
    }

    prevMarkerCountRef.current = currentCount;
  }, [markers, fitMapToBounds]);

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
      {/* Re-center button — always visible when interactive */}
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
