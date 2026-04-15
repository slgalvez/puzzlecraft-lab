import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";
import { getDailyCompletion, getDailyStreak } from "@/lib/dailyChallenge";
import { getProgressStats } from "@/lib/progressTracker";
import { loadSentItems } from "@/lib/craftHistory";

/* ── Types ── */

interface DayData {
  dateStr: string;
  date: Date;
  isToday: boolean;
  isFuture: boolean;
  isPast: boolean;
  isInMonth: boolean;
  hasDaily: boolean;
  hasPlayed: boolean;
  hasCrafted: boolean;
}

/* ── Helpers ── */

function formatDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDateStr(iso: string): string {
  return iso.slice(0, 10);
}

function buildMonthGrid(
  year: number,
  month: number,
  playedDates: Set<string>,
  craftedDates: Set<string>,
): DayData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const grid: DayData[] = [];

  const pushDay = (date: Date, isInMonth: boolean) => {
    const dateStr = formatDateStr(date);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const isToday = d.getTime() === today.getTime();
    const isFuture = d > today;
    grid.push({
      dateStr,
      date: d,
      isToday,
      isFuture,
      isPast: !isToday && !isFuture,
      isInMonth,
      hasDaily: !!getDailyCompletion(dateStr),
      hasPlayed: playedDates.has(dateStr),
      hasCrafted: craftedDates.has(dateStr),
    });
  };

  for (let i = startPad - 1; i >= 0; i--) pushDay(new Date(year, month, -i), false);
  for (let d = 1; d <= lastDay.getDate(); d++) pushDay(new Date(year, month, d), true);
  const remaining = 42 - grid.length;
  for (let d = 1; d <= remaining; d++) pushDay(new Date(year, month + 1, d), false);

  return grid;
}

/* ── Ring component ── */

interface RingProps {
  radius: number;
  active: boolean;
  colorClass: string; // tailwind text color class
}

function Ring({ radius, active, colorClass }: RingProps) {
  const circumference = 2 * Math.PI * radius;
  return (
    <>
      {/* Track */}
      <circle
        r={radius}
        cx="20"
        cy="20"
        fill="none"
        strokeWidth={1.8}
        className={colorClass}
        style={{ strokeOpacity: 0.14 }}
      />
      {/* Fill */}
      {active && (
        <circle
          r={radius}
          cx="20"
          cy="20"
          fill="none"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={0}
          className={colorClass}
          style={{ strokeOpacity: 0.92 }}
        />
      )}
    </>
  );
}

/* ── Constants ── */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const RING_COLORS = {
  daily: "stroke-primary",        // brand orange
  played: "stroke-emerald-500",
  crafted: "stroke-violet-500",
};

const DOT_COLORS = {
  daily: "bg-primary",
  played: "bg-emerald-500",
  crafted: "bg-violet-500",
};

/* ── Component ── */

interface ActivityCalendarProps {
  className?: string;
}

