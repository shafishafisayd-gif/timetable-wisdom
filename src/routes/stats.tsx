import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Clock, Users } from "lucide-react";
import {
  TEACHERS,
  TEACHER_BY_CODE,
  getTeacherStats,
  getTeacherSchedule,
  DAYS,
  DAY_LABELS,
  PERIODS,
  PERIOD_LABELS,
  PERIOD_TIMES,
  textOn,
  type ClassId,
  type DayCode,
} from "@/data/timetable";
import {
  fetchSyllabusSettings,
  fetchSyllabusStatus,
  getTeacherClassSubjects,
  MONTH_LONG,
  buildAcademicMonths,
  type SyllabusStatusRow,
  type SyllabusStatusValue,
} from "@/lib/syllabus-api";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Teacher Workload Statistics · Malja'a" },
      { name: "description", content: "Simple workload overview: periods, hours, classes, subjects and syllabus progress for every teacher at Malja'a College." },
      { property: "og:title", content: "Teacher Workload Statistics · Malja'a" },
      { property: "og:description", content: "Periods, teaching hours, class-wise subjects and syllabus progress for each teacher." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stats,
});

const PERIOD_MIN = Object.fromEntries(
  PERIOD_TIMES.map((p) => [p.period, p.endMin - p.startMin]),
) as Record<number, number>;

function hoursFor(code: string) {
  const sched = getTeacherSchedule(code);
  let min = 0;
  for (const d of DAYS) for (const p of PERIODS) if (sched[d][p]) min += PERIOD_MIN[p] ?? 40;
  return Math.round((min / 60) * 10) / 10;
}

function dayPeriods(code: string) {
  const sched = getTeacherSchedule(code);
  return DAYS.map((d) => ({
    day: d as DayCode,
    labels: PERIODS.filter((p) => sched[d][p]).map((p) => PERIOD_LABELS[p]),
  }));
}

function statusKey(r: { class_id: string; subject: string }) {
  return `${r.class_id}|${r.subject}`;
}

function useSyllabus() {
  const settings = useQuery({ queryKey: ["syllabus-settings"], queryFn: fetchSyllabusSettings });
  const year = settings.data?.academic_year_name;
  const status = useQuery({
    queryKey: ["syllabus-status", year],
    queryFn: () => fetchSyllabusStatus(year ? { academicYear: year } : undefined),
    enabled: !!settings.data,
  });
  const months = settings.data
    ? buildAcademicMonths(settings.data.start_month, settings.data.end_month)
    : [];
  const nowMonth = new Date().getMonth() + 1;
  const month = months.find((m) => m.month === nowMonth)?.month ?? months[0]?.month ?? nowMonth;
  const rows = (status.data ?? []).filter((r) => r.month === month);
  return { month, rows, year };
}

function progressFor(
  code: string,
  rows: SyllabusStatusRow[],
): { pairs: { className: ClassId; subject: string }[]; map: Map<string, SyllabusStatusValue>; done: number; total: number; percent: number } {
  const pairs = getTeacherClassSubjects(code).map((p) => ({ className: p.className, subject: p.subject }));
  const map = new Map<string, SyllabusStatusValue>();
  for (const r of rows) if (r.teacher_code === code) map.set(statusKey(r), r.status);
  const done = pairs.filter((p) => map.get(`${p.className}|${p.subject}`) === "completed").length;
  return { pairs, map, done, total: pairs.length, percent: pairs.length ? Math.round((done / pairs.length) * 100) : 0 };
}

