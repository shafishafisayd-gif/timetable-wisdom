import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trophy, Users, BookOpen, GraduationCap } from "lucide-react";
import { fetchEvaluations, fetchStudents, computeStudentStats, type Student } from "@/lib/students-api";
import { CLASSES, TEACHERS } from "@/data/timetable";

type Scope = "college" | "class" | "subject" | "teacher";

export const Route = createFileRoute("/rankings")({
  head: () => ({ meta: [{ title: "Rankings · Malja'a" }] }),
  component: RankingsPage,
});

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

  const ranking = useMemo(() => {
    const byStudent = new Map<string, typeof filteredEvals>();
    for (const e of filteredEvals) {
      const arr = byStudent.get(e.student_id) ?? [];
      arr.push(e);
      byStudent.set(e.student_id, arr);
    }
    const students = studentsQ.data ?? [];
    const map = new Map<string, Student>(students.map((s) => [s.id, s]));
    const rows: { student: Student; points: number; asked: number; answered: number; avg: number }[] = [];
    for (const [sid, list] of byStudent) {
      const st = map.get(sid);
      if (!st) continue;
      const stats = computeStudentStats(list);
      if (stats.totalAsked === 0) continue;
      rows.push({
        student: st,
        points: stats.totalPoints,
        asked: stats.totalAsked,
        answered: stats.answered,
        avg: stats.averageMark,
      });
    }
    // Total points is the primary metric; average mark breaks ties.
    rows.sort((a, b) => b.points - a.points || b.avg - a.avg);
    return rows;
  }, [filteredEvals, studentsQ.data]);

  const shown = limit === "all" ? ranking : ranking.slice(0, limit);

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Rankings</h1>
          </div>
          <Link to="/attention" className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-200">
            ⚠ Needs Attention
          </Link>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">Live rankings based on all recorded evaluations.</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
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
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CLASSES.map((c) => (
              <button key={c} onClick={() => setClassId(c)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classId === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{c}</button>
            ))}
          </div>
        )}
        {scope === "subject" && (
          <div className="mt-3">
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl bg-secondary px-3 py-2 text-sm">
              <option value="">Select a subject…</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        {scope === "teacher" && (
          <div className="mt-3">
            <select value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} className="w-full rounded-xl bg-secondary px-3 py-2 text-sm">
              {TEACHERS.map((t) => <option key={t.code} value={t.code}>{t.fullName} ({t.code})</option>)}
            </select>
          </div>
        )}

        <div className="mt-3 flex gap-1.5">
          {[10, 20, "all" as const].map((n) => (
            <button key={String(n)} onClick={() => setLimit(n as any)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${limit === n ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {n === "all" ? "All" : `Top ${n}`}
            </button>
          ))}
        </div>
      </div>

      <div className="card-soft p-3">
        {shown.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No ranked students in this scope yet.</p>
        ) : (
          <ol className="space-y-1.5">
            {shown.map((r, i) => (
              <li key={r.student.id}>
                <Link to="/students/$id" params={{ id: r.student.id }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition hover:border-primary/40">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                    i === 0 ? "bg-yellow-400 text-yellow-900" :
                    i === 1 ? "bg-slate-300 text-slate-800" :
                    i === 2 ? "bg-amber-500 text-amber-950" :
                    "bg-secondary text-secondary-foreground"
                  }`}>{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.student.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Class {r.student.class_id} · Adm #{r.student.admission_no} · asked {r.asked} · avg {r.avg.toFixed(1)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-bold text-foreground">{r.points}</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Points</div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