export function ActivityCalendar({ className }: ActivityCalendarProps) {
  const navigate = useNavigate();
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<DayData | null>(null);

  // Pre-compute date sets
  const playedDates = useMemo(() => {
    const stats = getProgressStats();
    return new Set(stats.recentCompletions.map((r) => toDateStr(r.date)));
  }, []);

  const craftedDates = useMemo(() => {
    const sent = loadSentItems();
    return new Set(sent.map((s) => toDateStr(new Date(s.sentAt).toISOString())));
  }, []);

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth, playedDates, craftedDates),
    [viewYear, viewMonth, playedDates, craftedDates],
  );

  const streak = useMemo(() => getDailyStreak(), []);

  const prevMonth = () => {
    hapticTap();
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
    setSelected(null);
  };

  const nextMonth = () => {
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return;
    hapticTap();
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
    setSelected(null);
  };

  const handleDayTap = (day: DayData) => {
    if (!day.isInMonth || day.isFuture) return;
    hapticTap();
    setSelected((prev) => prev?.dateStr === day.dateStr ? null : day);
  };

  const handleReplay = (day: DayData) => {
    hapticTap();
    navigate(`/daily?date=${day.dateStr}`);
  };

  const isAtCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const anyActivity = (d: DayData) => d.hasDaily || d.hasPlayed || d.hasCrafted;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors active:scale-90">
          <ChevronLeft size={14} className="text-muted-foreground/70" />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-foreground">
            {MONTHS[viewMonth]} {viewYear}
          </p>
          {streak.current > 0 && (
            <p className="text-[9px] text-primary mt-0.5">
              🔥 {streak.current} day streak
            </p>
          )}
        </div>
        <button
          onClick={nextMonth}
          disabled={isAtCurrentMonth}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            isAtCurrentMonth ? "opacity-20 cursor-not-allowed" : "hover:bg-muted active:scale-90",
          )}
        >
          <ChevronRight size={14} className="text-muted-foreground/70" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d) => (
          <p key={d} className="text-center text-[8px] font-medium text-muted-foreground/50 uppercase tracking-wider py-0.5">
            {d}
          </p>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((day) => {
          const isSelected = selected?.dateStr === day.dateStr;
          const showRings = day.isInMonth && !day.isFuture;

          return (
            <button
              key={day.dateStr}
              onClick={() => handleDayTap(day)}
              disabled={!day.isInMonth || day.isFuture}
              className={cn(
                "relative aspect-square flex items-center justify-center rounded-lg",
                "transition-all duration-100",
                !day.isInMonth && "opacity-15 cursor-default",
                day.isFuture && day.isInMonth && "opacity-30 cursor-default",
                isSelected && "ring-1.5 ring-primary ring-offset-1 ring-offset-background scale-105 z-10",
                showRings && !isSelected && "hover:bg-muted/30 active:scale-95",
              )}
            >
              {showRings && anyActivity(day) ? (
                <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
                  <Ring radius={17} active={day.hasDaily} colorClass={RING_COLORS.daily} />
                  <Ring radius={12.5} active={day.hasPlayed} colorClass={RING_COLORS.played} />
                  <Ring radius={8} active={day.hasCrafted} colorClass={RING_COLORS.crafted} />
                </svg>
              ) : showRings ? (
                <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
                  <Ring radius={17} active={false} colorClass={RING_COLORS.daily} />
                  <Ring radius={12.5} active={false} colorClass={RING_COLORS.played} />
                  <Ring radius={8} active={false} colorClass={RING_COLORS.crafted} />
                </svg>
              ) : null}

              {/* Day number overlay */}
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center text-[10px] font-medium",
                  day.isToday && "font-bold text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]",
                  !day.isToday && day.isInMonth && !day.isFuture && "text-foreground/80",
                  day.isFuture && "text-muted-foreground/30",
                  !day.isInMonth && "text-muted-foreground/30",
                )}
              >
                {day.date.getDate()}
              </span>

              {/* Today dot */}
              {day.isToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.7)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-1">
        {([
          ["Daily", DOT_COLORS.daily],
          ["Solved", DOT_COLORS.played],
          ["Created", DOT_COLORS.crafted],
        ] as const).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1">
            <span className={cn("h-[5px] w-[5px] rounded-full", color)} />
            <span className="text-[9px] text-muted-foreground/70">{label}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                {selected.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <div className="flex items-center gap-3">
                {([
                  ["Daily", selected.hasDaily, DOT_COLORS.daily],
                  ["Solved", selected.hasPlayed, DOT_COLORS.played],
                  ["Created", selected.hasCrafted, DOT_COLORS.crafted],
                ] as const).map(([label, active, color]) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", active ? color : "bg-muted-foreground/20")} />
                    <span className={cn("text-[10px]", active ? "text-foreground/70" : "text-muted-foreground/40")}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleReplay(selected)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold",
                "transition-all active:scale-[0.97]",
                selected.hasDaily
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "bg-primary text-primary-foreground",
              )}
            >
              <RotateCcw size={10} />
              {selected.hasDaily ? "Replay" : selected.isToday ? "Play" : "Catch up"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
