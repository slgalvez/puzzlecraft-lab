

## Auto-Accept Location Sharing for Previously Approved Users

### Problem
When a user has already approved location sharing (backend has an active share), they still briefly see "Not sharing" / "Start sharing" until the first poll response arrives (~5s). The user wants it to feel instant — if sharing was previously approved, show their location immediately without requiring another tap.

### Current State
The auto-resume logic already exists in two places:
1. **sessionStorage resume** (line ~380 in `useLocationSharing.ts`) — works within the same browser session
2. **Backend sync** (line 100) — polls `get-shared-location`, and if `outgoing.active` is true, restarts GPS

Both work, but there's a visible delay before the first poll completes where the UI shows "Not sharing".

### Solution
Two small changes in `src/hooks/useLocationSharing.ts`:

**1. Initialize `isSharingMine` from sessionStorage** (not just `false`)
Instead of `useState(false)`, check sessionStorage immediately so the UI never flashes "Not sharing" for returning users:
```ts
const [isSharingMine, setIsSharingMine] = useState(
  () => sessionStorage.getItem(SHARING_KEY) === "1"
);
```

**2. Initialize `sharingRef` from sessionStorage too:**
```ts
const initiallySharing = sessionStorage.getItem(SHARING_KEY) === "1";
const sharingRef = useRef(initiallySharing);
```

This means:
- On first render, if sessionStorage says sharing was active, `isSharingMine` is already `true` → UI shows "Sharing live location" immediately
- The existing auto-resume `useEffect` (line ~380) will start GPS watch on mount
- The existing backend sync poll (line 100) serves as a fallback for cases where sessionStorage was cleared but backend still has an active share
- No additional permission prompt — `permissionGrantedRef` is set to `true` in the auto-resume effect

### Scope
- Single file: `src/hooks/useLocationSharing.ts`
- Two lines changed (initial state values)
- No behavior changes — just eliminates the "Not sharing" flash for returning users

