import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/overall")({
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

  // swipe
  useEffect(() => {
    let startX = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 60) return;
      const idx = DAYS.indexOf(day);
      if (dx < 0 && idx < DAYS.length - 1) setDay(DAYS[idx + 1]);
      if (dx > 0 && idx > 0) setDay(DAYS[idx - 1]);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [day]);

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <h1 className="text-xl font-bold text-foreground">Overall Timetable</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Tap a period to see details. Swipe left/right to change day.</p>
        <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto hide-scrollbar px-4">
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
      </div>

      <div className="card-soft p-3">
        <div className="-mx-3 overflow-x-auto px-3">
          <table className="w-full min-w-[760px] border-separate border-spacing-1.5">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th className="sticky left-0 z-10 rounded-xl bg-secondary px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Class</th>
                {PERIOD_TIMES.map((pt) => (
                  <th key={pt.period} className="rounded-xl bg-secondary px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <div>P{pt.period}</div>
                    <div className="font-normal text-[9px]">{formatTime12(pt.start)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((cls) => (
                <tr key={cls}>
                  <td className="sticky left-0 z-10 rounded-xl bg-primary px-2 py-2 text-center text-xs font-bold text-primary-foreground">{cls}</td>
                  {PERIODS.map((p) => {
                    const slot = SCHEDULE[day][p].find((s) => s.className === cls);
                    if (!slot) {
                      return (
                        <td key={p} className="align-top">
                          <div className="rounded-xl bg-secondary/40 px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">FREE</div>
                        </td>
                      );
                    }
                    const teacher = TEACHER_BY_CODE[slot.teacher];
                    const color = teacher?.color ?? "#64748B";
                    return (
                      <td key={p} className="align-top">
                        <Link
                          to="/teachers/$code"
                          params={{ code: slot.teacher }}
                          className="block rounded-xl px-2 py-1.5 text-[11px] font-semibold text-white shadow-sm transition active:scale-95"
                          style={{ backgroundColor: color }}
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
      </div>
    </div>
  );
}
