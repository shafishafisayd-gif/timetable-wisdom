import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Coffee, Users, CalendarDays, BookOpen, TrendingUp,
  ChevronDown, Sparkles,
} from "lucide-react";
import { z } from "zod";
import {
  CLASSES,
  getClassSchedule,
  getClassCell,
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
  getClassTotals,
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
  syllabusLabel,
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

type Tab = "overview" | "students" | "timetable" | "performance";
const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: BookOpen },
  { key: "students", label: "Students", icon: Users },
  { key: "timetable", label: "Timetable", icon: CalendarDays },
  { key: "performance", label: "Performance", icon: TrendingUp },
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickLink label="Students" icon={Users} onClick={() => setActive("students")} />
        <QuickLink label="Timetable" icon={CalendarDays} onClick={() => setActive("timetable")} />
        <AskQuestionLink cls={cls} />
        <Link to="/rankings" className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-2 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary">
          <TrendingUp className="h-4 w-4" /> Rankings
        </Link>
      </div>

      <div className="card-soft flex gap-1 overflow-x-auto p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
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
      {active === "performance" && <PerformanceTab cls={cls} />}
    </div>
  );
}

function QuickLink({ label, icon: Icon, onClick }: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-2 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary">
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

/** Jumps to the first subject-specified session for this class. */
function AskQuestionLink({ cls }: { cls: ClassId }) {
  const first = useMemo(() => {
    for (const d of DAYS) for (const p of PERIODS) {
      for (const s of SCHEDULE[d][p]) {
        if (s.className === cls && s.subjectSpecified) return { subject: s.subject, teacher: s.teacher };
      }
    }
    return null;
  }, [cls]);
  if (!first) {
    return <span className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary/30 px-2 py-2 text-xs font-semibold text-muted-foreground"><Sparkles className="h-4 w-4" /> Ask</span>;
  }
  return (
    <Link
      to="/session/$class/$subject"
      params={{ class: cls, subject: first.subject }}
      search={{ teacher: first.teacher }}
      className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-2 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
    >
      <Sparkles className="h-4 w-4" /> Ask
    </Link>
  );
}

// -------- Hero (compact live status + key metrics) --------
function ClassHero({ cls }: { cls: ClassId }) {
  const sched = getClassSchedule(cls);
  const now = useNow(30_000);
  const day = jsDayToCode(now.getDay());
  const mins = now.getHours() * 60 + now.getMinutes();
  const currentPeriod = PERIOD_TIMES.find((p) => mins >= p.startMin && mins < p.endMin) ?? null;
  const currentSlot = day && currentPeriod ? sched[day][currentPeriod.period] : null;
  const currentTeacher = currentSlot ? TEACHER_BY_CODE[currentSlot.teacher] : null;

  const studentsQ = useQuery({ queryKey: ["students", cls], queryFn: () => fetchStudents(cls) });
  const students = studentsQ.data ?? [];

  let weekly = 0;
  const subs = new Set<string>();
  const teachers = new Set<string>();
  for (const d of DAYS) for (const p of PERIODS) {
    const s = sched[d][p];
    if (s) { weekly++; if (s.subjectSpecified) subs.add(s.subject); teachers.add(s.teacher); }
  }

  return (
    <div className="card-lift p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">{cls}</div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-foreground">Class {cls}</h1>
          <p className="text-xs text-muted-foreground">
            {students.length} students · {teachers.size} teachers · {subs.size} subjects · {weekly} periods/wk
          </p>
        </div>
      </div>

      {currentPeriod && day ? (
        currentSlot ? (
          <Link
            to="/teachers/$code"
            params={{ code: currentSlot.teacher }}
            className="mt-4 flex items-center gap-3 rounded-2xl p-3"
            style={{ backgroundColor: currentTeacher?.color, color: currentTeacher ? textOn(currentTeacher.color) : "#fff" }}
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-black/20 text-xs font-bold">
              {PERIOD_LABELS[currentPeriod.period]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] opacity-80">Now · {formatTime12(currentPeriod.start)}–{formatTime12(currentPeriod.end)}</div>
              <div className="truncate text-sm font-bold">{currentSlot.subject}</div>
              <div className="truncate text-[11px] opacity-90">{currentTeacher?.fullName}</div>
            </div>
            <Sparkles className="h-4 w-4 opacity-70" />
          </Link>
        ) : (
          <div className="mt-4 rounded-2xl bg-secondary/60 p-3 text-xs text-muted-foreground">
            {PERIOD_LABELS[currentPeriod.period]} · Free period
          </div>
        )
      ) : null}
    </div>
  );
}

// -------- Timetable --------
function TimetableTab({ cls }: { cls: ClassId }) {
  const sched = getClassSchedule(cls);
  const now = useNow(30_000);
  const day = jsDayToCode(now.getDay());
  const mins = now.getHours() * 60 + now.getMinutes();
  const currentP = PERIOD_TIMES.find((p) => mins >= p.startMin && mins < p.endMin)?.period ?? -1;

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
                  const cell = getClassCell(d, cls, p);
                  const isNow = day === d && p === currentP;
                  if (cell.kind !== "slot") return (
                    <td key={`c-p-${d}-${i}`}>
                      <div className={`min-w-[92px] rounded-lg px-2 py-2 text-center text-[10px] font-medium ${isNow ? "ring-2 ring-primary" : ""} ${cell.kind === "break" ? "bg-primary/10 text-primary/80" : cell.kind === "activity" ? "bg-secondary text-secondary-foreground" : "bg-secondary/40 text-muted-foreground"}`}>
                        {cell.kind === "break" ? "Break" : cell.kind === "activity" ? cell.label : "FREE"}
                      </div>
                    </td>
                  );
                  const slot = cell.slot;
                  const teacher = TEACHER_BY_CODE[slot.teacher];
                  return (
                    <td key={`c-p-${d}-${i}`}>
                      <Link to="/teachers/$code" params={{ code: slot.teacher }}
                        className={`block min-w-[92px] rounded-lg px-2 py-1.5 text-[11px] font-semibold shadow-sm ${isNow ? "ring-2 ring-primary" : ""}`}
                        style={{ backgroundColor: teacher?.color, color: teacher ? textOn(teacher.color) : "#fff" }}>
                        <div className={slot.subjectSpecified ? "truncate font-bold" : "font-bold italic opacity-80"}>{slot.subjectSpecified ? slot.subject : "Sub N/S"}</div>
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
  );
}

// -------- Overview --------
function useClassTotals(cls: ClassId) {
  return useMemo(() => getClassTotals(cls), [cls]);
}

function OverviewTab({ cls }: { cls: ClassId }) {
  const { weekly, subjects } = useClassTotals(cls);
  const studentsQ = useQuery({ queryKey: ["students", cls], queryFn: () => fetchStudents(cls) });
  const evalsQ = useQuery({ queryKey: ["evaluations", "class", cls], queryFn: () => fetchEvaluations({ classId: cls }) });
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const statusQ = useQuery({
    queryKey: ["syllabus_status", "class", cls, settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () => fetchSyllabusStatus({ classId: cls, academicYear: settingsQ.data!.academic_year_name }),
  });

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
  const avg = withData.length ? withData.reduce((a, r) => a + r.st.totalPoints, 0) / withData.length : 0;
  const top = [...withData].sort((a, b) => b.st.totalPoints - a.st.totalPoints)[0];

  const pairs = Array.from(subjects).map((subject) => ({ className: cls, subject }));
  const syl = summarize(statusQ.data ?? [], pairs);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Students" value={students.length} />
        <Kpi label="Subjects" value={subjects.size} />
        <Kpi label="Periods/wk" value={weekly} />
        <Kpi label="Avg points" value={avg.toFixed(1)} />
      </div>

      <div className="card-soft p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Syllabus completion</span>
          <span className="text-muted-foreground">{syl.completed}/{syl.total} ({syllabusLabel(syl.total, syl.completed)})</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${syl.percent}%` }} />
        </div>
      </div>

      <div className="card-soft p-4">
        <div className="text-xs font-semibold text-foreground">Top student</div>
        {top ? (
          <Link to="/students/$id" params={{ id: top.s.id }} className="mt-2 flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">#{top.s.admission_no}</div>
            <div className="min-w-0 flex-1 text-sm font-semibold text-foreground">{top.s.name}</div>
            <span className="shrink-0 text-sm font-bold text-primary">{top.st.totalPoints.toFixed(0)} pts</span>
          </Link>
        ) : (
          <div className="mt-2 text-xs text-muted-foreground">No evaluations yet.</div>
        )}
      </div>
    </div>
  );
}

// -------- Performance (essentials by default, rounds hidden behind expander) --------
function PerformanceTab({ cls }: { cls: ClassId }) {
  const studentsQ = useQuery({ queryKey: ["students", cls], queryFn: () => fetchStudents(cls) });
  const evalsQ = useQuery({ queryKey: ["evaluations", "class", cls], queryFn: () => fetchEvaluations({ classId: cls }) });
  const students = studentsQ.data ?? [];
  const evals = evalsQ.data ?? [];
  const { subjectPeriods } = useClassTotals(cls);

  const rows = useMemo(() => {
    const by = new Map<string, Evaluation[]>();
    for (const e of evals) {
      const arr = by.get(e.student_id) ?? [];
      arr.push(e); by.set(e.student_id, arr);
    }
    return students.map((s) => ({ s, st: computeStudentStats(by.get(s.id) ?? []) }));
  }, [students, evals]);

  const withData = rows.filter((r) => r.st.totalAsked > 0);
  const avg = withData.length ? withData.reduce((a, r) => a + r.st.totalPoints, 0) / withData.length : 0;
  const needsAttention = withData.filter((r) => r.st.totalPoints < 0 || r.st.notAnswered >= 3).sort((a, b) => a.st.totalPoints - b.st.totalPoints);

  const subjectRows = useMemo(() => {
    return Array.from(subjectPeriods.entries())
      .map(([subject, info]) => {
        const marks = evals
          .filter((e) => e.subject === subject && e.status === "answered" && typeof e.mark === "number")
          .map((e) => e.mark!);
        return {
          subject,
          teacher: info.teacher,
          periods: info.periods,
          avg: marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : null,
        };
      })
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [subjectPeriods, evals]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Class average" value={avg.toFixed(1)} sub="points" />
        <Kpi label="Evaluated" value={`${withData.length}/${students.length}`} />
      </div>

      <PerformanceList
        title="Top 3 Students"
        rows={[...withData].sort((a, b) => b.st.totalPoints - a.st.totalPoints).slice(0, 3)}
        tone="good"
      />
      <PerformanceList
        title="Students Needing Attention"
        rows={needsAttention.slice(0, 5)}
        tone="warn"
      />

      <div className="card-soft p-4">
        <h3 className="text-sm font-semibold text-foreground">Subject Performance</h3>
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Subject</th>
                <th className="w-20 px-3 py-2 text-right font-semibold">Periods</th>
                <th className="w-20 px-3 py-2 text-right font-semibold">Avg</th>
              </tr>
            </thead>
            <tbody>
              {subjectRows.map((r) => (
                <tr key={r.subject} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">
                    {r.subject}
                    <span className="ml-1 text-[10px] text-muted-foreground">{r.teacher}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">{r.periods}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{r.avg !== null ? r.avg.toFixed(1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
                <div className="break-words text-sm font-semibold text-foreground">{r.s.name}</div>
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

// -------- Rounds (inside Performance disclosure) --------
function RoundsList({ cls, evals, totalStudents }: { cls: ClassId; evals: Evaluation[]; totalStudents: number }) {
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
    return <div className="card-soft p-4 text-center text-xs text-muted-foreground">No question rounds yet.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {rounds.map((r) => {
        const teacher = TEACHER_BY_CODE[r.teacher];
        return (
          <Link key={r.key} to="/session/$class/$subject" params={{ class: cls, subject: r.subject }} search={{ teacher: r.teacher }} className="card-soft block p-3 transition hover:shadow-[var(--shadow-lift)]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{r.subject}</div>
                <div className="text-[10px] text-muted-foreground">{teacher?.shortName ?? r.teacher} · Round #{r.roundNo}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.complete ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                {r.complete ? "Done" : "Active"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>Asked {r.asked}{totalStudents ? `/${totalStudents}` : ""}</span>
              <span>Avg {r.avg ? r.avg.toFixed(1) : "—"}</span>
              <span>{r.minus}✗</span>
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

function Disclosure({ open, onToggle, label, children }: { open: boolean; onToggle: () => void; label: string; children: React.ReactNode }) {
  return (
    <div className="card-soft overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-secondary/40"
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}
