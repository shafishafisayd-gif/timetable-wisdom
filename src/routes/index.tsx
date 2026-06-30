import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DAYS,
  DAY_LABELS,
  PERIOD_TIMES,
  
  BREAKS,
  SCHEDULE,
  CLASSES,
  TEACHER_BY_CODE,
  jsDayToCode,
  formatTime12,
  periodLabel,
  textOn,
  type DayCode,
  type PeriodNum,
  type PeriodTime,
  type BreakSlot,
} from "@/data/timetable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overall Timetable · Malja'a" },
      { name: "description", content: "Full college timetable for every class and day." },
    ],
  }),
  component: Overall,
});

// Interleaved column list: periods + breaks ordered by start time.
type Col =
  | { kind: "period"; period: PeriodTime }
  | { kind: "break"; brk: BreakSlot };

const COLUMNS: Col[] = [
  ...PERIOD_TIMES.map((p): Col => ({ kind: "period", period: p })),
  ...BREAKS.map((b): Col => ({ kind: "break", brk: b })),
].sort((a, b) => {
  const sa = a.kind === "period" ? a.period.startMin : a.brk.startMin;
  const sb = b.kind === "period" ? b.period.startMin : b.brk.startMin;
  return sa - sb;
});

function Overall() {
  const today = jsDayToCode(new Date().getDay()) ?? "SAT";
  const [day, setDay] = useState<DayCode>(today);
  const idx = DAYS.indexOf(day);
  const goPrev = () => idx > 0 && setDay(DAYS[idx - 1]);
  const goNext = () => idx < DAYS.length - 1 && setDay(DAYS[idx + 1]);

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <h1 className="text-xl font-bold text-foreground">Overall Timetable</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tap a period to see details. Swipe the table to scroll across periods.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition disabled:opacity-40"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto hide-scrollbar px-1">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                  day === d
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {DAY_LABELS[d]}
                {d === today ? " · Today" : ""}
              </button>
            ))}
          </div>
          <button
            onClick={goNext}
            disabled={idx === DAYS.length - 1}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition disabled:opacity-40"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="card-soft overflow-hidden p-2 sm:p-3">
        <div
          className="overflow-x-auto overscroll-x-contain hide-scrollbar"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}
        >
          <table className="border-separate border-spacing-1.5">
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-20 rounded-xl bg-secondary px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                  style={{ minWidth: 52 }}
                >
                  Class
                </th>
                {COLUMNS.map((c, i) =>
                  c.kind === "period" ? (
                    <th
                      key={`p-${c.period.period}`}
                      className="rounded-xl bg-secondary px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                      style={{ minWidth: 96 }}
                    >
                      <div className="text-foreground">{c.period.label}</div>
                      <div className="mt-0.5 font-normal normal-case text-[9px] leading-tight">
                        {formatTime12(c.period.start)}
                      </div>
                      <div className="font-normal normal-case text-[9px] leading-tight text-muted-foreground/70">
                        {formatTime12(c.period.end)}
                      </div>
                    </th>
                  ) : (
                    <th
                      key={`b-${i}`}
                      className="rounded-xl bg-amber-100 px-1.5 py-2 text-center text-[9px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                      style={{ minWidth: 64 }}
                    >
                      <div className="leading-tight">{c.brk.label}</div>
                      <div className="mt-0.5 font-normal normal-case text-[9px] text-amber-900/70 dark:text-amber-100/70">
                        {formatTime12(c.brk.start)}
                      </div>
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((cls) => (
                <tr key={cls}>
                  <td
                    className="sticky left-0 z-10 rounded-xl bg-primary px-2 py-2 text-center text-xs font-bold text-primary-foreground shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                    style={{ minWidth: 52 }}
                  >
                    {cls}
                  </td>
                  {COLUMNS.map((c, i) => {
                    if (c.kind === "break") {
                      return (
                        <td
                          key={`b-${i}`}
                          className="rounded-xl bg-amber-50/60 px-1 py-2 text-center text-[9px] font-medium text-amber-900/70 dark:bg-amber-900/10 dark:text-amber-100/60"
                        >
                          —
                        </td>
                      );
                    }
                    const p = c.period.period as PeriodNum;
                    const slot = SCHEDULE[day][p].find((s) => s.className === cls);
                    if (!slot) {
                      return (
                        <td key={`p-${p}`} className="align-top">
                          <div className="rounded-xl bg-secondary/40 px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">
                            FREE
                          </div>
                        </td>
                      );
                    }
                    const teacher = TEACHER_BY_CODE[slot.teacher];
                    const color = teacher?.color ?? "#64748B";
                    return (
                      <td key={`p-${p}`} className="align-top">
                        <Link
                          to="/teachers/$code"
                          params={{ code: slot.teacher }}
                          className="block rounded-xl px-2 py-1.5 text-[11px] font-semibold shadow-sm transition active:scale-95"
                          style={{ backgroundColor: color, color: textOn(color) }}
                        >
                          <div className="truncate font-bold">{slot.subject}</div>
                          <div className="opacity-90">{slot.teacher}</div>
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 px-2 text-[10px] text-muted-foreground">
          {periodLabel(0)} (5:50 AM) and {periodLabel(1)} (7:00 AM) are two separate teaching periods.
        </p>
      </div>
    </div>
  );
}
