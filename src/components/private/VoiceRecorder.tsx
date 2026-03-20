import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, duration: number) => void;
}

/** Inline voice recorder: hold mic to record, preview before sending */
export function VoiceRecorder({ onRecorded }: VoiceRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [duration, setDuration] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);
  const recordedBlob = useRef<Blob | null>(null);
  const recordedDuration = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string>("");

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    recordedBlob.current = null;
    chunks.current = [];
    setDuration(0);
    setPreviewTime(0);
    setPreviewPlaying(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mimeType });
        const dur = (Date.now() - startTimeRef.current) / 1000;
        recordedBlob.current = blob;
        recordedDuration.current = dur;

        // Create preview audio
        audioUrlRef.current = URL.createObjectURL(blob);
        const audio = new Audio(audioUrlRef.current);
        audio.onended = () => {
          setPreviewPlaying(false);
          setPreviewTime(0);
        };
        audio.ontimeupdate = () => {
          setPreviewTime(audio.currentTime);
        };
        audioRef.current = audio;

        setDuration(dur);
        setState("preview");
      };

      mediaRecorder.current = recorder;
      recorder.start(100);
      startTimeRef.current = Date.now();
      setState("recording");

      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch {
      // Permission denied or no mic
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
  };

  const togglePreviewPlayback = () => {
    if (!audioRef.current) return;
    if (previewPlaying) {
      audioRef.current.pause();
      setPreviewPlaying(false);
    } else {
      audioRef.current.play();
      setPreviewPlaying(true);
    }
  };

  const handleDiscard = () => {
    cleanup();
    setState("idle");
  };

  const handleConfirm = () => {
    if (recordedBlob.current) {
      onRecorded(recordedBlob.current, recordedDuration.current);
    }
    cleanup();
    setState("idle");
  };

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (state === "idle") {
    return (
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          startRecording();
        }}
        className="shrink-0 p-2 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
        title="Hold to record voice note"
      >
        <Mic size={18} />
      </button>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Pulsing indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs font-medium text-destructive tabular-nums">
            {formatDur(duration)}
          </span>
        </div>

        {/* Waveform animation */}
        <div className="flex items-center gap-[2px] flex-1 h-6 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-destructive/60"
              style={{
                height: `${30 + Math.sin(Date.now() / 150 + i * 0.7) * 70}%`,
                transition: "height 0.1s ease",
                animationDelay: `${i * 40}ms`,
              }}
            />
          ))}
        </div>

        {/* Stop button */}
        <button
          type="button"
          onClick={stopRecording}
          className="shrink-0 p-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          <Square size={14} />
        </button>
      </div>
    );
  }

  // Preview state
  return {
    blob: recordedBlob.current,
    duration: recordedDuration.current,
    previewElement: (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Play/pause */}
        <button
          type="button"
          onClick={togglePreviewPlayback}
          className="shrink-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {previewPlaying ? <Pause size={14} /> : <Play size={14} className="ml-[1px]" />}
        </button>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${duration > 0 ? (previewTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Duration */}
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {formatDur(previewPlaying ? previewTime : duration)}
        </span>

        {/* Delete */}
        <button
          type="button"
          onClick={handleDiscard}
          className="shrink-0 p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    ),
    onConfirm: handleConfirm,
  } as never; // This will be reworked — let me use a proper pattern
}
