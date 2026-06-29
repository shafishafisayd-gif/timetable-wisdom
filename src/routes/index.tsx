import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DAYS,
  DAY_LABELS,
  PERIOD_TIMES,
  PERIODS,
  SCHEDULE,
  CLASSES,
  TEACHER_BY_CODE,
  jsDayToCode,
  formatTime12,
  textOn,
  type DayCode,
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
          All classes for {DAY_LABELS[day]}. Scroll horizontally to view all periods.
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
                  day === d ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {DAY_LABELS[d]}{d === today ? " · Today" : ""}
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

      {/* Spreadsheet-style timetable with sticky class column + sticky period header */}
      <div className="card-soft overflow-hidden">
        <div
          className="overflow-auto overscroll-contain"
          style={{ maxHeight: "calc(100dvh - 220px)", WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}
        >
          <table className="border-separate border-spacing-0" style={{ minWidth: "max-content" }}>
            <thead>
              <tr>
                <th
                  className="sticky left-0 top-0 z-30 border-b border-r border-border bg-secondary px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                  style={{ minWidth: 72, boxShadow: "2px 2px 6px rgba(0,0,0,0.08)" }}
                >
                  Class
                </th>
                {PERIOD_TIMES.map((pt) => (
                  <th
                    key={pt.period}
                    className="sticky top-0 z-20 border-b border-r border-border bg-secondary px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
                    style={{ minWidth: 128, boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}
                  >
                    <div className="text-foreground">{pt.labelShort}</div>
                    <div className="font-normal text-[9px] text-muted-foreground">
                      {formatTime12(pt.start)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((cls) => (
                <tr key={cls}>
                  <td
                    className="sticky left-0 z-10 border-b border-r border-border bg-primary px-3 py-2 text-center text-sm font-bold text-primary-foreground"
                    style={{ minWidth: 72, boxShadow: "2px 0 6px rgba(0,0,0,0.08)" }}
                  >
                    {cls}
                  </td>
                  {PERIODS.map((p) => {
                    const slot = SCHEDULE[day][p].find((s) => s.className === cls);
                    if (!slot) {
                      return (
                        <td key={p} className="border-b border-r border-border p-1.5 align-middle" style={{ minWidth: 128 }}>
                          <div className="rounded-lg bg-secondary/40 px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">
                            FREE
                          </div>
                        </td>
                      );
                    }
                    const teacher = TEACHER_BY_CODE[slot.teacher];
                    const color = teacher?.color ?? "#64748B";
                    return (
                      <td key={p} className="border-b border-r border-border p-1.5 align-middle" style={{ minWidth: 128 }}>
                        <Link
                          to="/teachers/$code"
                          params={{ code: slot.teacher }}
                          className="block rounded-lg px-2 py-2 text-[11px] font-semibold shadow-sm transition active:scale-95"
                          style={{ backgroundColor: color, color: textOn(color) }}
                        >
                          <div className="truncate font-bold leading-tight">{slot.subject}</div>
                          <div className="text-[10px] opacity-90">{slot.teacher} · {slot.className}</div>
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
