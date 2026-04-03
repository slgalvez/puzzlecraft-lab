import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";
import { getDailyCompletion, getDailyStreak } from "@/lib/dailyChallenge";

interface DayData {
  dateStr: string;
  date: Date;
  isToday: boolean;
  isFuture: boolean;
  isPast: boolean;
  completed: boolean;
  solveTime?: number;
  score?: number;
  isInMonth: boolean;
}

function formatDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number): DayData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  const startPad = (firstDay.getDay() + 6) % 7;
  const grid: DayData[] = [];

  for (let i = startPad - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    const dateStr = formatDateStr(date);
    const completed = !!getDailyCompletion(dateStr);
    grid.push({ dateStr, date, isToday: false, isFuture: false, isPast: true, completed, isInMonth: false });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);
    const dateStr = formatDateStr(date);
    const isToday = date.getTime() === today.getTime();
    const isFuture = date > today;
    const completed = !!getDailyCompletion(dateStr);
    grid.push({ dateStr, date, isToday, isFuture, isPast: !isToday && !isFuture, completed, isInMonth: true });
  }

  const remaining = 42 - grid.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    const dateStr = formatDateStr(date);
    grid.push({ dateStr, date, isToday: false, isFuture: true, isPast: false, completed: false, isInMonth: false });
  }

  return grid;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface ActivityCalendarProps {
  className?: string;
}

export function ActivityCalendar({ className }: ActivityCalendarProps) {
  const navigate = useNavigate();
  const today = new Date();

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected,  setSelected]  = useState<DayData | null>(null);

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
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

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors active:scale-90">
          <ChevronLeft size={16} className="text-muted-foreground" />
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            {MONTHS[viewMonth]} {viewYear}
          </p>
          {streak.current > 0 && (
            <p className="text-[10px] text-primary mt-0.5">
              🔥 {streak.current} day streak
            </p>
          )}
        </div>

        <button
          onClick={nextMonth}
          disabled={isAtCurrentMonth}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            isAtCurrentMonth ? "opacity-20 cursor-not-allowed" : "hover:bg-muted active:scale-90"
          )}
        >
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d) => (
          <p key={d} className="text-center text-[9px] font-medium text-muted-foreground/60 uppercase tracking-wide py-1">
            {d}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((day) => {
          const isSelected = selected?.dateStr === day.dateStr;

          return (
            <button
              key={day.dateStr}
              onClick={() => handleDayTap(day)}
              disabled={!day.isInMonth || day.isFuture}
              className={cn(
                "aspect-square flex items-center justify-center rounded-xl text-xs font-medium",
                "transition-all duration-100",
                !day.isInMonth && "opacity-20 cursor-default",
                day.isFuture && day.isInMonth && "text-muted-foreground/40 cursor-default",
                day.completed && day.isInMonth && !isSelected &&
                  "bg-primary/15 text-primary font-semibold",
                day.isToday && !day.completed &&
                  "border-2 border-primary text-foreground",
                day.isToday && day.completed &&
                  "bg-primary text-primary-foreground font-bold",
                isSelected && "ring-2 ring-primary ring-offset-1 scale-110 z-10",
                day.isPast && !day.completed && day.isInMonth &&
                  "text-muted-foreground/50 hover:bg-muted/50 active:scale-95",
              )}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {selected.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              {selected.completed ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <Trophy size={11} className="text-emerald-500" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Completed
                    {selected.solveTime ? ` · ${formatTime(selected.solveTime)}` : ""}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected.isToday ? "Play today's puzzle" : "Not completed"}
                </p>
              )}
            </div>

            <button
              onClick={() => handleReplay(selected)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold",
                "transition-all active:scale-[0.97]",
                selected.completed
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "bg-primary text-primary-foreground"
              )}
            >
              <RotateCcw size={12} />
              {selected.completed ? "Replay" : selected.isToday ? "Play" : "Catch up"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
