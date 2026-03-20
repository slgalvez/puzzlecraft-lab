import { Phone, PhoneOff, Video } from "lucide-react";
import type { IncomingCallInfo } from "@/hooks/useVideoCall";

interface IncomingCallBannerProps {
  call: IncomingCallInfo;
  resolvedCallerName?: string;
  onAccept: (callId: string) => void;
  onDecline: (callId: string) => void;
}

export function IncomingCallBanner({ call, onAccept, onDecline }: IncomingCallBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[90] p-3 animate-in slide-in-from-top duration-300">
      <div className="max-w-sm mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Video size={18} className="text-primary" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{call.callerName}</p>
            <p className="text-xs text-muted-foreground">Video Call</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDecline(call.callId)}
              className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center text-destructive hover:bg-destructive/25 transition-colors"
              aria-label="Decline call"
            >
              <PhoneOff size={16} />
            </button>
            <button
              onClick={() => onAccept(call.callId)}
              className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white hover:bg-green-700 transition-colors"
              aria-label="Accept call"
            >
              <Phone size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
