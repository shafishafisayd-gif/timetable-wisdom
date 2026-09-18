import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import {
  TEACHERS,
  TEACHER_BY_CODE,
  CLASSES,
  SCHEDULE,
  DAYS,
  PERIODS,
  PERIOD_TIMES,
  getTeacherStats,
  getTeacherSchedule,
  textOn,
  type ClassId,
} from "@/data/timetable";
import { fetchStudents } from "@/lib/students-api";
import {
  fetchSyllabusSettings,
  fetchSyllabusStatus,
  getTeacherClassSubjects,
  type SyllabusStatusRow,
  type SyllabusStatusValue,
} from "@/lib/syllabus-api";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics · Malja'a Timetable" },
      { name: "description", content: "Who teaches what: teacher workload, class-wise subjects, period counts and syllabus progress at Malja'a College." },
      { property: "og:title", content: "Statistics · Malja'a Timetable" },
      { property: "og:description", content: "Teacher workload, class-wise subject and period counts, and syllabus progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stats,
});

const PERIOD_MIN = Object.fromEntries(
  PERIOD_TIMES.map((p) => [p.period, p.endMin - p.startMin]),
) as Record<number, number>;

/** Teaching hours from every assigned period, including Sub N/S. */
function hoursFor(code: string) {
  const sched = getTeacherSchedule(code, false);
  let min = 0;
  for (const d of DAYS) for (const p of PERIODS) if (sched[d][p]) min += PERIOD_MIN[p] ?? 40;
  return Math.round((min / 60) * 10) / 10;
}

/** Class-wise breakdown of a teacher's subject-specified periods. */
function classBreakdown(code: string) {
  const sched = getTeacherSchedule(code, false);
  const map = new Map<ClassId, Map<string, number>>();
  for (const d of DAYS) for (const p of PERIODS) {
    const s = sched[d][p];
    if (!s || !s.subjectSpecified) continue;
    const m = map.get(s.className) ?? new Map<string, number>();
    m.set(s.subject, (m.get(s.subject) ?? 0) + 1);
    map.set(s.className, m);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cls, m]) => ({
      cls,
      subjects: Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    }));
}

/** Class → subject → teacher → weekly period count (subject-specified only). */
function classSubjectTable() {
  const out = CLASSES.map((cls) => {
    const map = new Map<string, { subject: string; teacher: string; periods: number }>();
    let weekly = 0;
    for (const d of DAYS) for (const p of PERIODS) {
      for (const s of SCHEDULE[d][p]) {
        if (s.className !== cls) continue;
        weekly += 1;
        if (!s.subjectSpecified) continue;
        const key = `${s.subject}|${s.teacher}`;
        const row = map.get(key) ?? { subject: s.subject, teacher: s.teacher, periods: 0 };
        row.periods += 1;
        map.set(key, row);
      }
    }
    return {
      cls,
      weekly,
      rows: Array.from(map.values()).sort((a, b) => a.subject.localeCompare(b.subject)),
    };
  });
  return out;
}

function syllabusFor(code: string, rows: SyllabusStatusRow[]) {
  const pairs = getTeacherClassSubjects(code);
  const map = new Map<string, SyllabusStatusValue>();
  for (const r of rows) if (r.teacher_code === code) map.set(`${r.class_id}|${r.subject}`, r.status);
  const items = pairs.map((p) => ({
    className: p.className,
    subject: p.subject,
    status: map.get(`${p.className}|${p.subject}`) ?? ("not_started" as SyllabusStatusValue),
  }));
  const completed = items.filter((i) => i.status === "completed").length;
  return {
    items,
    completed,
    pending: items.length - completed,
    total: items.length,
    percent: items.length ? Math.round((completed / items.length) * 100) : 0,
  };
}

