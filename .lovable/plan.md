

# Diagnosis: Video Call Dropped But Can't Call Back

## What Happened

Your call dropped due to a WebRTC connection failure (likely a network hiccup), but the server-side call record was **never cleaned up**. There is currently a call stuck in `connected` status in the database (call ID `c38eea7e...`, connected at 00:42 UTC). When you try to start a new call, the server sees this "active" call and rejects with "A call is already active" (HTTP 409).

The root cause: when the WebRTC peer connection drops (disconnected/failed state), the client runs `cleanup()` locally (stops tracks, closes peer connection) and then tries to call `end-call` on the server. But by that point, the call state is already set to `ended` and the `endCall` guard (`if callState === "ended" return`) prevents the API call from firing. The server never learns the call ended.

## Immediate Fix (unblock you now)

Force-end the stuck call in the database so you can call again immediately.

## Code Fix (prevent recurrence)

**`src/hooks/useVideoCall.ts`** — Two changes:

1. **In `endCall`**: The current code calls `cleanup()` first (which sets state to "ended"), then tries the API call. But the guard at the top checks `callStateRef.current === "ended"` and bails. Fix: capture the call ID before cleanup, and always send the end-call API regardless of state.

2. **In `scheduleRecoveryGuard` (the disconnect/fail handler)**: When the recovery timer fires and the connection is still dead, it calls `cleanup()` and sets state to `ended` — but never calls `end-call` on the server. Fix: after cleanup, also fire the `end-call` API with the captured call ID.

### Specific changes:

**scheduleRecoveryGuard** (~line 228): After cleanup, also notify the server:
```typescript
const capturedCallId = callIdRef.current;
// ... existing cleanup + setState ...
if (capturedCallId) {
  api("end-call", { call_id: capturedCallId }).catch(() => {});
}
```

**endCall** (~line 487): Capture call ID before cleanup to avoid the guard issue:
```typescript
const endCall = useCallback(async () => {
  const cid = callIdRef.current;
  if (!cid || callStateRef.current === "idle") return;
  // Allow ending even if already "ended" state (retry)
  diag("endCall", { callId: cid });
  cleanup();
  setCallState("ended");
  try {
    await api("end-call", { call_id: cid });
  } catch { }
}, [api, cleanup]);
```

### Database cleanup (migration):

Run a one-time update to end the stuck call so you can call right now:
```sql
UPDATE calls SET status = 'ended', ended_at = NOW(), end_reason = 'stale'
WHERE id = 'c38eea7e-dac7-43b5-ba66-9995386cee38' AND status = 'connected';
```

