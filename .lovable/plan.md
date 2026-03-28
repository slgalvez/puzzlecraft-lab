

## Location Sharing — Full Diagnostic Report

### Files Reviewed
- `DarkMap.tsx` — map component, tile layer, markers, labels
- `LocationCard.tsx` — conversation view map modal + status
- `LocationView.tsx` — full-page location tab
- `useLocationSharing.ts` — core sharing hook
- `locationPermission.ts`, `locationLabels.ts`, `locationUtils.ts` — utilities
- `messaging/index.ts` — backend location actions
- `AdminConversationView.tsx`, `UserConversation.tsx` — conversation pages
- `AdminDashboard.tsx`, `UserOverview.tsx` — overview pages
- `PrivateSidebar.tsx` — sidebar badge

---

### Issues Found

**1. Map tiles may fail to load (white map)**
The tile URL `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png` is correct and should work. However, the previous report of a white map suggests the tiles may not load in the preview iframe due to CSP or network restrictions. The `@2x.png` suffix is fine for retina. If tiles still fail, this is an environment issue, not a code issue.

**Status: Monitor — no code change needed unless tiles fail again.**

**2. `fetchSharedLocation` missing `startGpsWatch` in dependency array**
Line 110: `fetchSharedLocation` uses `startGpsWatch` (line 105) but its `useCallback` deps are `[token, conversationId, onSessionExpired]`. This is a stale closure risk. If `sendUpdate` changes (which `startGpsWatch` depends on), the old `startGpsWatch` reference would be used.

**Impact: Low — `sendUpdate` is stable, but this is technically incorrect.**
**Fix: Add `startGpsWatch` to the dependency array on line 110.**

**3. No other functional issues found**

Everything else checks out:
- **Both sides see each other**: Backend `get-shared-location` correctly queries `viewer_profile_id = profileId` for incoming, and `sharer_profile_id = profileId` for outgoing. Both admin and user set `viewer_profile_id` to the other party (line 1693).
- **Admin conversation view**: Uses `useLocationSharing` with `conversationId` from URL params — correct.
- **User conversation view**: Uses `useLocationSharing` with `conversationId` from `get-my-conversation` — correct.
- **LocationCard**: Properly receives and displays both `myLocation` and `incomingLocation`, shows status dot, distance, motion, freshness — all correct.
- **LocationView (full page)**: Shows map with both markers, legend, distance, motion, waiting state, labels — all correct.
- **Overview pages**: Both admin and user overview pages check `get-shared-location` and show location activity — correct.
- **Sidebar**: Checks location activity and shows badge dot — correct.
- **Sharing persistence**: `sessionStorage` + backend sync ensures sharing survives navigation — correct.
- **Stop sharing**: Clears watch, sends backend stop, clears state — correct.
- **Labels**: CRUD operations with localStorage — correct.
- **Map markers**: "me" dot uses theme color, "other" uses red with initial — correct.
- **Distance/motion/freshness**: All computed correctly from coordinates and timestamps.

---

### Summary

Only one minor code fix needed:

**File: `src/hooks/useLocationSharing.ts`, line 110**
Add `startGpsWatch` to the `fetchSharedLocation` dependency array:
```ts
// Change from:
}, [token, conversationId, onSessionExpired]);
// To:
}, [token, conversationId, onSessionExpired, startGpsWatch]);
```

Everything else — both-side visibility, map rendering, conversation integration, overview status, sidebar badges, labels, distance, motion, freshness, start/stop flow, permission handling — is working correctly.

### No changes needed for:
- Messaging — untouched, working
- Calls — untouched, working
- Navigation — untouched, working
- Auth/login — untouched, working

