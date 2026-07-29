import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings2, X, Printer, Users, GraduationCap, BookOpen, Clock, Activity,
  TrendingUp, Trophy, HelpCircle, ChevronDown,
} from "lucide-react";
import {
  TEACHERS,
  getTeacherStats,
  CLASSES,
  SCHEDULE,
  DAYS,
  PERIODS,
  TEACHER_LOADS,
  TEACHER_BY_CODE,
  textOn,
  type ClassId,
} from "@/data/timetable";
import {
  buildAcademicMonths,
  fetchSyllabusSettings,
  fetchSyllabusStatus,
  getTeacherClassSubjects,
  MONTH_LONG,
  MONTH_NAMES,
  summarize,
  updateSyllabusSettings,
} from "@/lib/syllabus-api";
import {
  fetchEvaluations,
  fetchStudents,
  computeStudentStats,
  type Evaluation,
  type Student,
  type StudentStats,
} from "@/lib/students-api";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Statistics · Malja'a" }] }),
  component: Stats,
});

type Section = "overview" | "teachers" | "classes" | "subjects" | "students" | "syllabus" | "questions" | "reports";
const SECTIONS: { key: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "teachers", label: "Teachers", icon: Users },
  { key: "classes", label: "Classes", icon: GraduationCap },
  { key: "subjects", label: "Subjects", icon: BookOpen },
  { key: "students", label: "Students", icon: TrendingUp },
  { key: "syllabus", label: "Syllabus", icon: Clock },
  { key: "questions", label: "Questions", icon: HelpCircle },
  { key: "reports", label: "Reports", icon: Printer },
];

interface Filters {
  classId: "ALL" | ClassId;
  teacher: "ALL" | string;
  subject: "ALL" | string;
}

