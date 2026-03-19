

## Problem

The flask icon (`src/assets/puzzle-lab-flask-v2.png`) had its transparent background filled with solid `#16181d` in a previous step. Even though this was intended to match the page background, the result is a visible rectangular block around the icon because:
1. The filled color may not perfectly match the rendered page background
2. The image's bounding box creates a hard edge against the page gradient/color

## Solution

Regenerate the flask icon with a **fully transparent background** (revert the color fill). The page's own CSS background will show through naturally, eliminating any visible rectangle.

### Steps

1. **Re-process `src/assets/puzzle-lab-flask-v2.png`** using a Python script to restore transparency:
   - Load the current image
   - Identify the background color (`#16181d` / RGB 22,24,29) pixels
   - Convert those pixels back to fully transparent (alpha = 0)
   - Save the result as a proper RGBA PNG with transparent background

2. **No code changes needed** — the `<img>` tag in `Login.tsx` already has `object-contain` and no container styling, so a transparent PNG will blend perfectly.

### Technical Detail
- Use PIL/Pillow to scan all pixels matching RGB(22,24,29) within a small tolerance and set their alpha to 0
- This preserves all flask artwork while removing only the background fill

