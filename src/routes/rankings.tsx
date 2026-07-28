import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Trophy,
  Users,
  BookOpen,
  GraduationCap,
  Medal,
  Crown,
  Sparkles,
  AlertTriangle,
  Target,
  Minus,
  ListTree,
} from "lucide-react";
import {
  fetchEvaluations,
  fetchStudents,
  computeStudentStats,
  type Evaluation,
  type Student,
} from "@/lib/students-api";
import { CLASSES, TEACHERS } from "@/data/timetable";

type Scope = "college" | "class" | "subject" | "teacher";

export const Route = createFileRoute("/rankings")({
  head: () => ({ meta: [{ title: "Rankings · Malja'a" }] }),
  component: RankingsPage,
});

interface RankRow {
  student: Student;
  points: number;
  asked: number;
  answered: number;
  notAnswered: number;
  absent: number;
  attendance: number;
  totalMarks: number;
  avg: number;
  strongest?: { subject: string; avg: number };
  weakest?: { subject: string; avg: number };
  isPerfect: boolean;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

function buildRow(student: Student, list: Evaluation[]): RankRow {
  const stats = computeStudentStats(list);
  // Subject-wise averages for strongest/weakest.
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

  return {
    student,
    points: stats.totalPoints,
    asked: stats.totalAsked,
    answered: stats.answered,
    notAnswered: stats.notAnswered,
    absent: stats.absent,
    attendance: stats.attendance,
    totalMarks,
    avg: stats.averageMark,
    strongest,
    weakest,
    isPerfect,
  };
}

function RankingsPage() {
  const [scope, setScope] = useState<Scope>("college");
  const [classId, setClassId] = useState<string>("S1");
  const [subject, setSubject] = useState<string>("");
  const [teacherCode, setTeacherCode] = useState<string>(TEACHERS[0].code);
  const [limit, setLimit] = useState<10 | 20 | "all">(10);

  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });
  const evalsQ = useQuery({ queryKey: ["evaluations", "all"], queryFn: () => fetchEvaluations() });

  const subjects = useMemo(() => {
    const s = new Set<string>();
    for (const e of evalsQ.data ?? []) s.add(e.subject);
    return Array.from(s).sort();
  }, [evalsQ.data]);

  const filteredEvals = useMemo(() => {
    const all = evalsQ.data ?? [];
    switch (scope) {
      case "college": return all;
      case "class": return all.filter((e) => e.class_id === classId);
      case "subject": return subject ? all.filter((e) => e.subject === subject) : [];
      case "teacher": return all.filter((e) => e.teacher_code === teacherCode);
    }
  }, [scope, classId, subject, teacherCode, evalsQ.data]);

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

  // Highlights derived across full college data (independent of scope filter).
  const highlights = useMemo(() => {
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
    return { topPerClass, perfectScores, needsAttention, highMinus };
  }, [evalsQ.data, studentsQ.data]);

  const shown = limit === "all" ? ranking : ranking.slice(0, limit);
  const podium = shown.slice(0, 3);
  const rest = shown.slice(3);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-soft overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold">Student Rankings</h1>
                <p className="truncate text-xs text-muted-foreground">
                  Ranked by total points · avg breaks ties · updates live
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link
                to="/performance"
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
              >
                <ListTree className="h-3.5 w-3.5" /> Performance
              </Link>
              <Link
                to="/attention"
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-200"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Attention
              </Link>
            </div>
          </div>
        </div>

        {/* Scope selector */}
        <div className="space-y-3 border-t border-border p-4">
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
          <div className="flex gap-1.5">
            {[10, 20, "all" as const].map((n) => (
              <button key={String(n)} onClick={() => setLimit(n as any)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${limit === n ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {n === "all" ? "All" : `Top ${n}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {podium.map((r, i) => (
            <PodiumCard key={r.student.id} rank={i + 1} row={r} />
          ))}
        </div>
      )}

      {/* Ranking list */}
      <div className="space-y-2">
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

      {/* Highlights */}
      <HighlightSection title="🥇 Top of Each Class" icon={<Crown className="h-4 w-4 text-amber-500" />}>
        {highlights.topPerClass.size === 0 ? (
          <EmptyRow />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CLASSES.map((c) => {
              const r = highlights.topPerClass.get(c);
              if (!r) return null;
              return <MiniRow key={c} row={r} badge={`Class ${c}`} />;
            })}
          </div>
        )}
      </HighlightSection>

      <HighlightSection title="✨ Perfect Scorers" icon={<Sparkles className="h-4 w-4 text-emerald-500" />}>
        {highlights.perfectScores.length === 0 ? (
          <EmptyRow text="No perfect-score streaks yet." />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {highlights.perfectScores.map((r) => (
              <MiniRow key={r.student.id} row={r} badge="All 5s" tone="emerald" />
            ))}
          </div>
        )}
      </HighlightSection>

      <HighlightSection title="⚠ Needs Attention" icon={<Target className="h-4 w-4 text-orange-500" />}>
        {highlights.needsAttention.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {highlights.needsAttention.map((r) => (
              <MiniRow key={r.student.id} row={r} badge={`${r.points} pts`} tone="orange" />
            ))}
          </div>
        )}
      </HighlightSection>

      <HighlightSection title="➖ High Minus Count" icon={<Minus className="h-4 w-4 text-rose-500" />}>
        {highlights.highMinus.length === 0 ? (
          <EmptyRow text="No minus records yet." />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {highlights.highMinus.map((r) => (
              <MiniRow key={r.student.id} row={r} badge={`${r.notAnswered} minus`} tone="rose" />
            ))}
          </div>
        )}
      </HighlightSection>
    </div>
  );
}

function medalTone(rank: number) {
  if (rank === 1) return { bg: "from-amber-300 to-yellow-500", ring: "ring-amber-400", chip: "bg-amber-100 text-amber-800" };
  if (rank === 2) return { bg: "from-slate-200 to-slate-400", ring: "ring-slate-300", chip: "bg-slate-100 text-slate-700" };
  return { bg: "from-orange-300 to-amber-600", ring: "ring-orange-400", chip: "bg-orange-100 text-orange-800" };
}

function PodiumCard({ rank, row }: { rank: number; row: RankRow }) {
  const tone = medalTone(rank);
  return (
    <Link
      to="/students/$id"
      params={{ id: row.student.id }}
      className="relative flex h-full flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 pt-5 text-center shadow-sm transition hover:border-primary/50"
    >
      <div className={`absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.chip}`}>#{rank}</div>
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br ${tone.bg} text-white ring-2 ${tone.ring}`}>
        <span className="text-sm font-black">{initials(row.student.name)}</span>
      </div>
      <div className="w-full flex-1">
        <div className="whitespace-normal break-words text-xs font-bold leading-tight hyphens-auto">
          {row.student.name}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {row.student.class_id} · #{row.student.admission_no}
        </div>
      </div>
      <div className="mt-auto flex flex-col items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black">{row.points}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">pts</span>
        </div>
        <div className="text-[10px] text-muted-foreground">avg {row.avg.toFixed(1)}</div>
      </div>
    </Link>
  );
}

function RankCard({ rank, row }: { rank: number; row: RankRow }) {
  return (
    <Link
      to="/students/$id"
      params={{ id: row.student.id }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/40"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
        #{rank}
      </div>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials(row.student.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="whitespace-normal break-words text-sm font-semibold leading-tight">{row.student.name}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          Class {row.student.class_id} · Adm #{row.student.admission_no} · asked {row.asked} · attend {row.attendance}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          <Chip tone="emerald">✓ {row.answered}</Chip>
          <Chip tone="rose">− {row.notAnswered}</Chip>
          <Chip tone="slate">A {row.absent}</Chip>
          <Chip tone="sky">marks {row.totalMarks}</Chip>
          {row.strongest && <Chip tone="violet">Best: {row.strongest.subject}</Chip>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xl font-black">{row.points}</div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Points</div>
        <div className="text-[10px] text-muted-foreground">avg {row.avg.toFixed(1)}</div>
      </div>
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

function MiniRow({ row, badge, tone = "slate" }: { row: RankRow; badge: string; tone?: "emerald" | "rose" | "slate" | "orange" }) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-secondary text-secondary-foreground",
    orange: "bg-orange-100 text-orange-700",
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
        <div className="truncate text-xs font-semibold">{row.student.name}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          {row.student.class_id} · #{row.student.admission_no}
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneMap[tone]}`}>{badge}</span>
    </Link>
  );
}

function EmptyRow({ text = "Not enough data yet." }: { text?: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}