function Stats() {
  const [section, setSection] = useState<Section>("overview");
  const [filters, setFilters] = useState<Filters>({ classId: "ALL", teacher: "ALL", subject: "ALL" });

  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const statusQ = useQuery({
    queryKey: ["syllabus_status", "all", settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () => fetchSyllabusStatus({ academicYear: settingsQ.data!.academic_year_name }),
  });
  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });
  const evalsQ = useQuery({ queryKey: ["evaluations", "all"], queryFn: () => fetchEvaluations() });

  const allEvals = evalsQ.data ?? [];
  const filteredEvals = useMemo(() => {
    return allEvals.filter((e) =>
      (filters.classId === "ALL" || e.class_id === filters.classId) &&
      (filters.teacher === "ALL" || e.teacher_code === filters.teacher) &&
      (filters.subject === "ALL" || e.subject === filters.subject),
    );
  }, [allEvals, filters]);

  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const d of DAYS) for (const p of PERIODS) for (const s of SCHEDULE[d][p]) set.add(s.subject);
    return Array.from(set).sort();
  }, []);

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="space-y-4">
      <div className="card-lift p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Executive Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                {settingsQ.data ? `AY ${settingsQ.data.academic_year_name}` : "…"}
                {settingsQ.data ? ` · ${MONTH_LONG[settingsQ.data.start_month - 1]} → ${MONTH_LONG[settingsQ.data.end_month - 1]}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/80">
              <Settings2 className="h-3.5 w-3.5" /> AY
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/80">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <FilterSelect label="Class" value={filters.classId} onChange={(v) => setFilters({ ...filters, classId: v as Filters["classId"] })}
            options={[{ v: "ALL", l: "All classes" }, ...CLASSES.map((c) => ({ v: c, l: c }))]} />
          <FilterSelect label="Teacher" value={filters.teacher} onChange={(v) => setFilters({ ...filters, teacher: v })}
            options={[{ v: "ALL", l: "All teachers" }, ...TEACHERS.map((t) => ({ v: t.code, l: `${t.code} · ${t.fullName}` }))]} />
          <FilterSelect label="Subject" value={filters.subject} onChange={(v) => setFilters({ ...filters, subject: v })}
            options={[{ v: "ALL", l: "All subjects" }, ...allSubjects.map((s) => ({ v: s, l: s }))]} />
        </div>
      </div>

      {/* Section nav */}
      <div className="card-soft flex gap-1 overflow-x-auto p-1.5">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const on = section === s.key;
          return (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                on ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {section === "overview" && (
        <OverviewSection
          evals={filteredEvals}
          allEvals={allEvals}
          students={studentsQ.data ?? []}
          syllabusStatuses={statusQ.data ?? []}
        />
      )}
      {section === "teachers" && (
        <TeachersSection evals={allEvals} students={studentsQ.data ?? []} statuses={statusQ.data ?? []} filters={filters} />
      )}
      {section === "classes" && (
        <ClassesSection evals={allEvals} students={studentsQ.data ?? []} statuses={statusQ.data ?? []} filters={filters} />
      )}
      {section === "subjects" && (
        <SubjectsSection evals={filteredEvals} students={studentsQ.data ?? []} statuses={statusQ.data ?? []} />
      )}
      {section === "students" && (
        <StudentsSection evals={filteredEvals} students={studentsQ.data ?? []} />
      )}
      {section === "syllabus" && (
        <SyllabusSection statuses={statusQ.data ?? []} />
      )}
      {section === "questions" && (
        <QuestionsSection evals={filteredEvals} allEvals={allEvals} />
      )}
      {section === "reports" && <ReportsSection />}

      {showSettings && settingsQ.data && <SettingsDialog onClose={() => setShowSettings(false)} settings={settingsQ.data} />}
    </div>
  );
}

// ============ Overview ============
function OverviewSection({
  evals, allEvals, students, syllabusStatuses,
}: { evals: Evaluation[]; allEvals: Evaluation[]; students: Student[]; syllabusStatuses: import("@/lib/syllabus-api").SyllabusStatusRow[] }) {
  let totalPeriods = 0;
  const subs = new Set<string>();
  for (const d of DAYS) for (const p of PERIODS) for (const s of SCHEDULE[d][p]) {
    totalPeriods++; subs.add(s.subject);
  }
  const attend = evals.filter((e) => e.status !== "absent").length;
  const attendPct = evals.length ? Math.round((attend / evals.length) * 100) : 0;

  // Syllabus overall
  const allPairs: { className: ClassId; subject: string }[] = [];
  const seen = new Set<string>();
  for (const t of TEACHERS) {
    for (const p of getTeacherClassSubjects(t.code)) {
      const k = `${p.className}|${p.subject}|${t.code}`;
      if (!seen.has(k)) { seen.add(k); allPairs.push({ className: p.className, subject: p.subject }); }
    }
  }
  const sylSummary = summarize(syllabusStatuses, allPairs);

  const activeRounds = new Set(allEvals.map((e) => `${e.teacher_code}|${e.class_id}|${e.subject}|${e.round_no}`)).size;

  const marks = evals.filter((e) => e.status === "answered" && typeof e.mark === "number").map((e) => e.mark!);
  const avgMark = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
  const perfScore = Math.round(((sylSummary.percent + attendPct) / 2));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Teachers" value={TEACHERS.length} tone="sky" />
      <StatCard label="Classes" value={CLASSES.length} tone="sky" />
      <StatCard label="Students" value={students.length} tone="sky" />
      <StatCard label="Subjects" value={subs.size} tone="sky" />
      <StatCard label="Weekly Periods" value={totalPeriods} tone="primary" />
      <StatCard label="Attendance" value={`${attendPct}%`} tone={attendPct >= 75 ? "good" : attendPct >= 50 ? "primary" : "warn"} />
      <StatCard label="Syllabus" value={`${sylSummary.percent}%`} tone={sylSummary.percent >= 75 ? "good" : sylSummary.percent >= 50 ? "primary" : "warn"} />
      <StatCard label="Avg Mark" value={avgMark.toFixed(1)} tone="primary" />
      <StatCard label="Active Rounds" value={activeRounds} tone="primary" />
      <StatCard label="Performance Score" value={`${perfScore}%`} tone={perfScore >= 75 ? "good" : perfScore >= 50 ? "primary" : "warn"} />
      <StatCard label="Questions Asked" value={evals.length} tone="primary" />
      <StatCard label="Minus Records" value={evals.filter((e) => e.status === "not_answered").length} tone="warn" />
    </div>
  );
}

// ============ Teachers ============
function TeachersSection({
  evals, students, statuses, filters,
}: { evals: Evaluation[]; students: Student[]; statuses: import("@/lib/syllabus-api").SyllabusStatusRow[]; filters: Filters }) {
  const teachers = filters.teacher === "ALL" ? TEACHERS : TEACHERS.filter((t) => t.code === filters.teacher);
  const rows = useMemo(() => teachers.map((t) => {
    const stats = getTeacherStats(t.code);
    const pairs = getTeacherClassSubjects(t.code);
    const syl = summarize(statuses.filter((s) => s.teacher_code === t.code), pairs);
    const teacherEvals = evals.filter((e) => e.teacher_code === t.code);
    const evaluatedIds = new Set(teacherEvals.map((e) => e.student_id));
    const marks = teacherEvals.filter((e) => e.status === "answered" && typeof e.mark === "number").map((e) => e.mark!);
    const avgMark = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
    const rating = Math.round((syl.percent + (avgMark * 20)) / 2);
    return { teacher: t, stats, syl, evaluated: evaluatedIds.size, pending: pairs.length - syl.completed, avgMark, rating };
  }).sort((a, b) => b.rating - a.rating), [teachers, statuses, evals]);
  void students;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.teacher.code} className="card-soft p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold"
              style={{ backgroundColor: r.teacher.color, color: textOn(r.teacher.color) }}>
              {r.teacher.shortName}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-foreground">{r.teacher.fullName}</div>
              <div className="text-[10px] text-muted-foreground">{r.stats.totalClasses} classes · {r.stats.subjects.length} subjects · {r.stats.totalWeeklyPeriods}p/week</div>
            </div>
            <Link to="/teachers/$code" params={{ code: r.teacher.code }} className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Details →</Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <Cell label="Workload" value={`${TEACHER_LOADS[r.teacher.code]}p`} />
            <Cell label="Syllabus" value={`${r.syl.percent}%`} />
            <Cell label="Rating" value={`${r.rating}%`} />
            <Cell label="Evaluated" value={r.evaluated} />
            <Cell label="Pending" value={r.pending} />
            <Cell label="Avg Mark" value={r.avgMark ? r.avgMark.toFixed(1) : "—"} />
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full" style={{ width: `${r.syl.percent}%`, backgroundColor: r.teacher.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Classes ============
function ClassesSection({
  evals, students, statuses, filters,
}: { evals: Evaluation[]; students: Student[]; statuses: import("@/lib/syllabus-api").SyllabusStatusRow[]; filters: Filters }) {
  const classList = filters.classId === "ALL" ? CLASSES : [filters.classId];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {classList.map((cls) => {
        const cEvals = evals.filter((e) => e.class_id === cls);
        const cStudents = students.filter((s) => s.class_id === cls);
        const byStudent = new Map<string, Evaluation[]>();
        for (const e of cEvals) {
          const arr = byStudent.get(e.student_id) ?? [];
          arr.push(e); byStudent.set(e.student_id, arr);
        }
        const rows = cStudents.map((s) => ({ s, st: computeStudentStats(byStudent.get(s.id) ?? []) }));
        const withData = rows.filter((r) => r.st.totalAsked > 0);
        const avgPts = withData.length ? withData.reduce((a, r) => a + r.st.totalPoints, 0) / withData.length : 0;
        const attendPct = cEvals.length ? Math.round((cEvals.filter((e) => e.status !== "absent").length / cEvals.length) * 100) : 0;
        const activeRound = cEvals.reduce((m, e) => Math.max(m, e.round_no), 0) || 1;
        const highest = [...withData].sort((a, b) => b.st.totalPoints - a.st.totalPoints)[0];
        const needsAttn = withData.filter((r) => r.st.totalPoints < 0 || r.st.notAnswered >= 3).length;

        const pairs: { className: ClassId; subject: string }[] = [];
        const seen = new Set<string>();
        for (const d of DAYS) for (const p of PERIODS) for (const s of SCHEDULE[d][p]) {
          if (s.className !== cls) continue;
          const k = `${s.className}|${s.subject}`;
          if (!seen.has(k)) { seen.add(k); pairs.push({ className: cls, subject: s.subject }); }
        }
        const syl = summarize(statuses.filter((x) => x.class_id === cls), pairs);

        return (
          <Link key={cls} to="/classes/$id" params={{ id: cls }} className="card-soft block p-4 transition hover:shadow-[var(--shadow-lift)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">{cls}</div>
                <div>
                  <div className="text-sm font-bold text-foreground">Class {cls}</div>
                  <div className="text-[10px] text-muted-foreground">Round #{activeRound}</div>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{cStudents.length} students</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <Cell label="Avg Pts" value={avgPts.toFixed(1)} />
              <Cell label="Attend" value={`${attendPct}%`} />
              <Cell label="Syllabus" value={`${syl.percent}%`} />
              <Cell label="Top" value={highest ? `#${highest.s.admission_no}` : "—"} />
              <Cell label="Attention" value={needsAttn} />
              <Cell label="Asked" value={cEvals.length} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ============ Subjects ============
function SubjectsSection({
  evals, students, statuses,
}: { evals: Evaluation[]; students: Student[]; statuses: import("@/lib/syllabus-api").SyllabusStatusRow[] }) {
  void students;
  const subjectMap = useMemo(() => {
    // Build {subject, teacherCode, classes[]} pairs from schedule
    const map = new Map<string, { subject: string; teacherCode: string; classes: Set<ClassId>; weekly: number }>();
    for (const d of DAYS) for (const p of PERIODS) for (const s of SCHEDULE[d][p]) {
      const key = `${s.subject}|${s.teacher}`;
      const row = map.get(key) ?? { subject: s.subject, teacherCode: s.teacher, classes: new Set<ClassId>(), weekly: 0 };
      row.classes.add(s.className);
      row.weekly++;
      map.set(key, row);
    }
    return Array.from(map.values());
  }, []);

  const rows = subjectMap.map((row) => {
    const list = evals.filter((e) => e.subject === row.subject && e.teacher_code === row.teacherCode);
    const marks = list.filter((e) => e.status === "answered" && typeof e.mark === "number").map((e) => e.mark!);
    const stud = new Set(list.map((e) => e.student_id));
    const highest = marks.length ? Math.max(...marks) : 0;
    const lowest = marks.length ? Math.min(...marks) : 0;
    const avg = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
    const minus = list.filter((e) => e.status === "not_answered").length;
    const sylList = statuses.filter((s) => s.subject === row.subject && s.teacher_code === row.teacherCode);
    const done = sylList.filter((s) => s.status === "completed").length;
    const pct = sylList.length ? Math.round((done / sylList.length) * 100) : 0;
    return { ...row, students: stud.size, avg, highest, lowest, minus, pct, pending: sylList.length - done };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((r) => {
        const teacher = TEACHER_BY_CODE[r.teacherCode];
        return (
          <div key={`${r.subject}|${r.teacherCode}`} className="card-soft p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{r.subject}</div>
                <div className="text-[10px] text-muted-foreground">{teacher?.fullName ?? r.teacherCode} · {Array.from(r.classes).sort().join(", ")}</div>
              </div>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: teacher?.color, color: teacher ? textOn(teacher.color) : "#fff" }}>{r.weekly}p/wk</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <Cell label="Students" value={r.students} />
              <Cell label="Avg" value={r.avg ? r.avg.toFixed(1) : "—"} />
              <Cell label="Highest" value={r.highest || "—"} />
              <Cell label="Lowest" value={r.lowest || "—"} />
              <Cell label="Minus" value={r.minus} />
              <Cell label="Syllabus" value={`${r.pct}%`} />
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">Pending months: {r.pending}</div>
          </div>
        );
      })}
    </div>
  );
}

