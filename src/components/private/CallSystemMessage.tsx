import { Phone, PhoneMissed, PhoneOff, Video } from "lucide-react";

/** Detect call system messages */
export function isCallMessage(body: string): boolean {
  return body.startsWith("__CALL__:");
}

interface CallSystemMessageProps {
  body: string;
  formatTime: (iso: string) => string;
  createdAt: string;
}

function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function CallSystemMessage({ body, formatTime, createdAt }: CallSystemMessageProps) {
  const parts = body.replace("__CALL__:", "").split(":");
  const type = parts[0]; // missed, declined, ended, canceled
  const duration = parts[1] ? parseInt(parts[1]) : 0;

  let icon: React.ReactNode;
  let text: string;

  switch (type) {
    case "missed":
      icon = <PhoneMissed size={12} className="text-destructive" />;
      text = "Missed video call";
      break;
    case "declined":
      icon = <PhoneOff size={12} className="text-muted-foreground" />;
      text = "Declined video call";
      break;
    case "canceled":
      icon = <PhoneOff size={12} className="text-muted-foreground" />;
      text = "Canceled video call";
      break;
    case "ended":
      icon = <Video size={12} className="text-primary" />;
      text = duration > 0 ? `Video call · ${formatCallDuration(duration)}` : "Video call ended";
      break;
    default:
      icon = <Phone size={12} className="text-muted-foreground" />;
      text = "Video call";
  }

  return (
    <div className="flex justify-center py-1.5">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/60 border border-border/50">
        {icon}
        <span className="text-[11px] text-muted-foreground">{text}</span>
        <span className="text-[10px] text-muted-foreground/60">{formatTime(createdAt)}</span>
      </div>
    </div>
  );
}
