

## Fix: Map Too Dark + Missing Business POIs

### Problem
The CSS invert filter on CartoDB Voyager tiles is too aggressive — `brightness(0.65)` makes roads invisible, and `saturate(0.25)` washes out POI labels so businesses/restaurants can't be read.

### Solution
Adjust the filter values on line 113 of `DarkMap.tsx`:

**Current:**
```css
filter: invert(1) hue-rotate(200deg) brightness(0.65) contrast(1.15) saturate(0.25);
```

**New:**
```css
filter: invert(1) hue-rotate(200deg) brightness(0.85) contrast(1.2) saturate(0.4);
```

- **brightness 0.65 → 0.85**: Roads and text become visible again
- **contrast 1.15 → 1.2**: Slightly more contrast to help POI text pop
- **saturate 0.25 → 0.4**: POI labels (which use color coding for businesses/restaurants) become readable without being garish

The Voyager tileset already includes business/restaurant POIs — they're just being crushed by the current filter. Brightening and adding saturation will make them legible while keeping the dark aesthetic.

### Scope
- Single line change in `src/components/private/DarkMap.tsx` line 113
- No other files affected
- No behavior changes

