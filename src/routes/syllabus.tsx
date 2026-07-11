import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Users,
  GraduationCap,
  LineChart,
  History as HistoryIcon,
  Settings as SettingsIcon,
  AlertTriangle,
  Check,
  CircleDot,
  Circle,
  X,
  ChevronDown,
} from "lucide-react";
import { TEACHERS, TEACHER_BY_CODE, CLASSES, textOn, type ClassId } from "@/data/timetable";
import {
  fetchSettings,
  fetchStatuses,
  fetchHistory,
  updateSettings,
  upsertStatus,
  getSyllabusTriples,
  getTripleWeeklyPeriods,
  monthsInAcademicYear,
  currentAcademicMonth,
  makeStatusIndex,
  monthName,
  MONTH_SHORT,
  type SyllabusStatusValue,
  type SyllabusTriple,
} from "@/lib/syllabus-api";

export const Route = createFileRoute("/syllabus")({
  head: () => ({ meta: [{ title: "Syllabus · Malja'a Timetable" }] }),
  component: SyllabusPage,
});

type TabKey = "home" | "teachers" | "classes" | "subjects" | "reports" | "history" | "settings";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "home", label: "Home", icon: BookOpen },
  { key: "teachers", label: "Teachers", icon: Users },
  { key: "classes", label: "Classes", icon: GraduationCap },
  { key: "subjects", label: "Subjects", icon: LineChart },
  { key: "reports", label: "Reports", icon: LineChart },
  { key: "history", label: "History", icon: HistoryIcon },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function SyllabusPage() {
  const [tab, setTab] = useState<TabKey>("home");
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSettings });

  if (settingsQ.isLoading || !settingsQ.data) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Loading syllabus…</div>;
  }
  const settings = settingsQ.data;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">📚 Syllabus</h1>
        <p className="text-sm text-muted-foreground">
          Academic Year <span className="font-medium text-foreground">{settings.academic_year_name}</span> ·{" "}
          {monthName(settings.start_month)} → {monthName(settings.end_month)}
        </p>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "home" && <HomeTab settings={settings} />}
      {tab === "teachers" && <TeachersTab settings={settings} />}
      {tab === "classes" && <ClassesTab settings={settings} />}
      {tab === "subjects" && <SubjectsTab settings={settings} />}
      {tab === "reports" && <ReportsTab settings={settings} />}
      {tab === "history" && <HistoryTab settings={settings} />}
      {tab === "settings" && <SettingsTab settings={settings} />}
    </div>
  );
}

// ---------- shared data hooks ----------

function useSyllabusData(academicYear: string) {
  const statusesQ = useQuery({
    queryKey: ["syllabus_status", academicYear],
    queryFn: () => fetchStatuses(academicYear),
  });
  const triples = useMemo(() => getSyllabusTriples(), []);
  const index = useMemo(() => makeStatusIndex(statusesQ.data ?? []), [statusesQ.data]);
  return { triples, index, isLoading: statusesQ.isLoading };
}

function statusOf(index: ReturnType<typeof makeStatusIndex>, t: SyllabusTriple, month: number): SyllabusStatusValue {
  return index.get(t, month)?.status ?? "not_started";
}

// ---------- Home / Dashboard + subject cards ----------

