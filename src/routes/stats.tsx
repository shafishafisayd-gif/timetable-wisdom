import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  TEACHERS,
  getTeacherStats,
  getTeacherSchedule,
  CLASSES,
  SCHEDULE,
  DAYS,
  PERIODS,
  TEACHER_LOADS,
  textOn,
  type DayCode,
  type ClassId,
  type Teacher,
} from "@/data/timetable";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Stats · Malja'a Timetable" }] }),
  component: Stats,
});

const DAY_SHORT: Record<DayCode, string> = {
  SAT: "Sat", SUN: "Sun", MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu",
};

interface AssignmentRow {
  className: ClassId;
  subject: string;
  weekly: number;
  periods: string[]; // e.g. "Sat P2"
}

function buildAssignments(code: string): AssignmentRow[] {
  const sched = getTeacherSchedule(code);
  const map = new Map<string, AssignmentRow>();
  for (const d of DAYS) {
    for (const p of PERIODS) {
      const s = sched[d][p];
      if (!s) continue;
      const key = `${s.className}|${s.subject}`;
      const row = map.get(key) ?? { className: s.className, subject: s.subject, weekly: 0, periods: [] };
      row.weekly += 1;
      row.periods.push(`${DAY_SHORT[d]} P${p}`);
      map.set(key, row);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.className.localeCompare(b.className) || b.weekly - a.weekly,
  );
}

function busiestClass(rows: AssignmentRow[]): string {
  const by = new Map<string, number>();
  for (const r of rows) by.set(r.className, (by.get(r.className) ?? 0) + r.weekly);
  let best = "—", n = 0;
  for (const [c, v] of by) if (v > n) { best = c; n = v; }
  return n ? `${best} (${n}p)` : "—";
}

function topSubject(rows: AssignmentRow[]): string {
  const by = new Map<string, number>();
  for (const r of rows) by.set(r.subject, (by.get(r.subject) ?? 0) + r.weekly);
  let best = "—", n = 0;
  for (const [s, v] of by) if (v > n) { best = s; n = v; }
  return n ? `${best} (${n}p)` : "—";
}

function Stats() {
  // Aggregate
  let totalPeriods = 0;
  const subjects = new Set<string>();
  for (const d of DAYS) for (const p of PERIODS) for (const s of SCHEDULE[d][p]) {
    totalPeriods++;
    subjects.add(s.subject);
  }

  const sorted = [...TEACHERS].sort((a, b) => TEACHER_LOADS[b.code] - TEACHER_LOADS[a.code]);
  const max = sorted[0];
  const min = sorted[sorted.length - 1];
  const teachingHours = (totalPeriods * 40) / 60;

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <h1 className="text-xl font-bold text-foreground">Statistics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">College-wide totals and per-teacher workload analysis.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Big label="Teachers" value={TEACHERS.length} />
        <Big label="Classes" value={CLASSES.length} />
        <Big label="Subjects" value={subjects.size} />
        <Big label="Weekly Periods" value={totalPeriods} />
        <Big label="Teaching Hours" value={teachingHours.toFixed(0)} />
        <Big label="Avg / Day" value={(totalPeriods / 6).toFixed(1)} />
        <Big label="Top Teacher" value={max.code} sub={`${TEACHER_LOADS[max.code]} periods`} />
        <Big label="Lightest" value={min.code} sub={`${TEACHER_LOADS[min.code]} periods`} />
      </div>

      <div className="card-soft p-4">
        <h3 className="text-sm font-semibold text-foreground">Teacher Workload</h3>
        <div className="mt-4 space-y-3">
          {sorted.map((t) => {
            const stats = getTeacherStats(t.code);
            const pct = Math.round((TEACHER_LOADS[t.code] / TEACHER_LOADS[max.code]) * 100);
            return (
              <div key={t.code}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="font-semibold text-foreground">{t.fullName}</span>
                    <span className="text-muted-foreground">· {t.code}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{stats.totalWeeklyPeriods}p · {stats.totalClasses}cls</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: t.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="px-1 text-sm font-semibold text-foreground">Class-wise Subject Assignments</h3>
        {sorted.map((t) => (
          <TeacherDetail key={t.code} teacher={t} />
        ))}
      </div>
    </div>
  );
}

function TeacherDetail({ teacher }: { teacher: Teacher }) {
  const [open, setOpen] = useState(false);
  const rows = buildAssignments(teacher.code);
  const stats = getTeacherStats(teacher.code);
  const weekly = stats.totalWeeklyPeriods;
  const teachingDays = DAYS.filter((d) => stats.periodsByDay[d] > 0).length;
  const avgPerDay = teachingDays ? (weekly / teachingDays).toFixed(1) : "0";
  const freeSlots = DAYS.length * PERIODS.length - weekly;

  return (
    <div className="card-soft overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-secondary/40"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold"
            style={{ backgroundColor: teacher.color, color: textOn(teacher.color) }}
          >
            {teacher.shortName}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{teacher.fullName}</div>
            <div className="text-[11px] text-muted-foreground">
              {weekly} periods · {stats.totalClasses} classes · {stats.subjects.length} subjects
            </div>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border bg-secondary/20 p-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-y-1.5 text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1">Class</th>
                  <th className="px-2 py-1">Subject</th>
                  <th className="px-2 py-1 text-center">Weekly</th>
                  <th className="px-2 py-1 text-center">% Load</th>
                  <th className="px-2 py-1">Periods</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const pct = weekly ? Math.round((r.weekly / weekly) * 100) : 0;
                  return (
                    <tr key={i} className="rounded-lg">
                      <td className="rounded-l-lg bg-card px-2 py-2 font-bold text-foreground">{r.className}</td>
                      <td className="bg-card px-2 py-2">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: teacher.color, color: textOn(teacher.color) }}
                        >
                          {r.subject}
                        </span>
                      </td>
                      <td className="bg-card px-2 py-2 text-center font-mono text-foreground">{r.weekly}</td>
                      <td className="bg-card px-2 py-2 text-center font-mono text-muted-foreground">{pct}%</td>
                      <td className="rounded-r-lg bg-card px-2 py-2 text-[11px] text-muted-foreground">
                        {r.periods.join(", ")}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="bg-card px-2 py-4 text-center text-muted-foreground">No assignments.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini label="Weekly Periods" value={weekly} />
            <Mini label="Subjects" value={stats.subjects.length} />
            <Mini label="Classes" value={stats.totalClasses} />
            <Mini label="Busiest Class" value={busiestClass(rows)} />
            <Mini label="Top Subject" value={topSubject(rows)} />
            <Mini label="Avg / Teaching Day" value={avgPerDay} />
            <Mini label="Free Slots / Week" value={freeSlots} />
            <Mini label="Teaching Hours" value={((weekly * 40) / 60).toFixed(1)} />
          </div>

          <div className="mt-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Day-wise Periods</div>
            <div className="grid grid-cols-6 gap-1.5">
              {DAYS.map((d) => (
                <div key={d} className="rounded-lg bg-card px-2 py-1.5 text-center">
                  <div className="text-[10px] text-muted-foreground">{DAY_SHORT[d]}</div>
                  <div className="text-sm font-bold text-foreground">{stats.periodsByDay[d]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Big({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card-soft p-4">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-card px-2.5 py-2">
      <div className="truncate text-sm font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
