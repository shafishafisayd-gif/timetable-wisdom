import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, TrendingUp, Users } from "lucide-react";
import type { ClassId } from "@/data/timetable";
import {
  fetchStudents,
  fetchEvaluations,
  computeStudentStats,
  type StudentStats,
  type Evaluation,
} from "@/lib/students-api";

type SortKey = "name" | "adm" | "performance" | "attendance";

export function StudentsSection({ classId, highlightId }: { classId: ClassId; highlightId?: string }) {
  const studentsQ = useQuery({ queryKey: ["students", classId], queryFn: () => fetchStudents(classId) });
  const evalsQ = useQuery({ queryKey: ["evaluations", "class", classId], queryFn: () => fetchEvaluations({ classId }) });

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("adm");

  const statsById = useMemo(() => {
    const map = new Map<string, StudentStats>();
    const byStudent = new Map<string, Evaluation[]>();
    for (const e of evalsQ.data ?? []) {
      const arr = byStudent.get(e.student_id) ?? [];
      arr.push(e);
      byStudent.set(e.student_id, arr);
    }
    for (const [sid, arr] of byStudent) map.set(sid, computeStudentStats(arr));
    return map;
  }, [evalsQ.data]);


  // Auto-scroll to highlighted student
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`student-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, studentsQ.data]);

  const students = studentsQ.data ?? [];
  const filtered = students
    .filter((s) =>
      !q ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      String(s.admission_no).includes(q),
    )
    .sort((a, b) => {
      const sa = statsById.get(a.id);
      const sb = statsById.get(b.id);
      switch (sort) {
        case "name": return a.name.localeCompare(b.name);
        case "adm": return a.admission_no - b.admission_no;
        case "performance": return (sb?.performanceScore ?? -Infinity) - (sa?.performanceScore ?? -Infinity);
        case "attendance": return (sb?.attendance ?? 0) - (sa?.attendance ?? 0);
      }
    });

  // Rankings within class
  const ranked = [...students]
    .map((s) => ({ s, score: statsById.get(s.id)?.performanceScore ?? 0, asked: statsById.get(s.id)?.totalAsked ?? 0 }))
    .sort((a, b) => (b.asked ? b.score : -Infinity) - (a.asked ? a.score : -Infinity));
  const rankById = new Map(ranked.map((r, i) => [r.s.id, i + 1]));

  return (
    <section className="card-soft p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Students</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">{students.length}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or admission #"
            className="w-full rounded-xl bg-secondary py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground focus:outline-none"
        >
          <option value="adm">Sort: Admission #</option>
          <option value="name">Sort: Name (A–Z)</option>
          <option value="performance">Sort: Performance</option>
          <option value="attendance">Sort: Attendance</option>
        </select>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filtered.map((s) => {
          const st = statsById.get(s.id);
          const isHi = highlightId === s.id;
          const rank = rankById.get(s.id);
          return (
            <Link
              key={s.id}
              id={`student-${s.id}`}
              to="/students/$id"
              params={{ id: s.id }}
              className={`group relative flex items-center gap-3 rounded-2xl border p-3 transition ${
                isHi ? "highlight-pulse border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                #{s.admission_no}
              </div>
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-semibold text-foreground">{s.name}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 font-semibold">{s.class_id}</span>
                  {st && st.totalAsked > 0 ? (
                    <>
                      <span>Asked {st.totalAsked}</span>
                      <span className="text-green-600">✓{st.answered}</span>
                      <span className="text-red-600">✗{st.notAnswered}</span>
                      <span className="text-amber-600">A{st.absent}</span>
                      <span className="font-semibold text-foreground">avg {st.averageMark.toFixed(1)}</span>
                    </>
                  ) : (
                    <span className="italic">No records yet</span>
                  )}
                </div>
              </div>
              {rank && st && st.totalAsked > 0 && (
                <div className="flex shrink-0 flex-col items-end">
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Rank</div>
                  <div className="flex items-center gap-0.5 text-sm font-bold text-foreground">
                    <TrendingUp className="h-3 w-3" />#{rank}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
