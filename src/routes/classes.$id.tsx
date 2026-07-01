import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Coffee } from "lucide-react";
import {
  CLASSES,
  getClassSchedule,
  DAYS,
  DAY_LABELS,
  PERIODS,
  PERIOD_LABELS,
  TIMETABLE_COLUMNS,
  TEACHER_BY_CODE,
  formatTime12,
  textOn,
  type ClassId,
} from "@/data/timetable";

export const Route = createFileRoute("/classes/$id")({
  loader: ({ params }) => {
    if (!CLASSES.includes(params.id as ClassId)) throw notFound();
    return null;
  },
  head: ({ params }) => ({ meta: [{ title: `Class ${params.id} · Malja'a Timetable` }] }),
  component: ClassDetail,
});

function ClassDetail() {
  const { id } = Route.useParams();
  const cls = id as ClassId;
  const sched = getClassSchedule(cls);

  let total = 0;
  const subjects = new Set<string>();
  const teachers = new Set<string>();
  for (const d of DAYS) for (const p of PERIODS) {
    const s = sched[d][p];
    if (s) { total++; subjects.add(s.subject); teachers.add(s.teacher); }
  }

  return (
    <div className="space-y-4">
      <Link to="/classes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All classes
      </Link>

      <div className="card-lift p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">{cls}</div>
          <div>
            <h1 className="text-xl font-bold">Class {cls}</h1>
            <p className="text-sm text-muted-foreground">{total} weekly periods · {teachers.size} teachers · {subjects.size} subjects</p>
          </div>
        </div>
      </div>

      <div className="card-soft p-3">
        <div className="-mx-3 overflow-x-auto px-3">
          <table className="w-full min-w-[680px] border-separate border-spacing-1.5">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 rounded-lg bg-secondary px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm">Day</th>
                {TIMETABLE_COLUMNS.map((col, i) =>
                  col.type === "period" ? (
                    <th key={`h-p-${i}`} className="rounded-lg bg-secondary px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm">
                      <div className="whitespace-nowrap">{PERIOD_LABELS[col.period.period]}</div>
                      <div className="whitespace-nowrap font-normal text-[9px]">{formatTime12(col.period.start)}</div>
                    </th>
                  ) : (
                    <th key={`h-b-${i}`} className="rounded-lg bg-primary/10 px-1.5 py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-primary/80 shadow-sm">
                      <Coffee className="mx-auto h-3 w-3" />
                      <div className="mt-0.5 whitespace-nowrap">{col.brk.label}</div>
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => (
                <tr key={d}>
                  <td className="sticky left-0 z-10 rounded-lg bg-secondary px-2 py-2 text-xs font-semibold shadow-sm">{DAY_LABELS[d].slice(0, 3)}</td>
                  {TIMETABLE_COLUMNS.map((col, i) => {
                    if (col.type === "break") {
                      return (
                        <td key={`c-b-${d}-${i}`} className="align-middle">
                          <div className="grid h-full min-h-[44px] w-6 place-items-center rounded-lg bg-primary/5">
                            <div className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-wider text-primary/60" style={{ writingMode: "vertical-rl" }}>Break</div>
                          </div>
                        </td>
                      );
                    }
                    const p = col.period.period;
                    const slot = sched[d][p];
                    if (!slot) return (
                      <td key={`c-p-${d}-${i}`}><div className="min-w-[92px] rounded-lg bg-secondary/40 px-2 py-2 text-center text-[10px] text-muted-foreground">FREE</div></td>
                    );
                    const teacher = TEACHER_BY_CODE[slot.teacher];
                    return (
                      <td key={`c-p-${d}-${i}`}>
                        <Link to="/teachers/$code" params={{ code: slot.teacher }} className="block min-w-[92px] rounded-lg px-2 py-1.5 text-[11px] font-semibold shadow-sm" style={{ backgroundColor: teacher?.color, color: teacher ? textOn(teacher.color) : "#fff" }}>
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
