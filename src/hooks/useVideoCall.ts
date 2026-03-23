import { useState, useRef, useCallback, useEffect } from "react";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type CallState =
  | "idle"
  | "requesting-media"
  | "outgoing-ringing"
  | "incoming-ringing"
  | "connecting"
  | "connected"
  | "ended";

export interface IncomingCallInfo {
  callId: string;
  callerName: string;
  callerProfileId: string;
}

interface UseVideoCallOptions {
  token: string;
  conversationId: string | null;
  onSessionExpired: () => void;
}

export function useVideoCall({ token, conversationId, onSessionExpired }: UseVideoCallOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<"good" | "fair" | "poor" | "unknown">("unknown");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const lastSignalIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval>>();
  const incomingPollRef = useRef<ReturnType<typeof setInterval>>();
  const durationTimerRef = useRef<ReturnType<typeof setInterval>>();
  const connectedAtRef = useRef<number>(0);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet = useRef(false);
  const isCallerRef = useRef(false);
  const cleaningUp = useRef(false);
  const sessionExpiredRef = useRef(false);
  // Refs to avoid stale closures
  const localStreamRef = useRef<MediaStream | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const tokenRef = useRef(token);

  // Keep refs in sync with state
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Stable cleanup — uses ref instead of stale localStream closure
  const cleanup = useCallback(() => {
    if (cleaningUp.current) return;
    cleaningUp.current = true;

    clearInterval(pollTimerRef.current);
    clearInterval(durationTimerRef.current);

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // Use ref so we always stop the actual current stream
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    callIdRef.current = null;
    lastSignalIdRef.current = null;
    iceCandidateBuffer.current = [];
    remoteDescSet.current = false;
    cleaningUp.current = false;
  }, []); // stable — no state deps

  const handleSessionEnded = useCallback(() => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;
    clearInterval(pollTimerRef.current);
    clearInterval(incomingPollRef.current);
    clearInterval(durationTimerRef.current);
    setIncomingCall(null);
    cleanup();
    onSessionExpired();
  }, [cleanup, onSessionExpired]);

  // Stable API caller — uses tokenRef so it doesn't cascade when localStream changes
  const api = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    try {
      return await invokeMessaging(action, tokenRef.current, data);
    } catch (e) {
      if (e instanceof SessionExpiredError) handleSessionEnded();
      throw e;
    }
  }, [handleSessionEnded]);

  const facingModeRef = useRef<"user" | "environment">("user");

  const getVideoConstraints = useCallback((facing: "user" | "environment" = "user"): MediaTrackConstraints => ({
    facingMode: { ideal: facing },
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 },
  }), []);

  const getMedia = useCallback(async (facing: "user" | "environment" = "user") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(facing),
        audio: true,
      });
      facingModeRef.current = facing;
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch {
      // Try audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCameraOff(true);
        return stream;
      } catch {
        throw new Error("Could not access camera or microphone. Please check permissions.");
      }
    }
  }, [getVideoConstraints]);

  const fetchIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    try {
      const data = await api("get-turn-credentials");
      if (data.iceServers && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        console.debug("[video-call] got ICE servers:", data.iceServers.length);
        return data.iceServers;
      }
    } catch (e) {
      console.warn("[video-call] failed to fetch TURN credentials, using STUN fallback:", e);
    }
    return FALLBACK_ICE_SERVERS;
  }, [api]);

  const createPeerConnection = useCallback((stream: MediaStream, iceServers: RTCIceServer[] = FALLBACK_ICE_SERVERS) => {
    const pc = new RTCPeerConnection({ iceServers });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const remote = new MediaStream();
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && callIdRef.current) {
        api("send-signal", {
          call_id: callIdRef.current,
          signal_type: "ice-candidate",
          payload: event.candidate.toJSON(),
        }).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      console.debug("[video-call] connectionState:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallState("connected");
        connectedAtRef.current = Date.now();
        durationTimerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - connectedAtRef.current) / 1000));
        }, 1000);
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        endCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [api]);

  const processSignals = useCallback(async (signals: Array<{ id: string; signal_type: string; payload: unknown }>) => {
    const pc = pcRef.current;
    if (!pc) return;

    for (const sig of signals) {
      lastSignalIdRef.current = sig.id;
      console.debug("[video-call] processing signal:", sig.signal_type, "isCaller:", isCallerRef.current);

      try {
        if (sig.signal_type === "offer" && !isCallerRef.current) {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
          remoteDescSet.current = true;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await api("send-signal", {
            call_id: callIdRef.current,
            signal_type: "answer",
            payload: answer,
          });
          // Process buffered ICE candidates
          for (const c of iceCandidateBuffer.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          iceCandidateBuffer.current = [];
        } else if (sig.signal_type === "answer" && isCallerRef.current) {
          // Guard: skip if we already set the remote description (duplicate answer)
          if (remoteDescSet.current) {
            console.debug("[video-call] skipping duplicate answer signal");
            continue;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
          remoteDescSet.current = true;
          // Process buffered ICE candidates
          for (const c of iceCandidateBuffer.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          iceCandidateBuffer.current = [];
        } else if (sig.signal_type === "ice-candidate") {
          const candidate = sig.payload as RTCIceCandidateInit;
          if (remoteDescSet.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            iceCandidateBuffer.current.push(candidate);
          }
        }
      } catch (sigErr) {
        console.error("[video-call] signal processing error:", sigErr);
      }
    }
  }, [api]);

  const startPolling = useCallback(() => {
    clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      if (!callIdRef.current || sessionExpiredRef.current) return;
      try {
        const data = await api("poll-call", {
          call_id: callIdRef.current,
          last_signal_id: lastSignalIdRef.current,
        });

        if (data.status === "ended") {
          setEndReason(data.end_reason);
          setCallState("ended");
          cleanup();
          return;
        }

        if (data.signals && data.signals.length > 0) {
          await processSignals(data.signals);
        }

        // Use ref to avoid stale callState closure
        if (data.status === "connected" && callStateRef.current === "outgoing-ringing") {
          setCallState("connecting");
        }
      } catch (e) {
        if (e instanceof SessionExpiredError) return;
        // Ignore polling errors
      }
    }, 1500);
  }, [api, processSignals, cleanup]);

  // Start an outgoing call
  const startCall = useCallback(async () => {
    if (!conversationId || !tokenRef.current || callStateRef.current !== "idle") return;

    setCallState("requesting-media");
    setEndReason(null);
    isCallerRef.current = true;

    try {
      const stream = await getMedia();
      console.debug("[video-call] media acquired, fetching TURN credentials & starting call");
      const [iceServers, callData] = await Promise.all([
        fetchIceServers(),
        api("start-call", { conversation_id: conversationId }),
      ]);
      callIdRef.current = callData.call_id;
      console.debug("[video-call] call created:", callData.call_id);

      setCallState("outgoing-ringing");

      const pc = createPeerConnection(stream, iceServers);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await api("send-signal", {
        call_id: callData.call_id,
        signal_type: "offer",
        payload: offer,
      });
      console.debug("[video-call] offer sent, starting polling");

      startPolling();
    } catch (e) {
      if (e instanceof SessionExpiredError) return;
      console.error("[video-call] startCall error:", e);
      setEndReason((e as Error).message || "failed");
      setCallState("ended");
      cleanup();
    }
  }, [conversationId, getMedia, fetchIceServers, api, createPeerConnection, startPolling, cleanup]);

  // Accept an incoming call
  const acceptCall = useCallback(async (callId: string) => {
    setCallState("requesting-media");
    setEndReason(null);
    isCallerRef.current = false;
    callIdRef.current = callId;

    try {
      const [stream, iceServers] = await Promise.all([getMedia(), fetchIceServers()]);
      console.debug("[video-call] media acquired, answering call:", callId);
      await api("answer-call", { call_id: callId });
      setCallState("connecting");

      createPeerConnection(stream, iceServers);
      setIncomingCall(null);
      startPolling();
    } catch (e) {
      if (e instanceof SessionExpiredError) return;
      console.error("[video-call] acceptCall error:", e);
      setEndReason((e as Error).message || "failed");
      setCallState("ended");
      cleanup();
    }
  }, [getMedia, fetchIceServers, api, createPeerConnection, startPolling, cleanup]);

  // Decline an incoming call
  const declineCall = useCallback(async (callId: string) => {
    try {
      await api("decline-call", { call_id: callId });
    } catch {
      // Ignore
    }
    setIncomingCall(null);
  }, [api]);

  // End an active call
  const endCall = useCallback(async () => {
    if (!callIdRef.current) return;
    const cid = callIdRef.current;
    // Cleanup FIRST so tracks stop, then notify server
    cleanup();
    setCallState("ended");
    try {
      await api("end-call", { call_id: cid });
    } catch {
      // Ignore
    }
  }, [api, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCameraOff((c) => !c);
  }, []);

  // Switch between front and rear camera
  const switchCamera = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !localStreamRef.current) return;

    const nextFacing = facingModeRef.current === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(nextFacing),
        audio: false, // keep existing audio track
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      // Replace the track on the peer connection sender so remote sees new camera
      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender) {
        await videoSender.replaceTrack(newVideoTrack);
      }

      // Stop old video track
      const oldStream = localStreamRef.current;
      oldStream.getVideoTracks().forEach((t) => t.stop());

      // Build a clean new stream with existing audio + new video
      const audioTracks = oldStream.getAudioTracks();
      const combinedStream = new MediaStream([...audioTracks, newVideoTrack]);

      facingModeRef.current = nextFacing;
      setIsFrontCamera(nextFacing === "user");
      localStreamRef.current = combinedStream;
      setLocalStream(combinedStream);
    } catch (err) {
      console.warn("[video-call] switchCamera failed:", err);
    }
  }, [getVideoConstraints]);

  // Poll for incoming calls
  useEffect(() => {
    if (!conversationId || !token || callState !== "idle") {
      clearInterval(incomingPollRef.current);
      return;
    }

    const check = async () => {
      if (sessionExpiredRef.current) return;
      try {
        const data = await api("check-incoming-call", { conversation_id: conversationId });
        if (data.call) {
          setIncomingCall({
            callId: data.call.id,
            callerName: data.call.caller_name,
            callerProfileId: data.call.caller_profile_id,
          });
        } else {
          setIncomingCall(null);
        }
      } catch (e) {
        if (e instanceof SessionExpiredError) return;
        // Ignore
      }
    };

    check();
    incomingPollRef.current = setInterval(check, 3000);
    return () => clearInterval(incomingPollRef.current);
  }, [conversationId, token, callState, api]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(pollTimerRef.current);
      clearInterval(incomingPollRef.current);
      clearInterval(durationTimerRef.current);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      // Stop tracks on unmount
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Connection quality monitoring
  useEffect(() => {
    if (callState !== "connected" || !pcRef.current) {
      setConnectionQuality("unknown");
      return;
    }
    const pc = pcRef.current;
    const poll = setInterval(async () => {
      try {
        const stats = await pc.getStats();
        let rtt = -1;
        let lost = 0;
        let received = 0;
        stats.forEach((report: any) => {
          if (report.type === "candidate-pair" && report.currentRoundTripTime !== undefined) {
            rtt = report.currentRoundTripTime;
          }
          if (report.type === "inbound-rtp" && report.kind === "video") {
            lost = report.packetsLost || 0;
            received = report.packetsReceived || 0;
          }
        });
        if (rtt < 0 && received === 0) {
          setConnectionQuality("unknown");
        } else if (rtt > 0.3 || (received > 0 && lost / received > 0.05)) {
          setConnectionQuality("poor");
        } else if (rtt > 0.15 || (received > 0 && lost / received > 0.02)) {
          setConnectionQuality("fair");
        } else {
          setConnectionQuality("good");
        }
      } catch {
        // Ignore stats errors
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [callState]);

  // Auto-dismiss ended state — give enough time for end-call API to complete and user to see result
  useEffect(() => {
    if (callState !== "ended") return;
    const timer = setTimeout(() => {
      setCallState("idle");
      setEndReason(null);
      setCallDuration(0);
    }, 2000);
    return () => clearTimeout(timer);
  }, [callState]);

  // Reset to idle (kept for backward compat)
  const dismissEnd = useCallback(() => {
    setCallState("idle");
    setEndReason(null);
    setCallDuration(0);
  }, []);

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isFrontCamera,
    callDuration,
    endReason,
    incomingCall,
    connectionQuality,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    dismissEnd,
  };
}
