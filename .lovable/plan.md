

## Location Sharing — Full Diagnostic & Stabilization Plan

### Issues Found

**A. Backend: `get-shared-location` has a logic gap for admin**
The admin's `viewer_profile_id` is set correctly when the *user* shares, but the query only looks for rows where `viewer_profile_id = profileId`. This is correct. However, the fallback query (any active share) could match stale shares from old conversations. Not a critical bug but could show wrong data.

**B. `useLocationSharing` hook: `fetchSharedLocation` doesn't sync outgoing state**
The hook polls `get-shared-location` which returns both `incoming` and `outgoing`, but the hook **ignores the `outgoing` field**. If the user navigates away and back, `isSharingMine` only gets restored from sessionStorage + `startGpsWatch`. If the backend says sharing is active but the local sessionStorage was cleared (e.g., new tab), the UI won't reflect it. This means the LocationCard and LocationView can show "Not sharing" even when the backend has an active share.

**C. LocationView: `viewerPos` silent GPS request can fail silently**
If permission isn't granted yet, the silent `getCurrentPosition` does nothing, so the "You" marker never appears until the user starts sharing. This is acceptable but means the map shows only one marker or empty state.

**D. LocationCard: no `viewerPos` fallback**
Unlike LocationView, the LocationCard (in conversation thread) has no silent GPS fallback — `myCoords` is only set from `myLocation` (active sharing). So the card's map never shows the user's position unless they're sharing.

**E. DarkMap: auto-fit logic is solid but coordinate interpolation in LocationCard creates flickering bounds**
The `displayCoords` interpolation in LocationCard causes the "other" marker to animate through 6 intermediate positions, which could cause the map to re-fit repeatedly if the marker count changes.

**F. Single-tap sharing: double-guard is good but `loading` state can get stuck**
If `getCurrentPosition` times out (15s), `setLoading(false)` is called in the error handler. This is correct. However, if the permission prompt is showing and the user dismisses it (not deny, just dismiss on some browsers), `getCurrentPosition` may never resolve, leaving `loading` stuck forever.

**G. Permission handling: iOS "unknown" state**
On iOS Safari, `queryLocationPermission` returns `"unknown"`. The code correctly falls through to `getCurrentPosition` which triggers the native prompt. This is fine.

**H. Freshness labels: tick interval only runs when `incomingLocation || isSharingMine`**
This is correct — no unnecessary timers.

### Plan (10 targeted fixes)

#### 1. Sync outgoing state from poll response
**File**: `src/hooks/useLocationSharing.ts`
In `fetchSharedLocation`, when the backend returns `data.outgoing?.active === true` but local `sharingRef.current` is false and sessionStorage has the sharing key, restore sharing state. This handles the case where the user opens a new tab or the component remounts after sessionStorage was cleared.

#### 2. Add loading timeout safety
**File**: `src/hooks/useLocationSharing.ts`
Add a 20s safety timeout in `startSharing` that resets `loading` to false if neither success nor error callback fires (handles dismissed permission prompts on some browsers).

#### 3. Add `viewerPos` fallback to LocationCard
**File**: `src/components/private/LocationCard.tsx`
Add the same silent `getCurrentPosition` pattern used in LocationView so the card can show the user's dot even when not actively sharing.

#### 4. Stabilize LocationCard coordinate interpolation
**File**: `src/components/private/LocationCard.tsx`
Only interpolate when the map is expanded/visible. Skip interpolation when collapsed to avoid unnecessary state updates.

#### 5. Improve "other user sharing" visibility in LocationCard
**File**: `src/components/private/LocationCard.tsx`
When `incomingLocation` exists but user is not sharing, make the status row more prominent — show the other user's name + freshness + distance clearly without requiring expansion.

#### 6. Improve LocationView empty state
**File**: `src/pages/private/LocationView.tsx`
When `viewerPos` is available but no incoming location, show the user's own position on the map with a message like "Waiting for [name] to share their location" instead of the generic empty state.

#### 7. Add clear "other is sharing" indicator to LocationView bottom bar
**File**: `src/pages/private/LocationView.tsx`
When `incomingLocation` exists, show the other user's sharing status in the bottom controls area (freshness dot + name + timestamp) so it's obvious at all times.

#### 8. Prevent stale fallback matches in backend
**File**: `supabase/functions/messaging/index.ts`
Add a staleness check to the fallback query — only match shares updated within the last 30 minutes to avoid showing ancient stale locations.

#### 9. Make error display in LocationView more actionable
**File**: `src/pages/private/LocationView.tsx`
Split error display to show each line separately (like LocationCard does) and add a "Try again" button.

#### 10. Ensure consistent state across views on start/stop
**File**: `src/hooks/useLocationSharing.ts`
When `stopSharing` is called, immediately clear `myLocation` state (set to null) so all consumers update instantly rather than showing stale coordinates.

### Technical Detail

```text
useLocationSharing hook changes:
├── fetchSharedLocation: check data.outgoing to sync isSharingMine
├── startSharing: add 20s loading timeout
├── stopSharing: clear myLocation immediately
└── no changes to GPS watch logic

LocationCard changes:
├── add silent viewerPos for map display
├── gate interpolation on expanded state
└── improve incoming-sharing status visibility

LocationView changes:
├── show own position even without incoming
├── add other-user status to bottom bar
└── improve error display

Backend (messaging/index.ts):
└── add updated_at recency filter on fallback query
```

### What This Does NOT Change
- Messaging, calls, auth, navigation — completely untouched
- No layout/design changes — only clarity improvements within existing components
- No new dependencies or tables
- DarkMap component — unchanged (already working correctly)

