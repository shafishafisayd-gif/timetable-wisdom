import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Trophy,
  Users,
  BookOpen,
  GraduationCap,
  Crown,
  Sparkles,
  AlertTriangle,
  Target,
  Minus,
  ListTree,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  User as UserIcon,
  Star,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import {
  fetchEvaluations,
  fetchStudents,
  computeStudentStats,
  type Evaluation,
  type Student,
} from "@/lib/students-api";
import { fetchSyllabusSettings } from "@/lib/syllabus-api";
import { CLASSES, TEACHERS } from "@/data/timetable";

type Scope = "college" | "class" | "subject" | "teacher";
type Trend = "up" | "down" | "flat";

export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings · Malja'a" },
      { name: "description", content: "Live student rankings dashboard with podium, subject and class leaderboards, and performance insights." },
    ],
  }),
  component: RankingsPage,
});

interface RankRow {
  student: Student;
  points: number;
  asked: number;
  answered: number;
  notAnswered: number;
  absent: number;
  attendance: number; // count of answered + not_answered
  attendanceRate: number; // 0..100 of asked
  totalMarks: number;
  avg: number;
  strongest?: { subject: string; avg: number };
  weakest?: { subject: string; avg: number };
  isPerfect: boolean;
  trend: Trend;
  trendDelta: number;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

function computeTrend(list: Evaluation[]): { trend: Trend; delta: number } {
  const answered = list
    .filter((e) => e.status === "answered" && typeof e.mark === "number")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (answered.length < 4) return { trend: "flat", delta: 0 };
  const half = Math.floor(answered.length / 2);
  const early = answered.slice(0, half);
  const late = answered.slice(half);
  const avg = (xs: Evaluation[]) => xs.reduce((s, e) => s + (e.mark ?? 0), 0) / xs.length;
  const delta = avg(late) - avg(early);
  if (delta > 0.35) return { trend: "up", delta };
  if (delta < -0.35) return { trend: "down", delta };
  return { trend: "flat", delta };
}

function buildRow(student: Student, list: Evaluation[]): RankRow {
  const stats = computeStudentStats(list);
  const bySubj = new Map<string, { sum: number; n: number }>();
  let totalMarks = 0;
  for (const e of list) {
    if (e.status === "answered" && typeof e.mark === "number") {
      totalMarks += e.mark;
      const cur = bySubj.get(e.subject) ?? { sum: 0, n: 0 };
      cur.sum += e.mark;
      cur.n += 1;
      bySubj.set(e.subject, cur);
    }
  }
  let strongest: RankRow["strongest"];
  let weakest: RankRow["weakest"];
  for (const [subject, { sum, n }] of bySubj) {
    if (n === 0) continue;
    const a = sum / n;
    if (!strongest || a > strongest.avg) strongest = { subject, avg: a };
    if (!weakest || a < weakest.avg) weakest = { subject, avg: a };
  }
  const answeredMarks = list.filter(
    (e) => e.status === "answered" && typeof e.mark === "number",
  );
  const isPerfect =
    answeredMarks.length >= 3 && answeredMarks.every((e) => (e.mark ?? 0) === 5);
  const attendanceRate = stats.totalAsked > 0
    ? Math.round((stats.attendance / stats.totalAsked) * 100)
    : 0;
  const { trend, delta } = computeTrend(list);

  return {
    student,
    points: stats.totalPoints,
    asked: stats.totalAsked,
    answered: stats.answered,
    notAnswered: stats.notAnswered,
    absent: stats.absent,
    attendance: stats.attendance,
    attendanceRate,
    totalMarks,
    avg: stats.averageMark,
    strongest,
    weakest,
    isPerfect,
    trend,
    trendDelta: delta,
  };
}

function RankingsPage() {
  const [scope, setScope] = useState<Scope>("college");
  const [classId, setClassId] = useState<string>("S1");
  const [subject, setSubject] = useState<string>("");
  const [teacherCode, setTeacherCode] = useState<string>(TEACHERS[0].code);
  const [round, setRound] = useState<"all" | number>("all");
  const [limit, setLimit] = useState<10 | 20 | "all">(10);

  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });
  const evalsQ = useQuery({ queryKey: ["evaluations", "all"], queryFn: () => fetchEvaluations() });
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const academicYear = settingsQ.data?.academic_year_name ?? null;

  const subjects = useMemo(() => {
    const s = new Set<string>();
    for (const e of evalsQ.data ?? []) s.add(e.subject);
    return Array.from(s).sort();
  }, [evalsQ.data]);

  const rounds = useMemo(() => {
    const s = new Set<number>();
    for (const e of evalsQ.data ?? []) s.add(e.round_no);
    return Array.from(s).sort((a, b) => a - b);
  }, [evalsQ.data]);

  const filteredEvals = useMemo(() => {
    let all = evalsQ.data ?? [];
    if (round !== "all") all = all.filter((e) => e.round_no === round);
    switch (scope) {
      case "college": return all;
      case "class": return all.filter((e) => e.class_id === classId);
      case "subject": return subject ? all.filter((e) => e.subject === subject) : [];
      case "teacher": return all.filter((e) => e.teacher_code === teacherCode);
    }
  }, [scope, classId, subject, teacherCode, round, evalsQ.data]);

  const ranking: RankRow[] = useMemo(() => {
    const byStudent = new Map<string, Evaluation[]>();
    for (const e of filteredEvals) {
      const arr = byStudent.get(e.student_id) ?? [];
      arr.push(e);
      byStudent.set(e.student_id, arr);
    }
    const students = studentsQ.data ?? [];
    const map = new Map<string, Student>(students.map((s) => [s.id, s]));
    const rows: RankRow[] = [];
    for (const [sid, list] of byStudent) {
      const st = map.get(sid);
      if (!st) continue;
      const row = buildRow(st, list);
      if (row.asked === 0) continue;
      rows.push(row);
    }
    rows.sort((a, b) => b.points - a.points || b.avg - a.avg);
    return rows;
  }, [filteredEvals, studentsQ.data]);

  // Full-college rows (independent of scope) for highlights & overview.
  const collegeRows = useMemo(() => {
    const all = evalsQ.data ?? [];
    const students = studentsQ.data ?? [];
    const map = new Map<string, Student>(students.map((s) => [s.id, s]));
    const byStudent = new Map<string, Evaluation[]>();
    for (const e of all) {
      const arr = byStudent.get(e.student_id) ?? [];
      arr.push(e);
      byStudent.set(e.student_id, arr);
    }
    const rows: RankRow[] = [];
    for (const [sid, list] of byStudent) {
      const st = map.get(sid);
      if (!st) continue;
      const r = buildRow(st, list);
      if (r.asked > 0) rows.push(r);
    }
    rows.sort((a, b) => b.points - a.points || b.avg - a.avg);
    return rows;
  }, [evalsQ.data, studentsQ.data]);

  const overview = useMemo(() => {
    const totalStudents = studentsQ.data?.length ?? 0;
    const leader = collegeRows[0] ?? null;
    const highestPoints = collegeRows[0]?.points ?? 0;
    const highestAvg = collegeRows.reduce<RankRow | null>((acc, r) => (
      !acc || r.avg > acc.avg ? r : acc
    ), null);
    const perfectCount = collegeRows.filter((r) => r.isPerfect).length;
    const attentionCount = collegeRows.filter((r) => r.asked >= 2 && (r.points < 0 || r.avg < 2)).length;
    return { totalStudents, leader, highestPoints, highestAvg, perfectCount, attentionCount };
  }, [collegeRows, studentsQ.data]);

  const highlights = useMemo(() => {
    const rows = collegeRows;
    const topPerClass = new Map<string, RankRow>();
    for (const r of rows) {
      if (!topPerClass.has(r.student.class_id)) topPerClass.set(r.student.class_id, r);
    }
    const perfectScores = rows.filter((r) => r.isPerfect);
    const needsAttention = [...rows]
      .filter((r) => r.asked >= 2)
      .sort((a, b) => a.points - b.points || a.avg - b.avg)
      .slice(0, 5);
    const highMinus = [...rows]
      .filter((r) => r.notAnswered > 0)
      .sort((a, b) => b.notAnswered - a.notAnswered)
      .slice(0, 5);
    const mostImproved = [...rows]
      .filter((r) => r.trend === "up")
      .sort((a, b) => b.trendDelta - a.trendDelta)
      .slice(0, 5);
    const perfectAttendance = [...rows]
      .filter((r) => r.asked >= 3 && r.attendanceRate === 100)
      .sort((a, b) => b.attendance - a.attendance)
      .slice(0, 5);
    return { topPerClass, perfectScores, needsAttention, highMinus, mostImproved, perfectAttendance };
  }, [collegeRows]);

  // Subject rankings — top 10 per subject across whole college.
  const subjectRankings = useMemo(() => {
    const all = evalsQ.data ?? [];
    const students = studentsQ.data ?? [];
    const smap = new Map<string, Student>(students.map((s) => [s.id, s]));
    const bySub = new Map<string, Map<string, Evaluation[]>>();
    for (const e of all) {
      let m = bySub.get(e.subject);
      if (!m) { m = new Map(); bySub.set(e.subject, m); }
      const arr = m.get(e.student_id) ?? [];
      arr.push(e);
      m.set(e.student_id, arr);
    }
    const out: { subject: string; rows: RankRow[] }[] = [];
    for (const [sub, studentMap] of bySub) {
      const rows: RankRow[] = [];
      for (const [sid, list] of studentMap) {
        const st = smap.get(sid);
        if (!st) continue;
        const r = buildRow(st, list);
        if (r.asked === 0) continue;
        rows.push(r);
      }
      rows.sort((a, b) => b.points - a.points || b.avg - a.avg);
      out.push({ subject: sub, rows: rows.slice(0, 10) });
    }
    return out.sort((a, b) => a.subject.localeCompare(b.subject));
  }, [evalsQ.data, studentsQ.data]);

  // Class leaderboards.
  const classLeaderboards = useMemo(() => {
    const byClass = new Map<string, RankRow[]>();
    for (const r of collegeRows) {
      const arr = byClass.get(r.student.class_id) ?? [];
      arr.push(r);
      byClass.set(r.student.class_id, arr);
    }
    const totalByClass = new Map<string, number>();
    for (const s of studentsQ.data ?? []) {
      totalByClass.set(s.class_id, (totalByClass.get(s.class_id) ?? 0) + 1);
    }
    return CLASSES.map((c) => {
      const rows = (byClass.get(c) ?? []).slice().sort((a, b) => b.points - a.points || b.avg - a.avg);
      const total = totalByClass.get(c) ?? 0;
      const active = rows.length;
      const totalPoints = rows.reduce((s, r) => s + r.points, 0);
      const avg = rows.length ? rows.reduce((s, r) => s + r.avg, 0) / rows.length : 0;
      const completion = total > 0 ? Math.round((active / total) * 100) : 0;
      const attention = rows.filter((r) => r.asked >= 2 && (r.points < 0 || r.avg < 2)).length;
      return { classId: c, rows: rows.slice(0, 5), total, active, totalPoints, avg, completion, attention };
    });
  }, [collegeRows, studentsQ.data]);

  const shown = limit === "all" ? ranking : ranking.slice(0, limit);
  const podium = shown.slice(0, 3);
  const rest = shown.slice(3);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card-soft overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold sm:text-2xl">Rankings Dashboard</h1>
                <p className="truncate text-xs text-muted-foreground">
                  Total points primary · average as tiebreaker · updates live{academicYear ? ` · ${academicYear}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link to="/performance" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20">
                <ListTree className="h-3.5 w-3.5" /> Performance
              </Link>
              <Link to="/attention" className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" /> Attention
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <OverviewCard icon={<Users className="h-4 w-4" />} label="Total Students" value={overview.totalStudents} tone="slate" />
        <OverviewCard icon={<Crown className="h-4 w-4" />} label="Overall Leader" value={overview.leader?.student.name ?? "—"} sub={overview.leader ? `Class ${overview.leader.student.class_id}` : ""} tone="amber" wrap />
        <OverviewCard icon={<Flame className="h-4 w-4" />} label="Highest Points" value={overview.highestPoints} tone="primary" />
        <OverviewCard icon={<Star className="h-4 w-4" />} label="Highest Avg" value={overview.highestAvg ? overview.highestAvg.avg.toFixed(2) : "—"} sub={overview.highestAvg?.student.name} tone="sky" wrap />
        <OverviewCard icon={<Sparkles className="h-4 w-4" />} label="Perfect Scores" value={overview.perfectCount} tone="emerald" />
        <OverviewCard icon={<AlertTriangle className="h-4 w-4" />} label="Need Attention" value={overview.attentionCount} tone="rose" />
      </div>

      {/* Filters */}
      <div className="card-soft space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {([
            { id: "college", label: "College", icon: GraduationCap },
            { id: "class", label: "Class", icon: Users },
            { id: "subject", label: "Subject", icon: BookOpen },
            { id: "teacher", label: "Teacher", icon: Users },
          ] as { id: Scope; label: string; icon: any }[]).map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                scope === s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </button>
          ))}
        </div>
        {scope === "class" && (
          <div className="flex flex-wrap gap-1.5">
            {CLASSES.map((c) => (
              <button key={c} onClick={() => setClassId(c)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classId === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{c}</button>
            ))}
          </div>
        )}
        {scope === "subject" && (
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl bg-secondary px-3 py-2 text-sm">
            <option value="">Select a subject…</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {scope === "teacher" && (
          <select value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} className="w-full rounded-xl bg-secondary px-3 py-2 text-sm">
            {TEACHERS.map((t) => <option key={t.code} value={t.code}>{t.fullName} ({t.code})</option>)}
          </select>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Round</span>
          <button
            onClick={() => setRound("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${round === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            All
          </button>
          {rounds.map((r) => (
            <button
              key={r}
              onClick={() => setRound(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${round === r ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              R{r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Show</span>
          {[10, 20, "all" as const].map((n) => (
            <button key={String(n)} onClick={() => setLimit(n as any)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${limit === n ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {n === "all" ? "All" : `Top ${n}`}
            </button>
          ))}
        </div>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {podium.map((r, i) => (
            <PodiumCard key={r.student.id} rank={i + 1} row={r} />
          ))}
        </div>
      )}

      {/* Ranking list */}
      <div className="space-y-2.5">
        {shown.length === 0 ? (
          <p className="card-soft p-6 text-center text-sm text-muted-foreground">
            No ranked students in this scope yet.
          </p>
        ) : (
          rest.map((r, i) => (
            <RankCard key={r.student.id} rank={i + 4} row={r} />
          ))
        )}
      </div>

      {/* Subject rankings */}
      <SectionHeader icon={<BookOpen className="h-4 w-4 text-primary" />} title="Subject Rankings" subtitle="Top 10 students in each subject" />
      {subjectRankings.length === 0 ? (
        <EmptyCard text="No subject data yet." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {subjectRankings.map(({ subject: sub, rows }) => (
            <div key={sub} className="card-soft p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold">{sub}</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">{rows.length}</span>
              </div>
              <div className="space-y-1.5">
                {rows.map((r, i) => (
                  <MiniRankRow key={r.student.id} rank={i + 1} row={r} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Class leaderboards */}
      <SectionHeader icon={<GraduationCap className="h-4 w-4 text-primary" />} title="Class Leaderboards" subtitle="Top performers and totals per class" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {classLeaderboards.map((c) => (
          <div key={c.classId} className="card-soft p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Class {c.classId}</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {c.active}/{c.total} active
              </span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
              <MicroStat label="Points" value={c.totalPoints} tone="primary" />
              <MicroStat label="Avg" value={c.avg.toFixed(1)} tone="sky" />
              <MicroStat label="Compl." value={`${c.completion}%`} tone="emerald" />
              <MicroStat label="Attn" value={c.attention} tone="rose" />
            </div>
            <div className="mt-3 space-y-1.5">
              {c.rows.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No evaluations recorded yet.</p>
              ) : (
                c.rows.map((r, i) => <MiniRankRow key={r.student.id} rank={i + 1} row={r} />)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Highlights */}
      <SectionHeader icon={<Award className="h-4 w-4 text-primary" />} title="Performance Insights" subtitle="Automatically generated from live data" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <HighlightSection title="🥇 Top of Each Class" icon={<Crown className="h-4 w-4 text-amber-500" />}>
          {highlights.topPerClass.size === 0 ? <EmptyRow /> : (
            <div className="grid grid-cols-1 gap-2">
              {CLASSES.map((c) => {
                const r = highlights.topPerClass.get(c);
                if (!r) return null;
                return <MiniRow key={c} row={r} badge={`Class ${c}`} />;
              })}
            </div>
          )}
        </HighlightSection>

        <HighlightSection title="✨ Perfect Scorers" icon={<Sparkles className="h-4 w-4 text-emerald-500" />}>
          {highlights.perfectScores.length === 0 ? <EmptyRow text="No perfect-score streaks yet." /> : (
            <div className="grid grid-cols-1 gap-2">
              {highlights.perfectScores.map((r) => (
                <MiniRow key={r.student.id} row={r} badge="All 5s" tone="emerald" />
              ))}
            </div>
          )}
        </HighlightSection>

        <HighlightSection title="📈 Most Improved" icon={<TrendingUp className="h-4 w-4 text-sky-500" />}>
          {highlights.mostImproved.length === 0 ? <EmptyRow text="Not enough history yet." /> : (
            <div className="grid grid-cols-1 gap-2">
              {highlights.mostImproved.map((r) => (
                <MiniRow key={r.student.id} row={r} badge={`+${r.trendDelta.toFixed(1)}`} tone="sky" />
              ))}
            </div>
          )}
        </HighlightSection>

        <HighlightSection title="🎯 Perfect Attendance" icon={<Activity className="h-4 w-4 text-emerald-500" />}>
          {highlights.perfectAttendance.length === 0 ? <EmptyRow text="No perfect attendance streaks yet." /> : (
            <div className="grid grid-cols-1 gap-2">
              {highlights.perfectAttendance.map((r) => (
                <MiniRow key={r.student.id} row={r} badge={`${r.attendance} sessions`} tone="emerald" />
              ))}
            </div>
          )}
        </HighlightSection>

        <HighlightSection title="⚠ Needs Attention" icon={<Target className="h-4 w-4 text-orange-500" />}>
          {highlights.needsAttention.length === 0 ? <EmptyRow /> : (
            <div className="grid grid-cols-1 gap-2">
              {highlights.needsAttention.map((r) => (
                <MiniRow key={r.student.id} row={r} badge={`${r.points} pts`} tone="orange" />
              ))}
            </div>
          )}
        </HighlightSection>

        <HighlightSection title="➖ High Minus Count" icon={<Minus className="h-4 w-4 text-rose-500" />}>
          {highlights.highMinus.length === 0 ? <EmptyRow text="No minus records yet." /> : (
            <div className="grid grid-cols-1 gap-2">
              {highlights.highMinus.map((r) => (
                <MiniRow key={r.student.id} row={r} badge={`${r.notAnswered} minus`} tone="rose" />
              ))}
            </div>
          )}
        </HighlightSection>
      </div>
    </div>
  );
}

/* ---------- UI atoms ---------- */

function OverviewCard({
  icon, label, value, sub, tone = "slate", wrap = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "slate" | "primary" | "emerald" | "rose" | "amber" | "sky";
  wrap?: boolean;
}) {
  const map: Record<string, string> = {
    slate: "from-slate-500/10 to-slate-500/0 text-slate-700",
    primary: "from-primary/15 to-primary/0 text-primary",
    emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-700",
    rose: "from-rose-500/15 to-rose-500/0 text-rose-700",
    amber: "from-amber-500/15 to-amber-500/0 text-amber-700",
    sky: "from-sky-500/15 to-sky-500/0 text-sky-700",
  };
  return (
    <div className={`card-soft overflow-hidden bg-gradient-to-br p-3 ${map[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 font-black text-foreground ${wrap ? "text-sm leading-tight break-words whitespace-normal" : "text-xl truncate"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function medalTone(rank: number) {
  if (rank === 1) return { bg: "from-amber-300 to-yellow-500", ring: "ring-amber-400", chip: "bg-amber-100 text-amber-800", border: "border-amber-300" };
  if (rank === 2) return { bg: "from-slate-200 to-slate-400", ring: "ring-slate-300", chip: "bg-slate-100 text-slate-700", border: "border-slate-300" };
  return { bg: "from-orange-300 to-amber-600", ring: "ring-orange-400", chip: "bg-orange-100 text-orange-800", border: "border-orange-300" };
}

function TrendPill({ trend, delta }: { trend: Trend; delta: number }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        <TrendingUp className="h-3 w-3" /> +{delta.toFixed(1)}
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
        <TrendingDown className="h-3 w-3" /> {delta.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
      <Activity className="h-3 w-3" /> stable
    </span>
  );
}

function PodiumCard({ rank, row }: { rank: number; row: RankRow }) {
  const tone = medalTone(rank);
  return (
    <Link
      to="/students/$id"
      params={{ id: row.student.id }}
      className={`relative flex h-full flex-col items-center gap-2 rounded-3xl border-2 bg-card p-4 pt-6 text-center shadow-md transition hover:shadow-lg ${tone.border}`}
    >
      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-black shadow ${tone.chip}`}>
        #{rank}
      </div>
      <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br ${tone.bg} text-white ring-4 ${tone.ring}`}>
        <span className="text-base font-black">{initials(row.student.name)}</span>
      </div>
      <div className="w-full flex-1">
        <div className="whitespace-normal break-words text-sm font-black leading-snug hyphens-auto">
          {row.student.name}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Class {row.student.class_id} · Adm #{row.student.admission_no}
        </div>
      </div>
      <div className="mt-auto flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black">{row.points}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">pts</span>
        </div>
        <div className="text-[11px] text-muted-foreground">avg {row.avg.toFixed(2)} · {row.answered}✓ · {row.notAnswered}−</div>
        <TrendPill trend={row.trend} delta={row.trendDelta} />
      </div>
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
        <UserIcon className="h-3 w-3" /> View Profile <ArrowUpRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function RankCard({ rank, row }: { rank: number; row: RankRow }) {
  const attnPct = row.attendanceRate;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-black text-secondary-foreground">
          #{rank}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initials(row.student.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="whitespace-normal break-words text-sm font-bold leading-tight">{row.student.name}</span>
            <TrendPill trend={row.trend} delta={row.trendDelta} />
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Class {row.student.class_id} · Adm #{row.student.admission_no}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-black leading-none">{row.points}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Points</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">avg {row.avg.toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip tone="emerald">✓ {row.answered}</Chip>
        <Chip tone="rose">− {row.notAnswered}</Chip>
        <Chip tone="slate">A {row.absent}</Chip>
        <Chip tone="sky">marks {row.totalMarks}</Chip>
        <Chip tone="slate">asked {row.asked}</Chip>
        {row.strongest && <Chip tone="violet">Best: {row.strongest.subject}</Chip>}
        {row.weakest && row.weakest.subject !== row.strongest?.subject && (
          <Chip tone="orange">Weak: {row.weakest.subject}</Chip>
        )}
        {row.isPerfect && <Chip tone="emerald">✨ Perfect</Chip>}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
          <span>Attendance</span>
          <span>{attnPct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full ${attnPct >= 80 ? "bg-emerald-500" : attnPct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
            style={{ width: `${attnPct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          to="/students/$id"
          params={{ id: row.student.id }}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <UserIcon className="h-3.5 w-3.5" /> View Profile <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function MiniRankRow({ rank, row }: { rank: number; row: RankRow }) {
  return (
    <Link
      to="/students/$id"
      params={{ id: row.student.id }}
      className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2 transition hover:border-primary/40"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-secondary text-[11px] font-black text-secondary-foreground">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="whitespace-normal break-words text-xs font-semibold leading-tight">{row.student.name}</div>
        <div className="text-[10px] text-muted-foreground">Class {row.student.class_id} · avg {row.avg.toFixed(1)}</div>
      </div>
      <span className="shrink-0 text-sm font-black">{row.points}</span>
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">pts</span>
    </Link>
  );
}

function Chip({ children, tone = "slate" }: { children: React.ReactNode; tone?: "emerald" | "rose" | "slate" | "sky" | "violet" | "orange" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-slate-100 text-slate-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[tone]}`}>{children}</span>;
}

function MicroStat({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "primary" | "sky" | "emerald" | "rose" | "slate" }) {
  const map: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-secondary text-secondary-foreground",
  };
  return (
    <div className={`rounded-lg px-2 py-1.5 ${map[tone]}`}>
      <div className="text-sm font-black leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10">{icon}</div>
      <div className="min-w-0">
        <h2 className="text-base font-bold">{title}</h2>
        {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function HighlightSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card-soft p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MiniRow({ row, badge, tone = "slate" }: { row: RankRow; badge: string; tone?: "emerald" | "rose" | "slate" | "orange" | "sky" }) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-secondary text-secondary-foreground",
    orange: "bg-orange-100 text-orange-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <Link
      to="/students/$id"
      params={{ id: row.student.id }}
      className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 transition hover:border-primary/40"
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
        {initials(row.student.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="whitespace-normal break-words text-xs font-semibold leading-tight">{row.student.name}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          Class {row.student.class_id} · #{row.student.admission_no}
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneMap[tone]}`}>{badge}</span>
    </Link>
  );
}

function EmptyRow({ text = "Not enough data yet." }: { text?: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

function EmptyCard({ text }: { text: string }) {
  return <p className="card-soft p-6 text-center text-sm text-muted-foreground">{text}</p>;
}
