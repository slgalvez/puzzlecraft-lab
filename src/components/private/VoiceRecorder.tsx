import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";

export interface VoicePreview {
  blob: Blob;
  duration: number;
  url: string;
}

interface VoiceRecorderProps {
  disabled?: boolean;
  onPreviewReady: (preview: VoicePreview) => void;
}

const formatDur = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/** Mic button that becomes a recording indicator while held/active */
export function VoiceRecorder({ disabled, onPreviewReady }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(20).fill(30));

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const waveRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(waveRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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
        clearInterval(timerRef.current);
        clearInterval(waveRef.current);

        const blob = new Blob(chunks.current, { type: mimeType });
        const dur = (Date.now() - startTimeRef.current) / 1000;

        if (dur < 0.5) {
          // Too short, discard
          setRecording(false);
          setDuration(0);
          return;
        }

        const url = URL.createObjectURL(blob);
        onPreviewReady({ blob, duration: dur, url });
        setRecording(false);
        setDuration(0);
      };

      mediaRecorder.current = recorder;
      recorder.start(100);
      startTimeRef.current = Date.now();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      // Animate waveform
      waveRef.current = setInterval(() => {
        setWaveHeights(Array.from({ length: 20 }, () => 20 + Math.random() * 80));
      }, 120);
    } catch {
      // Permission denied
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
  };

  if (recording) {
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse shrink-0" />
        <span className="text-xs font-medium text-destructive tabular-nums shrink-0">
          {formatDur(duration)}
        </span>

        <div className="flex items-center gap-[2px] flex-1 h-7 overflow-hidden">
          {waveHeights.map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-destructive/50 transition-[height] duration-100"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={stopRecording}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          <Square size={12} fill="currentColor" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="shrink-0 p-2 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
        title="Record voice note"
      >
        <Mic size={18} />
      </button>
      <FeatureHint id="voice_record" text="Hold to record a voice message" position="above" />
    </div>
  );
}

/** Preview bar for a recorded voice note — shown in composer area */
interface VoicePreviewBarProps {
  preview: VoicePreview;
  onDiscard: () => void;
}

export function VoicePreviewBar({ preview, onDiscard }: VoicePreviewBarProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(preview.url);
    audio.onended = () => { setPlaying(false); setCurrentTime(0); };
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ""; };
  }, [preview.url]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const progress = preview.duration > 0 ? (currentTime / preview.duration) * 100 : 0;

  return (
    <div className="border-t border-border px-3 sm:px-4 py-2 bg-secondary/30">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {playing ? <Pause size={14} /> : <Play size={14} className="ml-[1px]" />}
        </button>

        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = pct * preview.duration;
            setCurrentTime(audioRef.current.currentTime);
          }}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {formatDur(playing ? currentTime : preview.duration)}
        </span>

        <button
          type="button"
          onClick={onDiscard}
          className="shrink-0 p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