// ============ Students Analytics ============
function StudentsSection({ evals, students }: { evals: Evaluation[]; students: Student[] }) {
  const rows = useMemo(() => {
    const by = new Map<string, Evaluation[]>();
    for (const e of evals) {
      const arr = by.get(e.student_id) ?? [];
      arr.push(e); by.set(e.student_id, arr);
    }
    return students.map((s) => ({ s, st: computeStudentStats(by.get(s.id) ?? []) }));
  }, [evals, students]);
  const withData = rows.filter((r) => r.st.totalAsked > 0);

  const top10 = [...withData].sort((a, b) => b.st.totalPoints - a.st.totalPoints).slice(0, 10);
  const bottom10 = [...withData].sort((a, b) => a.st.totalPoints - b.st.totalPoints).slice(0, 10);
  const highMinus = [...withData].filter((r) => r.st.notAnswered > 0).sort((a, b) => b.st.notAnswered - a.st.notAnswered).slice(0, 10);
  const perfect = withData.filter((r) => r.st.answered > 0 && r.st.averageMark >= 5).slice(0, 10);
  const frequentAbsent = [...withData].filter((r) => r.st.absent > 0).sort((a, b) => b.st.absent - a.st.absent).slice(0, 10);

  return (
    <div className="space-y-4">
      <StudentList title="Top 10 Students" rows={top10} tone="good" />
      <StudentList title="Bottom 10 Students" rows={bottom10} tone="warn" />
      <StudentList title="Highest Minus Count" rows={highMinus} tone="warn" metric={(st) => `${st.notAnswered}✗`} />
      <StudentList title="Perfect Scores" rows={perfect} tone="good" metric={(st) => `avg ${st.averageMark.toFixed(1)}`} />
      <StudentList title="Frequently Absent" rows={frequentAbsent} tone="warn" metric={(st) => `${st.absent} abs`} />
    </div>
  );
}

