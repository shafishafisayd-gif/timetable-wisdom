import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  CLASSES,
  getClassSchedule,
  DAYS,
  DAY_LABELS,
  PERIODS,
  PERIOD_TIMES,
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
                <th className="sticky left-0 z-10 rounded-xl bg-secondary px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Day</th>
                {PERIOD_TIMES.map((pt) => (
                  <th key={pt.period} className="rounded-xl bg-secondary px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <div>P{pt.period}</div>
                    <div className="font-normal text-[9px]">{formatTime12(pt.start)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => (
                <tr key={d}>
                  <td className="sticky left-0 z-10 rounded-xl bg-secondary px-2 py-2 text-xs font-semibold">{DAY_LABELS[d].slice(0, 3)}</td>
                  {PERIODS.map((p) => {
                    const slot = sched[d][p];
                    if (!slot) return (
                      <td key={p}><div className="rounded-xl bg-secondary/40 px-2 py-2 text-center text-[10px] text-muted-foreground">FREE</div></td>
                    );
                    const teacher = TEACHER_BY_CODE[slot.teacher];
                    return (
                      <td key={p}>
                        <Link to="/teachers/$code" params={{ code: slot.teacher }} className="block rounded-xl px-2 py-1.5 text-[11px] font-semibold text-white" style={{ backgroundColor: teacher?.color }}>
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
