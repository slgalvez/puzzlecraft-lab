import { useState } from "react";
import { MapPin, Check, X, Loader2 } from "lucide-react";
import { type GroupPosition, getGroupSpacing } from "@/components/private/MessageBubble";

export const LOCATION_REQUEST_PREFIX = "__LOCATION_REQUEST__";
export const LOCATION_REQUEST_ACCEPTED = "__LOCATION_REQUEST_ACCEPTED__";
export const LOCATION_REQUEST_DECLINED = "__LOCATION_REQUEST_DECLINED__";

export function isLocationRequestMessage(body: string): boolean {
  return (
    body === LOCATION_REQUEST_PREFIX ||
    body === LOCATION_REQUEST_ACCEPTED ||
    body === LOCATION_REQUEST_DECLINED
  );
}

interface LocationRequestBubbleProps {
  body: string;
  isMine: boolean;
  createdAt: string;
  formatTime: (iso: string) => string;
  groupPosition?: GroupPosition;
  senderChanged?: boolean;
  showTimestamp?: boolean;
  onAccept?: () => void;
  onDecline?: (messageId: string) => void;
  messageId: string;
  accepting?: boolean;
}

export function LocationRequestBubble({
  body,
  isMine,
  createdAt,
  formatTime,
  groupPosition = "single",
  senderChanged = true,
  showTimestamp = true,
  onAccept,
  onDecline,
  messageId,
  accepting = false,
}: LocationRequestBubbleProps) {
  const [declining, setDeclining] = useState(false);

  const isAccepted = body === LOCATION_REQUEST_ACCEPTED;
  const isDeclined = body === LOCATION_REQUEST_DECLINED;
  const isPending = body === LOCATION_REQUEST_PREFIX;

  const handleDecline = () => {
    setDeclining(true);
    onDecline?.(messageId);
  };

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} px-1 ${getGroupSpacing(groupPosition, senderChanged)}`}
    >
      <div className="max-w-[82%] sm:max-w-[70%]">
        <div
          className={`rounded-2xl px-3.5 py-2.5 ${
            isMine ? "msg-bubble-mine" : "msg-bubble-theirs"
          }`}
        >
          {/* Request content */}
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <MapPin size={14} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {isMine ? (
                <p className="text-[13px] font-medium">
                  {isPending
                    ? "Location request sent"
                    : isAccepted
                      ? "Location request accepted"
                      : "Location request declined"}
                </p>
              ) : (
                <p className="text-[13px] font-medium">
                  {isPending
                    ? "Requested your location"
                    : isAccepted
                      ? "You accepted the location request"
                      : "You declined the location request"}
                </p>
              )}
              {isPending && isMine && (
                <p className="text-[10px] text-primary-foreground/50">Waiting for response…</p>
              )}
            </div>
          </div>

          {/* Action buttons — only for recipient, only when pending */}
          {!isMine && isPending && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onAccept}
                disabled={accepting || declining}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-[12px] font-medium transition-colors disabled:opacity-50"
              >
                {accepting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                Share Location
              </button>
              <button
                onClick={handleDecline}
                disabled={accepting || declining}
                className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground text-[12px] transition-colors disabled:opacity-50"
              >
                {declining ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <X size={12} />
                )}
                Decline
              </button>
            </div>
          )}

          {/* Status badges for resolved state */}
          {isAccepted && (
            <div className="flex items-center gap-1 mt-1">
              <Check size={10} className="text-primary" />
              <span className="text-[10px] text-primary">Sharing started</span>
            </div>
          )}
          {isDeclined && (
            <div className="flex items-center gap-1 mt-1">
              <X size={10} className="text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground/50">Declined</span>
            </div>
          )}

          {/* Timestamp */}
          {showTimestamp && (
            <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
              <span className={`text-[10px] leading-none ${isMine ? "text-primary-foreground/45" : "text-muted-foreground/50"}`}>
                {formatTime(createdAt)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
