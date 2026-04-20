/**
 * QA Mode panel — admin-only scenario switcher, reset, and quick-jumps.
 * Lives inside AdminPreview as the first tab.
 */
import { useNavigate } from "react-router-dom";
import { usePreviewMode } from "@/contexts/PreviewModeContext";
import { PreviewLabel } from "@/components/admin/PreviewLabel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Eye, RotateCcw, Crown, Calendar, Users, MessageSquare, Share2, Zap,
} from "lucide-react";
import type { PreviewScenario, FriendsVariant, MockMessage } from "@/lib/previewFixtures";
import { buildMessagingFixture } from "@/lib/previewFixtures";

const SCENARIOS: { id: PreviewScenario; label: string }[] = [
  { id: "none",            label: "None" },
  { id: "partial",         label: "Partial" },
  { id: "full",            label: "Full" },
  { id: "daily-only",      label: "Daily only" },
  { id: "quickplay-only",  label: "Quick-play only" },
  { id: "craft-only",      label: "Craft only" },
  { id: "mixed",           label: "Mixed" },
];

const VARIANTS: { id: FriendsVariant; label: string }[] = [
  { id: "populated", label: "Populated" },
  { id: "tie",       label: "Tie" },
  { id: "small",     label: "Small group" },
  { id: "empty",     label: "Empty" },
];

export default function QAModePanel() {
  const navigate = useNavigate();
  const {
    active, isPlus, scenario, friendsVariant,
    enterPreview, exitPreview, togglePlus,
    setScenario, setFriendsVariant, resetPreview, profile,
  } = usePreviewMode();

  const messages = buildMessagingFixture();

  const goWith = (s: PreviewScenario, plus: boolean, variant: FriendsVariant = "populated") => {
    if (!active) enterPreview(s);
    else setScenario(s);
    setFriendsVariant(variant);
    if (plus !== isPlus) togglePlus();
    navigate("/stats");
  };

  return (
    <div className="space-y-6">
      {/* Status + reset */}
      <section className="rounded-xl border border-border/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">QA Preview Mode</h2>
            <PreviewLabel />
          </div>
          <div className="flex items-center gap-2">
            {active ? (
              <>
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={resetPreview}>
                  <RotateCcw size={11} /> Reset Preview State
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={exitPreview}>
                  Exit
                </Button>
              </>
            ) : (
              <Button size="sm" className="gap-1.5 h-8" onClick={() => enterPreview("mixed")}>
                <Eye size={11} /> Enter Preview
              </Button>
            )}
          </div>
        </div>

        {active && (
          <p className="text-xs text-muted-foreground">
            Reading exclusively from in-memory fixtures. No localStorage or DB writes occur.
          </p>
        )}
      </section>

      {/* Scenario switcher */}
      <section className="rounded-xl border border-border/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scenario</h3>
          <button
            onClick={togglePlus}
            disabled={!active}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
              isPlus ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              !active && "opacity-40 cursor-not-allowed",
            )}
          >
            {isPlus && <Crown size={10} />} {isPlus ? "Plus" : "Free"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => { if (!active) enterPreview(s.id); else setScenario(s.id); }}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                active && scenario === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Friends variant</p>
          <div className="flex flex-wrap gap-1.5">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                onClick={() => { if (!active) enterPreview("mixed"); setFriendsVariant(v.id); }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                  active && friendsVariant === v.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Quick-jumps */}
      <section className="rounded-xl border border-border/40 p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Zap size={11} className="text-primary" /> Quick jump to Stats
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="justify-start h-8 text-xs" onClick={() => goWith("full", false)}>Free · Full activity</Button>
          <Button size="sm" variant="outline" className="justify-start h-8 text-xs" onClick={() => goWith("mixed", true)}>Plus · Mixed</Button>
          <Button size="sm" variant="outline" className="justify-start h-8 text-xs" onClick={() => goWith("daily-only", true)}>Plus · Daily only</Button>
          <Button size="sm" variant="outline" className="justify-start h-8 text-xs" onClick={() => goWith("quickplay-only", true)}>Plus · Quick-play only</Button>
          <Button size="sm" variant="outline" className="justify-start h-8 text-xs" onClick={() => goWith("craft-only", true)}>Plus · Craft only</Button>
          <Button size="sm" variant="outline" className="justify-start h-8 text-xs" onClick={() => goWith("partial", true)}>Plus · Partial</Button>
          <Button size="sm" variant="outline" className="justify-start h-8 text-xs col-span-2" onClick={() => goWith("none", true)}>Plus · Empty state</Button>
        </div>
      </section>

      {/* Friend leaderboard preview */}
      <section className="rounded-xl border border-border/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Users size={11} className="text-primary" /> Friend leaderboard
          </h3>
          <PreviewLabel alwaysShow label="Mock State" />
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          {profile.friends.daily.length === 0 ? (
            <p className="px-4 py-4 text-center text-xs text-muted-foreground">Empty state</p>
          ) : (
            profile.friends.daily.map((entry, i) => (
              <div key={entry.friendId} className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                i > 0 && "border-t border-border/40",
                entry.isMe && "bg-primary/5",
              )}>
                <span className="w-5 text-center text-xs font-mono text-muted-foreground">{i + 1}</span>
                <p className={cn("flex-1 text-sm", entry.isMe ? "font-semibold text-primary" : "text-foreground")}>
                  {entry.isMe ? "You" : entry.displayName}
                </p>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {Math.floor(entry.solveTime / 60)}:{String(entry.solveTime % 60).padStart(2, "0")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Messaging preview */}
      <section className="rounded-xl border border-border/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <MessageSquare size={11} className="text-primary" /> Messaging
          </h3>
          <PreviewLabel alwaysShow label="Mock State" />
        </div>
        <div className="space-y-2">
          {messages.map((m: MockMessage) => (
            <div key={m.id} className={cn("flex", m.isMine ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                m.isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                m.kind === "challenge" && "border border-primary/30",
                m.kind === "milestone" && "ring-2 ring-primary/40",
              )}>
                <p>{m.body}</p>
                <p className={cn("text-[9px] mt-0.5 opacity-60 capitalize")}>{m.kind}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
