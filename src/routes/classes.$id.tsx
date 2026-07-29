import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Coffee, Users, CalendarDays, BookOpen, TrendingUp, Trophy,
  LayoutDashboard, History, Printer, HelpCircle,
} from "lucide-react";
import { z } from "zod";
import {
  CLASSES,
  getClassSchedule,
  SCHEDULE,
  DAYS,
  DAY_LABELS,
  PERIODS,
  PERIOD_LABELS,
  PERIOD_TIMES,
  TIMETABLE_COLUMNS,
  TEACHER_BY_CODE,
  formatTime12,
  textOn,
  jsDayToCode,
  type ClassId,
  type DayCode,
} from "@/data/timetable";
import { StudentsSection } from "@/components/StudentsSection";
import {
  fetchStudents,
  fetchEvaluations,
  computeStudentStats,
  type Evaluation,
  type StudentStats,
  type Student,
} from "@/lib/students-api";
import {
  fetchSyllabusSettings,
  fetchSyllabusStatus,
  summarize,
} from "@/lib/syllabus-api";
import { useNow } from "@/lib/use-now";

const searchSchema = z.object({ highlight: z.string().optional(), tab: z.string().optional() });

export const Route = createFileRoute("/classes/$id")({
  validateSearch: searchSchema,
  loader: ({ params }) => {
    if (!CLASSES.includes(params.id as ClassId)) throw notFound();
    return null;
  },
  head: ({ params }) => ({ meta: [{ title: `Class ${params.id} · Malja'a` }] }),
  component: ClassDetail,
});

type Tab = "overview" | "students" | "timetable" | "subjects" | "performance" | "rounds";
const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "students", label: "Students", icon: Users },
  { key: "timetable", label: "Timetable", icon: CalendarDays },
  { key: "subjects", label: "Subjects", icon: BookOpen },
  { key: "performance", label: "Performance", icon: TrendingUp },
  { key: "rounds", label: "Rounds", icon: History },
];

function ClassDetail() {
  const { id } = Route.useParams();
  const { highlight, tab } = Route.useSearch();
  const cls = id as ClassId;
  const initialTab = ((): Tab => {
    if (highlight) return "students";
    if (tab && TABS.some((t) => t.key === (tab as Tab))) return tab as Tab;
    return "overview";
  })();
  const [active, setActive] = useState<Tab>(initialTab);

  return (
    <div className="space-y-4">
      <Link to="/classes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All classes
      </Link>

      <ClassHero cls={cls} />

      <div className="card-soft flex gap-1 overflow-x-auto p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                on ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {active === "overview" && <OverviewTab cls={cls} />}
      {active === "students" && <StudentsSection classId={cls} highlightId={highlight} />}
      {active === "timetable" && <TimetableTab cls={cls} />}
      {active === "subjects" && <SubjectsTab cls={cls} />}
      {active === "performance" && <PerformanceTab cls={cls} />}
      {active === "rounds" && <RoundsTab cls={cls} />}
    </div>
  );
}

function ClassHero({ cls }: { cls: ClassId }) {
  const sched = getClassSchedule(cls);
  let total = 0;
  const subs = new Set<string>();
  const teachers = new Set<string>();
  for (const d of DAYS) for (const p of PERIODS) {
    const s = sched[d][p];
    if (s) { total++; subs.add(s.subject); teachers.add(s.teacher); }
  }
  return (
    <div className="card-lift p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">{cls}</div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">Class {cls}</h1>
          <p className="text-xs text-muted-foreground">{total} weekly periods · {teachers.size} teachers · {subs.size} subjects</p>
        </div>
      </div>
    </div>
  );
}

