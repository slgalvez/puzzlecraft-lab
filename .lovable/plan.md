

## Fix: Map Too Busy / Cluttered — Switch to Clean Dark Tiles

### Problem
CartoDB Voyager tiles include everything — house numbers, apartment outlines, housing footprints, small residential street names — and the CSS invert filter can't selectively hide those. No amount of filter tuning will remove unwanted labels from Voyager tiles.

### Solution
Switch from **CartoDB Voyager** to **CartoDB Dark Matter** (`dark_all`) tiles. Dark Matter is natively dark (no CSS invert filter needed) and shows a much cleaner, minimal map:
- Major roads and highways visible
- Street names appear only at higher zoom levels
- No house numbers, apartment outlines, or housing footprints
- Business/restaurant POIs are not shown by default (trade-off for cleanliness)

Two changes in `src/components/private/DarkMap.tsx`:

**1. Remove the CSS invert filter** (line 112-114):
```css
/* Remove this entirely */
.dark-map-container .leaflet-tile-pane {
  filter: invert(1) hue-rotate(200deg) brightness(1.6) contrast(1.3) saturate(0.5);
}
```

**2. Switch tile URL** (line 190):
```
From: https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
To:   https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

### Result
- Natively dark map — no filter hacks
- Clean, minimal aesthetic matching Apple Find My style
- Street names visible but subtle (light gray on dark)
- No residential clutter (house numbers, apartment labels, building outlines)
- Trade-off: no business POI labels (but the user's screenshot shows they don't need them — the map area is residential)

### Scope
- Single file: `src/components/private/DarkMap.tsx`
- Two small changes (remove filter CSS block, change tile URL)
- No behavior changes

