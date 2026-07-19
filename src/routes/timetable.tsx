import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Coffee } from "lucide-react";
import {
  DAYS,
  DAY_LABELS,
  TIMETABLE_COLUMNS,
  SCHEDULE,
  CLASSES,
  TEACHER_BY_CODE,
  jsDayToCode,
  formatTime12,
  textOn,
  PERIOD_LABELS,
  type DayCode,
} from "@/data/timetable";
import { useNow } from "@/lib/use-now";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: "Overall Weekly Timetable · Malja'a" },
      { name: "description", content: "Full weekly timetable for every class and day." },
    ],
  }),
  component: OverallTimetable,
});

function OverallTimetable() {
  const now = useNow();
  const today = jsDayToCode(now.getDay()) ?? "SAT";
  const [day, setDay] = useState<DayCode>(today);

  const idx = DAYS.indexOf(day);
  const goPrev = () => idx > 0 && setDay(DAYS[idx - 1]);
  const goNext = () => idx < DAYS.length - 1 && setDay(DAYS[idx + 1]);

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <h1 className="text-xl font-bold text-foreground">Overall Weekly Timetable</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Tap a period to see teacher details. Swipe the table sideways to see more.</p>

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

      <div className="card-soft p-2 sm:p-3">
        <div
          className="overflow-x-auto overscroll-x-contain rounded-xl"
          style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
        >
          <table className="w-full min-w-max border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 rounded-lg bg-secondary px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm">
                  Class
                </th>
                {TIMETABLE_COLUMNS.map((col, i) =>
                  col.type === "period" ? (
                    <th
                      key={`h-p-${i}`}
                      className="sticky top-0 z-10 rounded-lg bg-secondary px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm"
                    >
                      <div className="whitespace-nowrap">{PERIOD_LABELS[col.period.period]}</div>
                      <div className="whitespace-nowrap font-normal text-[9px] text-muted-foreground/80">
                        {formatTime12(col.period.start)}
                      </div>
                    </th>
                  ) : (
                    <th
                      key={`h-b-${i}`}
                      className="sticky top-0 z-10 rounded-lg bg-primary/10 px-1.5 py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-primary/80 shadow-sm"
                    >
                      <Coffee className="mx-auto h-3 w-3" />
                      <div className="mt-0.5 whitespace-nowrap">{col.brk.label}</div>
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((cls) => (
                <tr key={cls}>
                  <td className="sticky left-0 z-10 rounded-lg bg-primary px-2 py-2 text-center text-xs font-bold text-primary-foreground shadow-sm">
                    {cls}
                  </td>
                  {TIMETABLE_COLUMNS.map((col, i) => {
                    if (col.type === "break") {
                      return (
                        <td key={`c-b-${cls}-${i}`} className="align-middle">
                          <div className="grid h-full min-h-[44px] w-6 place-items-center rounded-lg bg-primary/5">
                            <div className="rotate-180 whitespace-nowrap text-[8px] font-semibold uppercase tracking-wider text-primary/60" style={{ writingMode: "vertical-rl" }}>
                              Break
                            </div>
                          </div>
                        </td>
                      );
                    }
                    const p = col.period.period;
                    const slot = SCHEDULE[day][p].find((s) => s.className === cls);
                    if (!slot) {
                      return (
                        <td key={`c-p-${cls}-${i}`} className="align-top">
                          <div className="min-w-[92px] rounded-lg bg-secondary/40 px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">
                            FREE
                          </div>
                        </td>
                      );
                    }
                    const teacher = TEACHER_BY_CODE[slot.teacher];
                    const color = teacher?.color ?? "#64748B";
                    return (
                      <td key={`c-p-${cls}-${i}`} className="align-top">
                        <Link
                          to="/teachers/$code"
                          params={{ code: slot.teacher }}
                          className="block min-w-[92px] rounded-lg px-2 py-1.5 text-[11px] font-semibold shadow-sm transition active:scale-95"
                          style={{ backgroundColor: color, color: textOn(color) }}
                        >
                          <div className="truncate font-bold leading-tight">{slot.subject}</div>
                          <div className="opacity-90 leading-tight">{slot.teacher}</div>
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
