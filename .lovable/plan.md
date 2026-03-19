
Root cause: the white square is not coming from the login layout. `src/pages/private/Login.tsx` already renders the icon as a plain `<img>` with no card, badge, background, or wrapper styling. The visible box is baked into `src/assets/puzzle-lab-flask-v2.png` itself as leftover light matte/semi-transparent pixels across the image canvas. The file also still contains the floating puzzle pieces inside the bitmap, so the earlier UI cleanup did not fully solve the visual issue.

Plan:
1. Clean the existing `src/assets/puzzle-lab-flask-v2.png` in place rather than changing layout code.
   - Remove the baked-in light background/matte so the full canvas is truly transparent.
   - Preserve the flask artwork, colors, and white internal linework exactly as-is.
2. Remove the floating puzzle pieces from the same asset.
   - Keep only the flask mark.
   - Do not add animation, replacement pieces, or any new framing/background.
3. Keep `src/pages/private/Login.tsx` structurally unchanged.
   - Continue centering the icon above the title.
   - Only keep the current direct image rendering and sizing.
4. Verify the result against the current dark login background.
   - The icon should sit directly on the page with no visible square edge, haze, or container.
   - Spacing and typography should remain unchanged.

Technical detail:
- This is an asset-level fix, not a CSS fix.
- The bitmap needs alpha cleanup for near-white residual pixels, plus removal of the puzzle-piece pixels above the flask.
- After that, the login page should render correctly without further layout changes.