function Stats() {
  const [selected, setSelected] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<"ALL" | ClassId>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<"ALL" | string>("ALL");
  const { month, rows } = useSyllabus();

  const data = useMemo(
    () =>
      TEACHERS.map((t) => {
        const s = getTeacherStats(t.code);
        const prog = progressFor(t.code, rows);
        return { teacher: t, stats: s, hours: hoursFor(t.code), prog };
      }),
    [rows],
  );

  const subjects = useMemo(
    () => Array.from(new Set(data.flatMap((d) => d.stats.subjects))).sort(),
    [data],
  );

  const list = data.filter((d) => {
    if (classFilter !== "ALL" && !d.stats.classesAssigned.includes(classFilter)) return false;
    if (subjectFilter !== "ALL" && !d.stats.subjects.includes(subjectFilter)) return false;
    return true;
  });

  if (selected) {
    const entry = data.find((d) => d.teacher.code === selected);
    if (entry) return <TeacherDetail entry={entry} month={month} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-5">
      <section className="card-soft p-5">
        <h1 className="text-xl font-bold text-foreground">Teacher Statistics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Workload, classes, subjects and syllabus progress · {MONTH_LONG[month - 1]}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value as "ALL" | ClassId)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">All classes</option>
            {["S1", "S2", "S3", "S4", "S5", "S6", "S7"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map(({ teacher, stats, hours, prog }) => (
          <button
            key={teacher.code}
            onClick={() => setSelected(teacher.code)}
            className="card-soft p-4 text-left transition hover:shadow-[var(--shadow-lift)] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold"
                style={{ backgroundColor: teacher.color, color: textOn(teacher.color) }}
              >
                {teacher.shortName}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold leading-tight text-foreground">{teacher.fullName}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {stats.totalWeeklyPeriods} Periods · {hours} hrs · {stats.totalClasses} Classes · {stats.subjects.length} Subjects
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Syllabus</span>
                <span className="text-foreground">{prog.percent}% completed</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${prog.percent}%` }} />
              </div>
            </div>
            <div className="mt-3 text-xs font-semibold text-primary">View Details →</div>
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="card-soft p-10 text-center text-sm text-muted-foreground">No teachers match these filters.</div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-3 py-3 text-center">
      <div className="text-lg font-bold leading-none text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function TeacherDetail({
  entry,
  month,
  onBack,
}: {
  entry: { teacher: (typeof TEACHERS)[number]; stats: ReturnType<typeof getTeacherStats>; hours: number; prog: ReturnType<typeof progressFor> };
  month: number;
  onBack: () => void;
}) {
  const { teacher, stats, hours, prog } = entry;
  const sched = getTeacherSchedule(teacher.code);

  // Class-wise subject breakdown (only explicitly specified subjects)
  const byClass = useMemo(() => {
    const map = new Map<ClassId, Map<string, number>>();
    for (const d of DAYS)
      for (const p of PERIODS) {
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
        total: Array.from(m.values()).reduce((a, b) => a + b, 0),
      }));
  }, [sched]);

  const syllabusByClass = useMemo(() => {
    const map = new Map<ClassId, { subject: string; status: SyllabusStatusValue }[]>();
    for (const p of prog.pairs) {
      const arr = map.get(p.className) ?? [];
      arr.push({ subject: p.subject, status: prog.map.get(`${p.className}|${p.subject}`) ?? "not_started" });
      map.set(p.className, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [prog]);

  return (
    <div className="space-y-5">
      <section className="card-soft p-5">
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All teachers
        </button>
        <div className="flex items-center gap-3">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold"
            style={{ backgroundColor: teacher.color, color: textOn(teacher.color) }}
          >
            {teacher.shortName}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight text-foreground">{teacher.fullName}</h1>
            <div className="text-xs text-muted-foreground">{teacher.position} · <span className="font-mono">{teacher.code}</span></div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Card label="Periods" value={stats.totalWeeklyPeriods} />
          <Card label="Hours" value={hours} />
          <Card label="Classes" value={stats.totalClasses} />
          <Card label="Subjects" value={stats.subjects.length} />
          <Card label="Syll. done" value={prog.done} />
          <Card label="Syll. pending" value={prog.total - prog.done} />
        </div>
        {stats.subjectUnspecifiedPeriods > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Includes {stats.subjectUnspecifiedPeriods} teacher-only period(s) with no subject specified.
          </p>
        )}
        <Link
          to="/teachers/$code"
          params={{ code: teacher.code }}
          className="mt-3 inline-block text-xs font-semibold text-primary"
        >
          Open teacher page →
        </Link>
      </section>

      <section className="card-soft p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><Clock className="h-4 w-4 text-primary" /> Weekly Periods</h2>
        <div className="mt-3 space-y-2">
          {dayPeriods(teacher.code).map(({ day, labels }) => (
            <div key={day} className="flex flex-wrap items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2">
              <span className="w-24 shrink-0 text-xs font-semibold text-foreground">{DAY_LABELS[day]}</span>
              {labels.length === 0 ? (
                <span className="text-xs text-muted-foreground">No periods</span>
              ) : (
                labels.map((l) => (
                  <span key={l} className="rounded-lg bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground">{l}</span>
                ))
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Weekly Total: <span className="text-foreground">{stats.totalWeeklyPeriods} Periods</span> · Teaching Hours: <span className="text-foreground">{hours} hrs</span>
        </p>
      </section>

      <section className="card-soft p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><Users className="h-4 w-4 text-primary" /> Class-wise Subjects</h2>
        <div className="mt-3 space-y-4">
          {byClass.map((c) => (
            <div key={c.cls}>
              <div className="text-sm font-bold text-foreground">{c.cls}</div>
              <div className="mt-1.5 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {c.subjects.map(([sub, n]) => (
                      <tr key={sub} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-foreground">{sub}</td>
                        <td className="w-20 px-3 py-2 text-right font-semibold text-foreground">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{c.cls} Total: {c.total} Periods</div>
            </div>
          ))}
          {byClass.length === 0 && <p className="text-sm text-muted-foreground">No subject-specified periods.</p>}
        </div>
      </section>

      <section className="card-soft p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><BookOpen className="h-4 w-4 text-primary" /> Syllabus Status · {MONTH_LONG[month - 1]}</h2>
        <div className="mt-2 text-xs text-muted-foreground">
          Completed: {prog.done} / {prog.total} · Pending: {prog.total - prog.done} · Progress: {prog.percent}%
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${prog.percent}%` }} />
        </div>
        <div className="mt-4 space-y-3">
          {syllabusByClass.map(([cls, items]) => (
            <div key={cls}>
              <div className="text-sm font-bold text-foreground">{cls}</div>
              <div className="mt-1 space-y-1">
                {items.map((it) => (
                  <div key={it.subject} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm">
                    <span className="text-foreground">{it.subject}</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${it.status === "completed" ? "text-success" : it.status === "in_progress" ? "text-warning" : "text-muted-foreground"}`}>
                      {it.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      {it.status === "completed" ? "Completed" : it.status === "in_progress" ? "In progress" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {syllabusByClass.length === 0 && <p className="text-sm text-muted-foreground">No syllabus subjects.</p>}
        </div>
      </section>
    </div>
  );
}

export default Stats;