// -------- Overview --------
function OverviewTab({ cls }: { cls: ClassId }) {
  const studentsQ = useQuery({ queryKey: ["students", cls], queryFn: () => fetchStudents(cls) });
  const evalsQ = useQuery({ queryKey: ["evaluations", "class", cls], queryFn: () => fetchEvaluations({ classId: cls }) });
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const statusQ = useQuery({
    queryKey: ["syllabus_status", "class", cls, settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () => fetchSyllabusStatus({ classId: cls, academicYear: settingsQ.data!.academic_year_name }),
  });
  const now = useNow(30_000);

  const sched = getClassSchedule(cls);
  const day = jsDayToCode(now.getDay());
  const mins = now.getHours() * 60 + now.getMinutes();
  const currentPeriod = PERIOD_TIMES.find((p) => mins >= p.startMin && mins < p.endMin) ?? null;
  const currentSlot = day && currentPeriod ? sched[day][currentPeriod.period] : null;

  const pairs = useMemo(() => {
    const set = new Set<string>();
    const out: { className: ClassId; subject: string }[] = [];
    for (const d of DAYS) for (const p of PERIODS) {
      const s = sched[d][p];
      if (!s) continue;
      const k = `${s.className}|${s.subject}`;
      if (!set.has(k)) { set.add(k); out.push({ className: cls, subject: s.subject }); }
    }
    return out;
  }, [sched, cls]);

  const syl = summarize(statusQ.data ?? [], pairs);
  const evals = evalsQ.data ?? [];
  const students = studentsQ.data ?? [];

  const perStudent = useMemo(() => {
    const by = new Map<string, Evaluation[]>();
    for (const e of evals) {
      const arr = by.get(e.student_id) ?? [];
      arr.push(e); by.set(e.student_id, arr);
    }
    return students
      .map((s) => ({ s, st: by.get(s.id) ? computeStudentStats(by.get(s.id)!) : null }));
  }, [evals, students]);

  const withPts = perStudent.filter((r) => r.st && r.st.totalAsked > 0);
  const avgPoints = withPts.length ? withPts.reduce((a, r) => a + (r.st!.totalPoints), 0) / withPts.length : 0;
  const leader = [...withPts].sort((a, b) => (b.st!.totalPoints) - (a.st!.totalPoints))[0];

  const teachers = new Set<string>();
  const subs = new Set<string>();
  let weekly = 0;
  for (const d of DAYS) for (const p of PERIODS) {
    const s = sched[d][p];
    if (s) { teachers.add(s.teacher); subs.add(s.subject); weekly++; }
  }

  const currentTeacher = currentSlot ? TEACHER_BY_CODE[currentSlot.teacher] : null;

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div className="card-soft grid grid-cols-3 gap-2 p-3 sm:grid-cols-6">
        <QuickAction to={{ to: "/classes/$id", params: { id: cls }, search: { tab: "students" } }} icon={HelpCircle} label="Ask Question" />
        <QuickAction to={{ to: "/classes/$id", params: { id: cls }, search: { tab: "timetable" } }} icon={CalendarDays} label="Timetable" />
        <QuickAction to={{ to: "/rankings" }} icon={Trophy} label="Rankings" />
        <QuickAction to={{ to: "/classes/$id", params: { id: cls }, search: { tab: "subjects" } }} icon={BookOpen} label="Syllabus" />
        <QuickAction to={{ to: "/classes/$id", params: { id: cls }, search: { tab: "performance" } }} icon={TrendingUp} label="Performance" />
        <button onClick={() => window.print()} className="flex flex-col items-center justify-center gap-1 rounded-xl bg-secondary/60 px-2 py-2 text-[10px] font-semibold text-foreground hover:bg-secondary">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Students" value={students.length} />
        <Kpi label="Subjects" value={subs.size} />
        <Kpi label="Teachers" value={teachers.size} />
        <Kpi label="Weekly Periods" value={weekly} />
        <Kpi label="Avg Points" value={avgPoints.toFixed(1)} />
        <Kpi label="Attendance" value={`${attendancePct(evals)}%`} />
        <Kpi label="Syllabus" value={`${syl.percent}%`} />
        <Kpi label="Class Leader" value={leader ? `#${leader.s.admission_no}` : "—"} sub={leader ? `${leader.st!.totalPoints.toFixed(0)} pts` : undefined} />
      </div>

      <div className="card-soft p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Right now</h3>
          <span className="text-[10px] text-muted-foreground">{day ? DAY_LABELS[day] : "Off day"} · {formatTime12(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`)}</span>
        </div>
        {currentPeriod && day ? (
          currentSlot ? (
            <Link
              to="/teachers/$code"
              params={{ code: currentSlot.teacher }}
              className="mt-3 flex items-center gap-3 rounded-2xl p-3"
              style={{ backgroundColor: currentTeacher?.color, color: currentTeacher ? textOn(currentTeacher.color) : "#fff" }}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-black/20 text-sm font-bold">
                {PERIOD_LABELS[currentPeriod.period]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] opacity-80">{formatTime12(currentPeriod.start)} – {formatTime12(currentPeriod.end)}</div>
                <div className="truncate text-sm font-bold">{currentSlot.subject}</div>
                <div className="truncate text-xs opacity-90">{currentTeacher?.fullName} · {currentSlot.teacher}</div>
              </div>
            </Link>
          ) : (
            <div className="mt-3 rounded-2xl bg-secondary/60 p-3 text-sm text-muted-foreground">
              {PERIOD_LABELS[currentPeriod.period]} · Free period
            </div>
          )
        ) : (
          <div className="mt-3 rounded-2xl bg-secondary/60 p-3 text-sm text-muted-foreground">
            Currently on break or outside teaching hours.
          </div>
        )}
      </div>

      <div className="card-soft p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Syllabus completion</span>
          <span className="text-muted-foreground">{syl.completed}/{syl.total} ({syl.percent}%)</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${syl.percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function attendancePct(evals: Evaluation[]) {
  if (!evals.length) return 0;
  const present = evals.filter((e) => e.status !== "absent").length;
  return Math.round((present / evals.length) * 100);
}

// -------- Timetable --------
function TimetableTab({ cls }: { cls: ClassId }) {
  const sched = getClassSchedule(cls);
  const now = useNow(30_000);
  const day = jsDayToCode(now.getDay());
  const mins = now.getHours() * 60 + now.getMinutes();
  const currentP = PERIOD_TIMES.find((p) => mins >= p.startMin && mins < p.endMin)?.period ?? -1;
  let total = 0;
  for (const d of DAYS) for (const p of PERIODS) if (sched[d][p]) total++;

  return (
    <div className="card-soft p-2 sm:p-3">
      <div className="overflow-x-auto overscroll-x-contain rounded-xl" style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}>
        <table className="w-full min-w-max border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 rounded-lg bg-secondary px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm">Day</th>
              {TIMETABLE_COLUMNS.map((col, i) =>
                col.type === "period" ? (
                  <th key={`h-p-${i}`} className={`rounded-lg px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide shadow-sm ${
                    col.period.period === currentP ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
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
              <tr key={d} className={day === d ? "" : "opacity-95"}>
                <td className={`sticky left-0 z-10 rounded-lg px-2 py-2 text-xs font-semibold shadow-sm ${day === d ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{DAY_LABELS[d].slice(0, 3)}</td>
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
                  const isNow = day === d && p === currentP;
                  if (!slot) return (
                    <td key={`c-p-${d}-${i}`}>
                      <div className={`min-w-[92px] rounded-lg px-2 py-2 text-center text-[10px] ${isNow ? "ring-2 ring-primary" : ""} bg-secondary/40 text-muted-foreground`}>FREE</div>
                    </td>
                  );
                  const teacher = TEACHER_BY_CODE[slot.teacher];
                  return (
                    <td key={`c-p-${d}-${i}`}>
                      <Link to="/teachers/$code" params={{ code: slot.teacher }}
                        className={`block min-w-[92px] rounded-lg px-2 py-1.5 text-[11px] font-semibold shadow-sm ${isNow ? "ring-2 ring-primary" : ""}`}
                        style={{ backgroundColor: teacher?.color, color: teacher ? textOn(teacher.color) : "#fff" }}>
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
      <div className="mt-2 px-2 text-[11px] text-muted-foreground">{total} weekly periods · original PDF colours preserved.</div>
    </div>
  );
}

// -------- Subjects --------
function SubjectsTab({ cls }: { cls: ClassId }) {
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const statusQ = useQuery({
    queryKey: ["syllabus_status", "class", cls, settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () => fetchSyllabusStatus({ classId: cls, academicYear: settingsQ.data!.academic_year_name }),
  });
  const evalsQ = useQuery({ queryKey: ["evaluations", "class", cls], queryFn: () => fetchEvaluations({ classId: cls }) });

  const groups = useMemo(() => {
    const map = new Map<string, { teacher: string; subject: string; weekly: number }[]>();
    for (const d of DAYS) for (const p of PERIODS) {
      for (const s of SCHEDULE[d][p]) {
        if (s.className !== cls) continue;
        const arr = map.get(s.teacher) ?? [];
        const existing = arr.find((x) => x.subject === s.subject);
        if (existing) existing.weekly++;
        else arr.push({ teacher: s.teacher, subject: s.subject, weekly: 1 });
        map.set(s.teacher, arr);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cls]);

  const statuses = statusQ.data ?? [];
  const evals = evalsQ.data ?? [];

  return (
    <div className="space-y-3">
      {groups.map(([teacherCode, subs]) => {
        const teacher = TEACHER_BY_CODE[teacherCode];
        return (
          <div key={teacherCode} className="card-soft overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-4 py-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold" style={{ backgroundColor: teacher?.color, color: teacher ? textOn(teacher.color) : "#fff" }}>
                {teacher?.shortName ?? teacherCode}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{teacher?.fullName ?? teacherCode}</div>
                <div className="text-[10px] text-muted-foreground">{subs.length} subjects assigned</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              {subs.map((s) => {
                const monthStatuses = statuses.filter((x) => x.subject === s.subject && x.teacher_code === teacherCode);
                const completed = monthStatuses.filter((x) => x.status === "completed").length;
                const totalMonths = monthStatuses.length || 1;
                const pct = Math.round((completed / totalMonths) * 100);
                const pending = monthStatuses.filter((x) => x.status !== "completed").length;
                const subjEvals = evals.filter((e) => e.subject === s.subject);
                const avgMark = (() => {
                  const marks = subjEvals.filter((e) => e.status === "answered" && typeof e.mark === "number").map((e) => e.mark!);
                  return marks.length ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) : "—";
                })();
                return (
                  <div key={s.subject} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-foreground">{s.subject}</div>
                        <div className="text-[10px] text-muted-foreground">{s.weekly} weekly · Avg mark {avgMark}</div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{completed}/{monthStatuses.length || 0} months done</span>
                      <span>{pending} pending</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -------- Performance --------
function PerformanceTab({ cls }: { cls: ClassId }) {
  const studentsQ = useQuery({ queryKey: ["students", cls], queryFn: () => fetchStudents(cls) });
  const evalsQ = useQuery({ queryKey: ["evaluations", "class", cls], queryFn: () => fetchEvaluations({ classId: cls }) });
  const students = studentsQ.data ?? [];
  const evals = evalsQ.data ?? [];

  const rows = useMemo(() => {
    const by = new Map<string, Evaluation[]>();
    for (const e of evals) {
      const arr = by.get(e.student_id) ?? [];
      arr.push(e); by.set(e.student_id, arr);
    }
    return students.map((s) => ({ s, st: computeStudentStats(by.get(s.id) ?? []) }));
  }, [students, evals]);

  const withData = rows.filter((r) => r.st.totalAsked > 0);
  const highest = [...withData].sort((a, b) => b.st.totalPoints - a.st.totalPoints)[0];
  const lowest = [...withData].sort((a, b) => a.st.totalPoints - b.st.totalPoints)[0];
  const avg = withData.length ? withData.reduce((a, r) => a + r.st.totalPoints, 0) / withData.length : 0;
  const withMinus = withData.filter((r) => r.st.notAnswered > 0).sort((a, b) => b.st.notAnswered - a.st.notAnswered);
  const needsAttention = withData.filter((r) => r.st.totalPoints < 0 || r.st.notAnswered >= 3).sort((a, b) => a.st.totalPoints - b.st.totalPoints);

  const subjectAgg = useMemo(() => {
    const by = new Map<string, { marks: number[]; count: number }>();
    for (const e of evals) {
      const g = by.get(e.subject) ?? { marks: [], count: 0 };
      g.count++;
      if (e.status === "answered" && typeof e.mark === "number") g.marks.push(e.mark);
      by.set(e.subject, g);
    }
    return Array.from(by.entries()).map(([subject, g]) => ({
      subject,
      avg: g.marks.length ? g.marks.reduce((a, b) => a + b, 0) / g.marks.length : 0,
      count: g.count,
    })).sort((a, b) => b.avg - a.avg);
  }, [evals]);

  const strongest = subjectAgg[0];
  const weakest = [...subjectAgg].filter((s) => s.count > 0).sort((a, b) => a.avg - b.avg)[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Highest Scorer" value={highest ? `#${highest.s.admission_no}` : "—"} sub={highest ? `${highest.st.totalPoints.toFixed(0)} pts` : undefined} />
        <Kpi label="Lowest Scorer" value={lowest ? `#${lowest.s.admission_no}` : "—"} sub={lowest ? `${lowest.st.totalPoints.toFixed(0)} pts` : undefined} />
        <Kpi label="Avg Class Score" value={avg.toFixed(1)} />
        <Kpi label="Students with Minus" value={withMinus.length} />
        <Kpi label="Strongest Subject" value={strongest?.subject ?? "—"} sub={strongest ? `avg ${strongest.avg.toFixed(1)}` : undefined} />
        <Kpi label="Weakest Subject" value={weakest?.subject ?? "—"} sub={weakest ? `avg ${weakest.avg.toFixed(1)}` : undefined} />
        <Kpi label="Evaluated" value={withData.length} sub={`of ${students.length}`} />
        <Kpi label="Attendance" value={`${attendancePct(evals)}%`} />
      </div>

      <PerformanceList title="Students Requiring Attention" rows={needsAttention.slice(0, 8)} tone="warn" />
      <PerformanceList title="Top Scorers" rows={[...withData].sort((a, b) => b.st.totalPoints - a.st.totalPoints).slice(0, 8)} tone="good" />
      <PerformanceList title="Highest Minus Count" rows={withMinus.slice(0, 8)} tone="warn" metric={(st) => `${st.notAnswered}✗`} />
    </div>
  );
}

function PerformanceList({
  title, rows, tone, metric,
}: { title: string; rows: { s: Student; st: StudentStats }[]; tone: "good" | "warn"; metric?: (st: StudentStats) => string }) {
  const chip = tone === "good" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return (
    <div className="card-soft p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-muted-foreground">No data yet.</div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <Link key={r.s.id} to="/students/$id" params={{ id: r.s.id }} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">#{r.s.admission_no}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{r.s.name}</div>
                <div className="text-[10px] text-muted-foreground">Asked {r.st.totalAsked} · avg {r.st.averageMark.toFixed(1)}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${chip}`}>
                {metric ? metric(r.st) : `${r.st.totalPoints.toFixed(0)} pts`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// -------- Rounds --------
function RoundsTab({ cls }: { cls: ClassId }) {
  const evalsQ = useQuery({ queryKey: ["evaluations", "class", cls], queryFn: () => fetchEvaluations({ classId: cls }) });
  const studentsQ = useQuery({ queryKey: ["students", cls], queryFn: () => fetchStudents(cls) });

  const evals = evalsQ.data ?? [];
  const totalStudents = studentsQ.data?.length ?? 0;

  const rounds = useMemo(() => {
    const map = new Map<string, Evaluation[]>();
    for (const e of evals) {
      const key = `${e.teacher_code}|${e.subject}|${e.round_no}`;
      const arr = map.get(key) ?? [];
      arr.push(e); map.set(key, arr);
    }
    return Array.from(map.entries()).map(([k, list]) => {
      const [teacher, subject, roundNo] = k.split("|");
      const marks = list.filter((e) => e.status === "answered" && typeof e.mark === "number").map((e) => e.mark!);
      const minus = list.filter((e) => e.status === "not_answered").length;
      const asked = new Set(list.map((e) => e.student_id)).size;
      const complete = totalStudents > 0 && asked >= totalStudents;
      return {
        key: k, teacher, subject, roundNo: Number(roundNo), asked, minus,
        avg: marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0,
        complete,
        latest: list.reduce((max, e) => (e.created_at > max ? e.created_at : max), list[0].created_at),
      };
    }).sort((a, b) => (b.latest.localeCompare(a.latest)));
  }, [evals, totalStudents]);

  if (rounds.length === 0) {
    return <div className="card-soft p-6 text-center text-sm text-muted-foreground">No question rounds started yet.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rounds.map((r) => {
        const teacher = TEACHER_BY_CODE[r.teacher];
        return (
          <Link key={r.key} to="/session/$class/$subject" params={{ class: cls, subject: r.subject }} className="card-soft block p-4 transition hover:shadow-[var(--shadow-lift)]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{r.subject}</div>
                <div className="text-[11px] text-muted-foreground">{teacher?.fullName ?? r.teacher} · Round #{r.roundNo}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.complete ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                {r.complete ? "Completed" : "Active"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <Cell label="Asked" value={`${r.asked}${totalStudents ? `/${totalStudents}` : ""}`} />
              <Cell label="Avg" value={r.avg ? r.avg.toFixed(1) : "—"} />
              <Cell label="Minus" value={r.minus} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// -------- shared --------
function Kpi({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card-soft p-3">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-secondary/60 px-2 py-1.5 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QuickAction({ to, icon: Icon, label }: { to: any; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link {...to} className="flex flex-col items-center justify-center gap-1 rounded-xl bg-secondary/60 px-2 py-2 text-[10px] font-semibold text-foreground hover:bg-secondary">
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}

// silence unused imports
void DayCode;
