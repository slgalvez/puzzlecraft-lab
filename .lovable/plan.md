
Problem identified

- The denial is coming from the browser/OS geolocation API itself, not from the messaging layer.
- In `src/hooks/useLocationSharing.ts`, location sharing starts by calling `navigator.geolocation.getCurrentPosition(...)`.
- If the browser returns error code `1`, the app always shows the generic denied message.
- Right now there is no permission pre-check, no platform-specific handling, and no distinction between:
  - site permission already blocked for this origin
  - iPhone/iPad web app permission state
  - OS-level Location Services disabled
  - approximate/precise location restrictions
- Separately, the PWA flow is fragile because `LocationCard` has its own standalone detection logic instead of using one shared PWA-mode check.

Why this is still happening

- The current code only reacts after geolocation fails.
- If permission was previously denied for the installed app/site, the browser can immediately reject without showing a prompt again.
- On iPhone/iPad installed web apps, permission behavior can differ from Safari tabs, so “it worked in browser / not in PWA” is possible.
- The app currently reports all of that as one simple “permission denied” state, so it feels like the fix did nothing.

Plan

1. Audit and unify permission detection
- Add a small isolated permission helper for location.
- Use `navigator.permissions.query({ name: "geolocation" })` where supported.
- Fall back safely on iOS where Permissions API support is inconsistent.
- Normalize states into: `granted`, `prompt`, `denied`, `unsupported`, `unavailable`.

2. Fix the share-start flow before requesting location
- In `useLocationSharing`, do a preflight permission check before `getCurrentPosition`.
- If already denied, show the correct recovery guidance immediately instead of attempting and failing generically.
- Keep the existing start/stop sharing behavior unchanged otherwise.

3. Add platform-specific denied guidance
- Browser tab: guide user to browser site settings.
- Installed PWA / iOS standalone: guide user to web app/site location permission path.
- OS services off / unavailable: separate message for device-level Location Services being disabled.
- Timeout remains its own state.

4. Stabilize PWA-mode detection
- Replace duplicated standalone detection in `LocationCard` with one shared helper (`isPwaMode` pattern already exists elsewhere).
- Ensure the top “Location sharing” control always renders and always opens the correct start UI in installed mode.
- Do not change layout structure or interaction model.

5. Tighten top bar spacing further
- Reduce top-bar vertical footprint again so it does not create extra blank space.
- Keep the same tap targets and behavior.
- Limit changes to padding, min-height, icon/text sizing, and border weight only.

Files to update

- `src/hooks/useLocationSharing.ts`
  - add permission preflight
  - distinguish denied vs unavailable vs timeout more accurately
  - keep live update logic isolated
- `src/components/private/LocationCard.tsx`
  - use shared PWA detection
  - keep top-bar behavior the same
  - reduce excess height/spacing
- `src/lib/privateNotifications.ts` or a small shared utility
  - reuse/extract the existing PWA-mode detection so location and notifications use one source of truth

Validation

- Mobile browser:
  - if permission is blocked, app shows the correct blocked-state guidance
  - if prompt is allowed, tapping share triggers the real permission prompt
- Installed PWA:
  - top “Location sharing” control is visible
  - start UI opens reliably
  - denied state gives PWA-specific recovery guidance
- After permission is granted:
  - sharing starts
  - thread card appears
  - map opens
  - stop sharing works
- Messaging, calls, layout, and scroll behavior remain unchanged

Most likely root cause summary

- The app is not “causing” the denial; the device/browser is returning a denied geolocation state.
- The current implementation is too shallow to detect that cleanly or recover gracefully, so the user only sees the same error again.
- The next pass should fix the diagnosis layer and the PWA-specific entry path, not the messaging/location backend.