function Stats() {
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const statusQ = useQuery({
    queryKey: ["syllabus_status", "all", settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () => fetchSyllabusStatus({ academicYear: settingsQ.data!.academic_year_name }),
  });
  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });

  const rows = statusQ.data ?? [];

  const teachers = useMemo(
    () =>
      TEACHERS.map((t) => {
        const stats = getTeacherStats(t.code);
        return {
          teacher: t,
          stats,
          hours: hoursFor(t.code),
          breakdown: classBreakdown(t.code),
          syl: syllabusFor(t.code, rows),
        };
      }).sort((a, b) => b.stats.totalWeeklyPeriods - a.stats.totalWeeklyPeriods),
    [rows],
  );

  const classes = useMemo(classSubjectTable, []);
  const totalPeriods = classes.reduce((a, c) => a + c.weekly, 0);
  const sylTotal = teachers.reduce((a, t) => a + t.syl.total, 0);
  const sylDone = teachers.reduce((a, t) => a + t.syl.completed, 0);
  const sylPct = sylTotal ? Math.round((sylDone / sylTotal) * 100) : 0;

  return (
    <div className="space-y-5">
      <section className="card-soft p-5">
        <h1 className="text-xl font-bold text-foreground">Statistics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Who teaches what, how many periods, and syllabus progress.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Kpi label="Teachers" value={TEACHERS.length} />
          <Kpi label="Classes" value={CLASSES.length} />
          <Kpi label="Students" value={studentsQ.data?.length ?? 0} />
          <Kpi label="Periods/wk" value={totalPeriods} />
          <Kpi label="Syllabus" value={`${sylPct}%`} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">Teacher Workload</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {teachers.map(({ teacher, stats, hours, breakdown, syl }) => (
            <div key={teacher.code} className="card-soft p-4">
              <Link to="/teachers/$code" params={{ code: teacher.code }} className="flex items-center gap-3">
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold"
                  style={{ backgroundColor: teacher.color, color: textOn(teacher.color) }}
                >
                  {teacher.shortName}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold leading-tight text-foreground">{teacher.fullName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {stats.totalWeeklyPeriods} Periods · {stats.totalClasses} Classes · {stats.subjects.length} Subjects · {hours} Hours
                  </div>
                </div>
              </Link>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Syllabus</span>
                  <span className="font-semibold text-foreground">{syl.percent}% · {syl.completed} done · {syl.pending} pending</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${syl.percent}%` }} />
                </div>
              </div>

              {breakdown.length > 0 && (
                <div className="mt-3 space-y-1">
                  {breakdown.map((b) => (
                    <div key={b.cls} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className="font-bold text-foreground">{b.cls}</span>
                      <span className="text-muted-foreground">
                        {b.subjects.map(([sub, n]) => `${sub} — ${n}`).join(" · ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {syl.items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {syl.items.map((i) => (
                    <span
                      key={`${i.className}|${i.subject}`}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                        i.status === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {i.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                      {i.className} {i.subject}
                    </span>
                  ))}
                </div>
              )}

              {stats.subjectUnspecifiedPeriods > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Includes {stats.subjectUnspecifiedPeriods} Sub N/S period(s) — counted as workload, not as syllabus subjects.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">Class-wise Subjects &amp; Periods</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {classes.map((c) => (
            <div key={c.cls} className="card-soft p-4">
              <div className="flex items-center justify-between">
                <Link to="/classes/$id" params={{ id: c.cls }} search={{ tab: "timetable" }} className="text-sm font-bold text-foreground">
                  Class {c.cls}
                </Link>
                <span className="text-xs text-muted-foreground">{c.weekly} periods/wk</span>
              </div>
              <div className="mt-2 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {c.rows.map((r) => (
                      <tr key={`${r.subject}|${r.teacher}`} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-foreground">{r.subject}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {TEACHER_BY_CODE[r.teacher]?.shortName ?? r.teacher}
                        </td>
                        <td className="w-16 px-3 py-2 text-right font-semibold text-foreground">{r.periods}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-3 py-3 text-center">
      <div className="text-lg font-bold leading-none text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export default Stats;
