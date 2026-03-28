import { useState } from "react";
import { Bug } from "lucide-react";

interface LocationDebugInfo {
  permissionGranted: boolean;
  watchActive: boolean;
  backendOutgoingActive: boolean | null;
  backendIncomingActive: boolean | null;
  lastPollAt: string | null;
  recoveryInFlight: boolean;
  sessionStorageKey: boolean;
  conversationId: string | null;
}

interface Props {
  debug: LocationDebugInfo;
  isSharingMine: boolean;
  hasIncoming: boolean;
  myLocationAge: string | null;
  incomingAge: string | null;
}

function Dot({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />;
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? "bg-green-500" : "bg-red-400"}`} />;
}

export function LocationDebugPanel({ debug, isSharingMine, hasIncoming, myLocationAge, incomingAge }: Props) {
  const [open, setOpen] = useState(false);

  const lastPollLabel = debug.lastPollAt
    ? `${Math.round((Date.now() - new Date(debug.lastPollAt).getTime()) / 1000)}s ago`
    : "never";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 right-2 z-[9999] h-7 w-7 rounded-full flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        title="Location debug"
      >
        <Bug size={12} className="text-white" />
      </button>
    );
  }

  const rows: [string, React.ReactNode][] = [
    ["Conv ID", <span className="font-mono">{debug.conversationId?.slice(0, 8) ?? "—"}</span>],
    ["Permission", <><Dot ok={debug.permissionGranted} /> {debug.permissionGranted ? "granted" : "not granted"}</>],
    ["GPS watch", <><Dot ok={debug.watchActive} /> {debug.watchActive ? "active" : "inactive"}</>],
    ["Local sharing", <><Dot ok={isSharingMine} /> {isSharingMine ? "yes" : "no"}</>],
    ["SessionStorage", <><Dot ok={debug.sessionStorageKey} /> {debug.sessionStorageKey ? "1" : "0"}</>],
    ["Backend outgoing", <><Dot ok={debug.backendOutgoingActive} /> {debug.backendOutgoingActive === null ? "unknown" : debug.backendOutgoingActive ? "active" : "inactive"}</>],
    ["Backend incoming", <><Dot ok={debug.backendIncomingActive} /> {debug.backendIncomingActive === null ? "unknown" : debug.backendIncomingActive ? "active" : "inactive"}</>],
    ["Has incoming loc", <><Dot ok={hasIncoming} /> {hasIncoming ? "yes" : "no"}</>],
    ["Last poll", lastPollLabel],
    ["Recovery", debug.recoveryInFlight ? "in flight" : "idle"],
    ["My loc age", myLocationAge ?? "—"],
    ["Incoming age", incomingAge ?? "—"],
  ];

  return (
    <div
      className="fixed bottom-16 right-2 z-[9999] rounded-lg p-2.5 space-y-1 text-[9px] leading-tight max-w-[220px] shadow-lg"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.8)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-[10px] flex items-center gap-1">
          <Bug size={10} /> Location Debug
        </span>
        <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white text-xs">✕</button>
      </div>
      {rows.map(([label, value], i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <span className="text-white/40 shrink-0">{label}</span>
          <span className="text-right truncate flex items-center gap-1">{value}</span>
        </div>
      ))}
    </div>
  );
}