function StudentList({
  title, rows, tone, metric,
}: { title: string; rows: { s: Student; st: StudentStats }[]; tone: "good" | "warn"; metric?: (st: StudentStats) => string }) {
  const chip = tone === "good" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return (
    <div className="card-soft p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-muted-foreground">No data.</div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {rows.map((r, i) => (
            <Link key={r.s.id} to="/students/$id" params={{ id: r.s.id }} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">#{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{r.s.name}</div>
                <div className="text-[10px] text-muted-foreground">{r.s.class_id} · #{r.s.admission_no} · Asked {r.st.totalAsked}</div>
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

// ============ Syllabus ============
function SyllabusSection({ statuses }: { statuses: import("@/lib/syllabus-api").SyllabusStatusRow[] }) {
  const teacherRows = TEACHERS.map((t) => {
    const pairs = getTeacherClassSubjects(t.code);
    const sum = summarize(statuses.filter((s) => s.teacher_code === t.code), pairs);
    return { teacher: t, ...sum };
  }).sort((a, b) => b.percent - a.percent);

  const classRows = CLASSES.map((cls) => {
    const pairs: { className: ClassId; subject: string }[] = [];
    const seen = new Set<string>();
    for (const d of DAYS) for (const p of PERIODS) for (const s of SCHEDULE[d][p]) {
      if (s.className !== cls) continue;
      const k = `${s.className}|${s.subject}`;
      if (!seen.has(k)) { seen.add(k); pairs.push({ className: cls, subject: s.subject }); }
    }
    const sum = summarize(statuses.filter((x) => x.class_id === cls), pairs);
    return { cls, ...sum };
  }).sort((a, b) => b.percent - a.percent);

  const overall = teacherRows.reduce((acc, r) => ({ total: acc.total + r.total, completed: acc.completed + r.completed }), { total: 0, completed: 0 });
  const overallPct = overall.total ? Math.round((overall.completed / overall.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Overall completion</span>
          <span className="text-muted-foreground">{overall.completed}/{overall.total} ({overallPct}%)</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card-soft p-4">
          <h3 className="text-sm font-semibold text-foreground">Completion by Teacher</h3>
          <div className="mt-3 space-y-2">
            {teacherRows.map((r) => (
              <div key={r.teacher.code}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{r.teacher.code}</span>
                  <span className="font-mono text-muted-foreground">{r.completed}/{r.total} · {r.percent}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${r.percent}%`, backgroundColor: r.teacher.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-soft p-4">
          <h3 className="text-sm font-semibold text-foreground">Completion by Class</h3>
          <div className="mt-3 space-y-2">
            {classRows.map((r) => (
              <div key={r.cls}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Class {r.cls}</span>
                  <span className="font-mono text-muted-foreground">{r.completed}/{r.total} · {r.percent}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${r.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Questions ============
function QuestionsSection({ evals, allEvals }: { evals: Evaluation[]; allEvals: Evaluation[] }) {
  void allEvals;
  const marks = evals.filter((e) => e.status === "answered" && typeof e.mark === "number").map((e) => e.mark!);
  const avgMark = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
  const minus = evals.filter((e) => e.status === "not_answered").length;
  const rounds = new Set(evals.map((e) => `${e.teacher_code}|${e.class_id}|${e.subject}|${e.round_no}`));

  const byTeacher = new Map<string, number>();
  for (const e of evals) byTeacher.set(e.teacher_code, (byTeacher.get(e.teacher_code) ?? 0) + 1);
  const byClass = new Map<string, number>();
  for (const e of evals) byClass.set(e.class_id, (byClass.get(e.class_id) ?? 0) + 1);
  const bySubject = new Map<string, number>();
  for (const e of evals) bySubject.set(e.subject, (bySubject.get(e.subject) ?? 0) + 1);

  const topTeacher = [...byTeacher.entries()].sort((a, b) => b[1] - a[1])[0];
  const topClass = [...byClass.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Questions Asked" value={evals.length} tone="primary" />
        <StatCard label="Rounds" value={rounds.size} tone="primary" />
        <StatCard label="Avg Marks" value={avgMark.toFixed(2)} tone="good" />
        <StatCard label="Minus Records" value={minus} tone="warn" />
        <StatCard label="Most Active Teacher" value={topTeacher?.[0] ?? "—"} sub={topTeacher ? `${topTeacher[1]} q` : undefined} tone="primary" />
        <StatCard label="Most Active Class" value={topClass?.[0] ?? "—"} sub={topClass ? `${topClass[1]} q` : undefined} tone="primary" />
        <StatCard label="Answered" value={evals.filter((e) => e.status === "answered").length} tone="good" />
        <StatCard label="Absent" value={evals.filter((e) => e.status === "absent").length} tone="warn" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BreakdownList title="By Teacher" rows={[...byTeacher.entries()].sort((a, b) => b[1] - a[1])} />
        <BreakdownList title="By Class" rows={[...byClass.entries()].sort((a, b) => b[1] - a[1])} />
        <BreakdownList title="By Subject" rows={[...bySubject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)} />
      </div>
    </div>
  );
}

function BreakdownList({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = rows[0]?.[1] || 1;
  return (
    <div className="card-soft p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 && <div className="text-xs text-muted-foreground">No data.</div>}
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-semibold text-foreground">{k}</span>
              <span className="font-mono text-muted-foreground">{v}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((v / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Reports ============
function ReportsSection() {
  const REPORTS: { label: string; to: string }[] = [
    { label: "Student Report", to: "/rankings" },
    { label: "Teacher Report", to: "/teachers" },
    { label: "Class Report", to: "/classes" },
    { label: "Attention Report", to: "/attention" },
    { label: "Performance Report", to: "/performance" },
    { label: "Timetable", to: "/timetable" },
  ];
  return (
    <div className="space-y-4">
      <div className="card-soft p-4 text-xs text-muted-foreground">
        Quick reports open the matching view. Use your device's Print (or the button below) to export as PDF.
        <div className="mt-3">
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
            <Printer className="h-3.5 w-3.5" /> Print current page
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {REPORTS.map((r) => (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link key={r.label} to={r.to as any} className="card-soft p-4 transition hover:shadow-[var(--shadow-lift)]">
            <Trophy className="h-5 w-5 text-primary" />
            <div className="mt-2 text-sm font-bold text-foreground">{r.label}</div>
            <div className="text-[10px] text-muted-foreground">Open report →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============ Settings ============
function SettingsDialog({
  settings, onClose,
}: {
  settings: { academic_year_name: string; start_month: number; end_month: number };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(settings.academic_year_name);
  const [start, setStart] = useState(settings.start_month);
  const [end, setEnd] = useState(settings.end_month);
  const mutation = useMutation({
    mutationFn: () => updateSyllabusSettings({ academic_year_name: name, start_month: start, end_month: end }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["syllabus_settings"] });
      qc.invalidateQueries({ queryKey: ["syllabus_status"] });
      onClose();
    },
  });
  const months = buildAcademicMonths(start, end);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Academic Year</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-muted-foreground">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-semibold text-muted-foreground">
              Start
              <select value={start} onChange={(e) => setStart(Number(e.target.value))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted-foreground">
              End
              <select value={end} onChange={(e) => setEnd(Number(e.target.value))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2 text-[11px] text-muted-foreground">
            {months.length} months: {months.map((m) => m.monthName).join(" → ")}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">Cancel</button>
          <button disabled={mutation.isPending || !name.trim()} onClick={() => mutation.mutate()} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ shared UI ============
function StatCard({ label, value, sub, tone = "primary" }: { label: string; value: number | string; sub?: string; tone?: "primary" | "good" | "warn" | "sky" }) {
  const toneCls =
    tone === "good" ? "text-emerald-600 dark:text-emerald-400" :
    tone === "warn" ? "text-amber-600 dark:text-amber-400" :
    tone === "sky" ? "text-sky-600 dark:text-sky-400" :
    "text-primary";
  return (
    <div className="card-soft p-3">
      <div className={`text-lg font-bold ${toneCls}`}>{value}</div>
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

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="relative block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none rounded-lg bg-secondary px-3 py-2 pr-8 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 bottom-2.5 h-3.5 w-3.5 text-muted-foreground" />
    </label>
  );
}