function HomeTab({ settings }: { settings: import("@/lib/syllabus-api").SyllabusSettings }) {
  const { triples, index, isLoading } = useSyllabusData(settings.academic_year_name);
  const currentMonth = currentAcademicMonth(settings);
  const months = monthsInAcademicYear(settings.start_month, settings.end_month);

  const dashboard = useMemo(() => {
    const totalSubjects = triples.length;
    let completedThisMonth = 0;
    let inProgressThisMonth = 0;
    for (const t of triples) {
      const s = statusOf(index, t, currentMonth);
      if (s === "completed") completedThisMonth++;
      else if (s === "in_progress") inProgressThisMonth++;
    }
    const pendingThisMonth = totalSubjects - completedThisMonth;
    const pctThisMonth = totalSubjects ? Math.round((completedThisMonth / totalSubjects) * 100) : 0;

    // teachers with 100% completion this month
    const perTeacher = new Map<string, { total: number; done: number }>();
    for (const t of triples) {
      const rec = perTeacher.get(t.teacher_code) ?? { total: 0, done: 0 };
      rec.total++;
      if (statusOf(index, t, currentMonth) === "completed") rec.done++;
      perTeacher.set(t.teacher_code, rec);
    }
    let teachers100 = 0;
    let teachersPending = 0;
    for (const rec of perTeacher.values()) {
      if (rec.total > 0 && rec.done === rec.total) teachers100++;
      else teachersPending++;
    }

    // classes fully completed this month
    const perClass = new Map<string, { total: number; done: number }>();
    for (const t of triples) {
      const rec = perClass.get(t.class_id) ?? { total: 0, done: 0 };
      rec.total++;
      if (statusOf(index, t, currentMonth) === "completed") rec.done++;
      perClass.set(t.class_id, rec);
    }
    let classesFull = 0;
    let classesPending = 0;
    for (const rec of perClass.values()) {
      if (rec.total > 0 && rec.done === rec.total) classesFull++;
      else classesPending++;
    }

    return {
      totalSubjects,
      completedThisMonth,
      inProgressThisMonth,
      pendingThisMonth,
      pctThisMonth,
      totalTeachers: perTeacher.size,
      teachers100,
      teachersPending,
      classesFull,
      classesPending,
    };
  }, [triples, index, currentMonth]);

  // notifications: overdue previous months
  const overdue = useMemo(() => {
    const list: string[] = [];
    const idx = months.indexOf(currentMonth);
    if (idx <= 0) return list;
    const priorMonths = months.slice(0, idx);
    // aggregate pending counts per prior month
    for (const m of priorMonths) {
      let pending = 0;
      for (const t of triples) if (statusOf(index, t, m) !== "completed") pending++;
      if (pending > 0) list.push(`${monthName(m)} syllabus incomplete — ${pending} pending`);
    }
    // per-teacher pending across the year
    const teacherPending = new Map<string, number>();
    for (const t of triples) {
      for (const m of months.slice(0, idx)) {
        if (statusOf(index, t, m) !== "completed") {
          teacherPending.set(t.teacher_code, (teacherPending.get(t.teacher_code) ?? 0) + 1);
        }
      }
    }
    const top = Array.from(teacherPending.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [code, n] of top) {
      const name = TEACHER_BY_CODE[code]?.fullName ?? code;
      list.push(`${name} has ${n} pending syllabus update${n === 1 ? "" : "s"}`);
    }
    return list;
  }, [triples, index, months, currentMonth]);

  return (
    <div className="space-y-5">
      {/* Dashboard cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Subjects" value={dashboard.totalSubjects} />
        <StatCard label={`Completed (${monthName(currentMonth)})`} value={dashboard.completedThisMonth} accent="ok" />
        <StatCard label={`Pending (${monthName(currentMonth)})`} value={dashboard.pendingThisMonth} accent="warn" />
        <StatCard label="Completion %" value={`${dashboard.pctThisMonth}%`} accent="primary" />
        <StatCard label="Total Teachers" value={dashboard.totalTeachers} />
        <StatCard label="Teachers 100%" value={dashboard.teachers100} accent="ok" />
        <StatCard label="Teachers Pending" value={dashboard.teachersPending} accent="warn" />
        <StatCard label="Classes Fully Done" value={dashboard.classesFull} accent="ok" />
      </section>

      {overdue.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" /> Notifications
          </div>
          <ul className="space-y-1 text-sm text-amber-900">
            {overdue.map((n, i) => <li key={i}>• {n}</li>)}
          </ul>
        </section>
      )}

      {/* Subject cards */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">All Subjects · {monthName(currentMonth)}</h2>
        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {triples.map((t) => (
              <SubjectCard key={t.key} triple={t} settings={settings} index={index} months={months} currentMonth={currentMonth} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: "ok" | "warn" | "primary" }) {
  const tone =
    accent === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-900"
    : accent === "warn" ? "bg-amber-50 border-amber-200 text-amber-900"
    : accent === "primary" ? "bg-primary/10 border-primary/30 text-primary"
    : "bg-card border-border text-foreground";
  return (
    <div className={`rounded-2xl border p-3 shadow-sm ${tone}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-0.5 text-2xl font-bold leading-tight">{value}</div>
    </div>
  );
}

function SubjectCard({
  triple,
  settings,
  index,
  months,
  currentMonth,
}: {
  triple: SyllabusTriple;
  settings: import("@/lib/syllabus-api").SyllabusSettings;
  index: ReturnType<typeof makeStatusIndex>;
  months: number[];
  currentMonth: number;
}) {
  const teacher = TEACHER_BY_CODE[triple.teacher_code];
  const bg = teacher?.color ?? "#6B7280";
  const fg = textOn(bg);
  const currentRow = index.get(triple, currentMonth);
  const status = currentRow?.status ?? "not_started";
  const completedCount = months.filter((m) => statusOf(index, triple, m) === "completed").length;
  const pct = months.length ? Math.round((completedCount / months.length) * 100) : 0;

  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4" style={{ background: bg, color: fg }}>
        <div className="min-w-0">
          <div className="text-xs font-semibold opacity-90">{triple.class_id}</div>
          <div className="mt-0.5 truncate text-base font-bold">{triple.subject}</div>
          <div className="mt-1 truncate text-xs opacity-90">{teacher?.fullName ?? triple.teacher_code}</div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{settings.academic_year_name}</span>
          <span>{pct}% overall</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {months.map((m) => {
            const s = statusOf(index, triple, m);
            return <MonthChip key={m} month={m} status={s} isCurrent={m === currentMonth} />;
          })}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {currentRow?.updated_at ? (
              <>Last updated {new Date(currentRow.updated_at).toLocaleDateString()} · {currentRow.updated_by ?? "—"}</>
            ) : (
              <>Not updated yet</>
            )}
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
          >
            {open ? "Close" : "Update"} <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {open && <MonthUpdateGrid triple={triple} settings={settings} index={index} months={months} />}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SyllabusStatusValue }) {
  const cfg =
    status === "completed" ? { label: "Completed", cls: "bg-white/25 text-white", icon: <Check className="h-3 w-3" /> }
    : status === "in_progress" ? { label: "In Progress", cls: "bg-white/25 text-white", icon: <CircleDot className="h-3 w-3" /> }
    : { label: "Not Started", cls: "bg-white/25 text-white", icon: <Circle className="h-3 w-3" /> };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function MonthChip({ month, status, isCurrent }: { month: number; status: SyllabusStatusValue; isCurrent?: boolean }) {
  const tone =
    status === "completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : status === "in_progress" ? "bg-amber-100 text-amber-800 border-amber-200"
    : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone} ${
        isCurrent ? "ring-2 ring-primary/40" : ""
      }`}
    >
      {status === "completed" ? "✅" : status === "in_progress" ? "🟡" : "⬜"} {MONTH_SHORT[month - 1]}
    </span>
  );
}

function MonthUpdateGrid({
  triple,
  settings,
  index,
  months,
}: {
  triple: SyllabusTriple;
  settings: import("@/lib/syllabus-api").SyllabusSettings;
  index: ReturnType<typeof makeStatusIndex>;
  months: number[];
}) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (v: { month: number; status: SyllabusStatusValue }) =>
      upsertStatus({
        class_id: triple.class_id,
        subject: triple.subject,
        teacher_code: triple.teacher_code,
        academic_year: settings.academic_year_name,
        month: v.month,
        status: v.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["syllabus_status", settings.academic_year_name] });
      qc.invalidateQueries({ queryKey: ["syllabus_history", settings.academic_year_name] });
    },
  });

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-dashed border-border p-3">
      <div className="text-xs font-semibold text-foreground">Update by month</div>
      <div className="grid grid-cols-1 gap-2">
        {months.map((m) => {
          const status = statusOf(index, triple, m);
          return (
            <div key={m} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2 py-1.5">
              <span className="w-14 text-xs font-medium text-foreground">{MONTH_SHORT[m - 1]}</span>
              <div className="flex gap-1">
                {(["not_started", "in_progress", "completed"] as SyllabusStatusValue[]).map((s) => (
                  <button
                    key={s}
                    disabled={mut.isPending}
                    onClick={() => mut.mutate({ month: m, status: s })}
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold transition ${
                      status === s
                        ? s === "completed"
                          ? "bg-emerald-600 text-white"
                          : s === "in_progress"
                          ? "bg-amber-500 text-white"
                          : "bg-muted-foreground text-white"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "completed" ? "✅ Done" : s === "in_progress" ? "🟡 In Progress" : "⬜ Not Started"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Teachers tab ----------

function TeachersTab({ settings }: { settings: import("@/lib/syllabus-api").SyllabusSettings }) {
  const { triples, index } = useSyllabusData(settings.academic_year_name);
  const months = monthsInAcademicYear(settings.start_month, settings.end_month);

  const rows = useMemo(() => {
    const per = new Map<string, { total: number; done: number; classes: Set<string>; subjects: Set<string> }>();
    for (const t of triples) {
      const rec = per.get(t.teacher_code) ?? { total: 0, done: 0, classes: new Set(), subjects: new Set() };
      rec.classes.add(t.class_id);
      rec.subjects.add(t.subject);
      for (const m of months) {
        rec.total++;
        if (statusOf(index, t, m) === "completed") rec.done++;
      }
      per.set(t.teacher_code, rec);
    }
    return TEACHERS.map((tc) => {
      const rec = per.get(tc.code) ?? { total: 0, done: 0, classes: new Set(), subjects: new Set() };
      const pct = rec.total ? Math.round((rec.done / rec.total) * 100) : 0;
      return { teacher: tc, ...rec, pct };
    })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [triples, index, months]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(({ teacher, subjects, classes, done, total, pct }) => (
        <div key={teacher.code} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="p-4" style={{ background: teacher.color, color: textOn(teacher.color) }}>
            <div className="text-xs opacity-90">{teacher.code}</div>
            <div className="text-base font-bold">{teacher.fullName}</div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Subjects</span><div className="font-semibold text-foreground">{subjects.size}</div></div>
              <div><span className="text-muted-foreground">Classes</span><div className="font-semibold text-foreground">{classes.size}</div></div>
              <div><span className="text-muted-foreground">Targets</span><div className="font-semibold text-foreground">{total}</div></div>
              <div><span className="text-muted-foreground">Completed</span><div className="font-semibold text-emerald-700">{done}</div></div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: teacher.color }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Classes tab ----------

function ClassesTab({ settings }: { settings: import("@/lib/syllabus-api").SyllabusSettings }) {
  const { triples, index } = useSyllabusData(settings.academic_year_name);
  const months = monthsInAcademicYear(settings.start_month, settings.end_month);
  const currentMonth = currentAcademicMonth(settings);
  const [openClass, setOpenClass] = useState<string | null>(null);

  const rows = useMemo(() => {
    return CLASSES.map((cls) => {
      const subs = triples.filter((t) => t.class_id === cls);
      const total = subs.length;
      const done = subs.filter((t) => statusOf(index, t, currentMonth) === "completed").length;
      return { cls, subs, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
    }).filter((r) => r.total > 0);
  }, [triples, index, currentMonth]);

  return (
    <div className="space-y-3">
      {rows.map(({ cls, subs, total, done, pct }) => {
        const open = openClass === cls;
        return (
          <div key={cls} className="rounded-2xl border border-border bg-card shadow-sm">
            <button onClick={() => setOpenClass(open ? null : cls)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <div>
                <div className="text-lg font-bold text-foreground">{cls}</div>
                <div className="text-xs text-muted-foreground">{done}/{total} subjects done in {monthName(currentMonth)}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{pct}%</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </button>
            {open && (
              <div className="border-t border-border p-3">
                <div className="grid gap-2">
                  {subs.map((t) => {
                    const teacher = TEACHER_BY_CODE[t.teacher_code];
                    return (
                      <div key={t.key} className="rounded-xl border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold" style={{ color: teacher?.color }}>{t.subject}</div>
                            <div className="truncate text-xs text-muted-foreground">{teacher?.fullName ?? t.teacher_code}</div>
                          </div>
                          <StatusPill status={statusOf(index, t, currentMonth)} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {months.map((m) => (
                            <MonthChip key={m} month={m} status={statusOf(index, t, m)} isCurrent={m === currentMonth} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: SyllabusStatusValue }) {
  const tone =
    status === "completed" ? "bg-emerald-100 text-emerald-800"
    : status === "in_progress" ? "bg-amber-100 text-amber-800"
    : "bg-muted text-muted-foreground";
  const label = status === "completed" ? "Completed" : status === "in_progress" ? "In Progress" : "Not Started";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{label}</span>;
}

// ---------- Subjects tab ----------

function SubjectsTab({ settings }: { settings: import("@/lib/syllabus-api").SyllabusSettings }) {
  const { triples, index } = useSyllabusData(settings.academic_year_name);
  const months = monthsInAcademicYear(settings.start_month, settings.end_month);

  const rows = useMemo(() => {
    const per = new Map<string, { subject: string; entries: SyllabusTriple[]; total: number; done: number }>();
    for (const t of triples) {
      const rec = per.get(t.subject) ?? { subject: t.subject, entries: [], total: 0, done: 0 };
      rec.entries.push(t);
      for (const m of months) {
        rec.total++;
        if (statusOf(index, t, m) === "completed") rec.done++;
      }
      per.set(t.subject, rec);
    }
    return Array.from(per.values())
      .map((r) => ({ ...r, pct: r.total ? Math.round((r.done / r.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);
  }, [triples, index, months]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.subject} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-sm font-bold text-foreground">{r.subject}</div>
          <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
            {r.entries.map((t) => {
              const teacher = TEACHER_BY_CODE[t.teacher_code];
              return (
                <span key={t.key} className="rounded-full px-2 py-0.5 font-semibold" style={{ background: teacher?.color, color: textOn(teacher?.color ?? "#666") }}>
                  {t.class_id} · {teacher?.shortName ?? t.teacher_code}
                </span>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{r.done}/{r.total} targets</span>
            <span className="font-semibold text-foreground">{r.pct}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Reports tab ----------

function ReportsTab({ settings }: { settings: import("@/lib/syllabus-api").SyllabusSettings }) {
  const { triples, index } = useSyllabusData(settings.academic_year_name);
  const months = monthsInAcademicYear(settings.start_month, settings.end_month);
  const [month, setMonth] = useState(currentAcademicMonth(settings));
  const [teacherF, setTeacherF] = useState<string>("");
  const [classF, setClassF] = useState<string>("");
  const [subjectF, setSubjectF] = useState<string>("");

  const filtered = useMemo(() => {
    return triples.filter((t) =>
      (!teacherF || t.teacher_code === teacherF) &&
      (!classF || t.class_id === classF) &&
      (!subjectF || t.subject === subjectF));
  }, [triples, teacherF, classF, subjectF]);

  const summary = useMemo(() => {
    let completed = 0, pending = 0, inProgress = 0;
    const pendTeachers = new Set<string>();
    const pendClasses = new Set<string>();
    for (const t of filtered) {
      const s = statusOf(index, t, month);
      if (s === "completed") completed++;
      else {
        pending++;
        pendTeachers.add(t.teacher_code);
        pendClasses.add(t.class_id);
        if (s === "in_progress") inProgress++;
      }
    }
    return {
      completed, pending, inProgress,
      pendTeachers: pendTeachers.size,
      pendClasses: pendClasses.size,
      pct: filtered.length ? Math.round((completed / filtered.length) * 100) : 0,
    };
  }, [filtered, index, month]);

  const uniqueSubjects = useMemo(() => Array.from(new Set(triples.map((t) => t.subject))).sort(), [triples]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select label="Month" value={String(month)} onChange={(v) => setMonth(Number(v))} options={months.map((m) => ({ value: String(m), label: monthName(m) }))} />
        <Select label="Teacher" value={teacherF} onChange={setTeacherF} options={[{ value: "", label: "All" }, ...TEACHERS.map((t) => ({ value: t.code, label: t.fullName }))]} />
        <Select label="Class" value={classF} onChange={setClassF} options={[{ value: "", label: "All" }, ...CLASSES.map((c) => ({ value: c, label: c }))]} />
        <Select label="Subject" value={subjectF} onChange={setSubjectF} options={[{ value: "", label: "All" }, ...uniqueSubjects.map((s) => ({ value: s, label: s }))]} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Completed" value={summary.completed} accent="ok" />
        <StatCard label="In Progress" value={summary.inProgress} accent="warn" />
        <StatCard label="Pending" value={summary.pending} accent="warn" />
        <StatCard label="Teachers Pending" value={summary.pendTeachers} />
        <StatCard label="Classes Pending" value={summary.pendClasses} />
        <StatCard label="Overall %" value={`${summary.pct}%`} accent="primary" />
      </section>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-3 text-sm font-semibold text-foreground">{monthName(month)} Report — {filtered.length} entries</div>
        <div className="divide-y divide-border">
          {filtered.map((t) => {
            const status = statusOf(index, t, month);
            const teacher = TEACHER_BY_CODE[t.teacher_code];
            return (
              <div key={t.key} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">{t.class_id} · {t.subject}</div>
                  <div className="truncate text-xs text-muted-foreground">{teacher?.fullName ?? t.teacher_code}</div>
                </div>
                <StatusPill status={status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-xs">
      <div className="mb-1 font-medium text-muted-foreground">{label}</div>
      <select
        className="w-full rounded-xl border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ---------- History tab ----------

function HistoryTab({ settings }: { settings: import("@/lib/syllabus-api").SyllabusSettings }) {
  const q = useQuery({
    queryKey: ["syllabus_history", settings.academic_year_name],
    queryFn: () => fetchHistory(settings.academic_year_name),
  });
  if (q.isLoading) return <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>;
  const rows = q.data ?? [];
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No history yet.</div>;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="divide-y divide-border">
        {rows.map((h) => {
          const teacher = TEACHER_BY_CODE[h.teacher_code];
          return (
            <div key={h.id} className="p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">
                    {h.class_id} · {h.subject} · {monthName(h.month)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{teacher?.fullName ?? h.teacher_code} · {h.updated_by ?? "—"}</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {new Date(h.changed_at).toLocaleString()}
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <StatusPill status={(h.previous_status ?? "not_started") as SyllabusStatusValue} />
                <span className="text-muted-foreground">→</span>
                <StatusPill status={h.new_status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Settings tab ----------

function SettingsTab({ settings }: { settings: import("@/lib/syllabus-api").SyllabusSettings }) {
  const qc = useQueryClient();
  const [name, setName] = useState(settings.academic_year_name);
  const [start, setStart] = useState(settings.start_month);
  const [end, setEnd] = useState(settings.end_month);
  const [saved, setSaved] = useState(false);

  const mut = useMutation({
    mutationFn: () => updateSettings({ academic_year_name: name, start_month: start, end_month: end }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["syllabus_settings"] });
      qc.invalidateQueries({ queryKey: ["syllabus_status"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  const preview = monthsInAcademicYear(start, end);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Academic Year</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs">
            <div className="mb-1 font-medium text-muted-foreground">Year Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="2026-2027"
            />
          </label>
          <Select label="Start Month" value={String(start)} onChange={(v) => setStart(Number(v))} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(i + 1) }))} />
          <Select label="End Month" value={String(end)} onChange={(v) => setEnd(Number(v))} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(i + 1) }))} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {preview.map((m) => (
            <span key={m} className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
              {MONTH_SHORT[m - 1]}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {mut.isPending ? "Saving…" : "Save Settings"}
          </button>
          {saved && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="h-3 w-3" /> Saved</span>}
          {mut.isError && <span className="inline-flex items-center gap-1 text-xs text-destructive"><X className="h-3 w-3" /> Failed</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
        Changing the academic year only affects which months are tracked. Existing status records remain in the cloud tied to their own academic year label.
      </div>
    </div>
  );
}
