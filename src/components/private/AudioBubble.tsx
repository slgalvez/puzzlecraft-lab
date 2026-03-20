import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";

interface AudioBubbleProps {
  src: string;
  isMine: boolean;
  duration?: number;
}

const formatDur = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// Global ref: only one audio plays at a time
let currentlyPlaying: HTMLAudioElement | null = null;
let currentlyPlayingCallback: (() => void) | null = null;

export function AudioBubble({ src, isMine, duration: propDuration }: AudioBubbleProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(propDuration || 0);
  const [loaded, setLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = src;

    audio.onloadedmetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
      setLoaded(true);
    };

    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);

    audio.onended = () => {
      setPlaying(false);
      setCurrentTime(0);
      if (currentlyPlaying === audio) {
        currentlyPlaying = null;
        currentlyPlayingCallback = null;
      }
    };

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      if (currentlyPlaying === audio) {
        currentlyPlaying = null;
        currentlyPlayingCallback = null;
      }
    };
  }, [src]);

  const stopGlobal = useCallback(() => {
    setPlaying(false);
  }, []);

  const toggle = () => {
    if (!audioRef.current || !loaded) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      if (currentlyPlaying === audioRef.current) {
        currentlyPlaying = null;
        currentlyPlayingCallback = null;
      }
    } else {
      // Stop any other playing audio
      if (currentlyPlaying && currentlyPlaying !== audioRef.current) {
        currentlyPlaying.pause();
        currentlyPlayingCallback?.();
      }
      currentlyPlaying = audioRef.current;
      currentlyPlayingCallback = stopGlobal;
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleScrub = (e: React.MouseEvent | React.TouchEvent) => {
    if (!audioRef.current || !scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * totalDuration;
    setCurrentTime(audioRef.current.currentTime);
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const btnBg = isMine
    ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
    : "bg-primary/10 text-primary hover:bg-primary/20";

  const barBg = isMine ? "bg-primary-foreground/20" : "bg-muted-foreground/20";
  const barFill = isMine ? "bg-primary-foreground" : "bg-primary";
  const timeColor = isMine ? "text-primary-foreground/60" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] sm:min-w-[220px]">
      <button
        type="button"
        onClick={toggle}
        className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${btnBg}`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-[1px]" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          ref={scrubberRef}
          className={`h-1.5 rounded-full overflow-hidden cursor-pointer ${barBg}`}
          onClick={handleScrub}
        >
          <div
            className={`h-full rounded-full transition-all duration-75 ${barFill}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-[10px] tabular-nums leading-none ${timeColor}`}>
          {formatDur(playing ? currentTime : totalDuration)}
        </span>
      </div>
    </div>
  );
}

/** Detect audio message */
export function isAudioMessage(body: string): boolean {
  return body.startsWith("__AUDIO__:");
}

/** Extract audio URL + optional duration */
export function getAudioData(body: string): { url: string; duration?: number } {
  const raw = body.replace("__AUDIO__:", "");
  // Format: url or url|duration
  const [url, durStr] = raw.split("|");
  return { url, duration: durStr ? parseFloat(durStr) : undefined };
}
