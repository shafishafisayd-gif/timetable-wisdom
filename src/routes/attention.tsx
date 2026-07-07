import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AlertTriangle, TrendingDown, MinusCircle } from "lucide-react";
import { fetchEvaluations, fetchStudents, type Evaluation, type Student } from "@/lib/students-api";
import { TEACHER_BY_CODE } from "@/data/timetable";

export const Route = createFileRoute("/attention")({
  head: () => ({
    meta: [
      { title: "Students Requiring Attention · Malja'a" },
      { name: "description", content: "Students who may need extra support based on marks, minus counts and answers." },
    ],
  }),
  component: AttentionPage,
});

interface Row {
  student: Student;
  answered: number;
  notAnswered: number;
  absent: number;
  minusTotal: number; // sum of negative marks (positive number)
  minusCount: number; // count of not_answered records
  markSum: number;
  markCount: number;
  avg: number;
  percentage: number; // 0..100
  lastAt: string | null;
  weakSubjects: string[];
  teachers: Set<string>;
}

function AttentionPage() {
  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });
  const evalsQ = useQuery({ queryKey: ["evaluations", "all"], queryFn: () => fetchEvaluations() });

  const { rows, subjectWeak } = useMemo(() => {
    const students = studentsQ.data ?? [];
    const evals = evalsQ.data ?? [];
    const byStudent = new Map<string, Evaluation[]>();
    for (const e of evals) {
      const arr = byStudent.get(e.student_id) ?? [];
      arr.push(e);
      byStudent.set(e.student_id, arr);
    }

    const rows: Row[] = students.map((s) => {
      const list = byStudent.get(s.id) ?? [];
      let answered = 0, notAnswered = 0, absent = 0, minusTotal = 0, minusCount = 0;
      let markSum = 0, markCount = 0;
      let lastAt: string | null = null;
      const teachers = new Set<string>();
      const bySub = new Map<string, { sum: number; count: number; minus: number }>();
      for (const e of list) {
        teachers.add(e.teacher_code);
        if (!lastAt || e.created_at > lastAt) lastAt = e.created_at;
        const b = bySub.get(e.subject) ?? { sum: 0, count: 0, minus: 0 };
        if (e.status === "answered") {
          answered++;
          if (typeof e.mark === "number") { markSum += e.mark; markCount++; b.sum += e.mark; b.count++; }
        } else if (e.status === "not_answered") {
          notAnswered++;
          minusCount++;
          if (typeof e.mark === "number" && e.mark < 0) { minusTotal += -e.mark; b.minus += -e.mark; }
          else { minusTotal += 1; b.minus += 1; }
        } else {
          absent++;
        }
        bySub.set(e.subject, b);
      }
      const avg = markCount ? markSum / markCount : 0;
      const percentage = markCount ? (markSum / (markCount * 5)) * 100 : 0;
      // Weak subjects: avg < 3 or minus > 0
      const weakSubjects: string[] = [];
      for (const [sub, v] of bySub) {
        const subAvg = v.count ? v.sum / v.count : 0;
        if ((v.count > 0 && subAvg < 3) || v.minus >= 2) weakSubjects.push(sub);
      }
      return {
        student: s,
        answered, notAnswered, absent, minusTotal, minusCount,
        markSum, markCount, avg, percentage,
        lastAt, weakSubjects, teachers,
      };
    });

    // Subject-wise weak students
    const bySubject = new Map<string, { student: Student; avg: number; count: number; minus: number }[]>();
    for (const s of students) {
      const list = byStudent.get(s.id) ?? [];
      const sub = new Map<string, { sum: number; count: number; minus: number }>();
      for (const e of list) {
        const b = sub.get(e.subject) ?? { sum: 0, count: 0, minus: 0 };
        if (e.status === "answered" && typeof e.mark === "number") { b.sum += e.mark; b.count++; }
        if (e.status === "not_answered") b.minus += Math.abs(e.mark ?? 1);
        sub.set(e.subject, b);
      }
      for (const [subject, v] of sub) {
        if (v.count === 0 && v.minus === 0) continue;
        const list2 = bySubject.get(subject) ?? [];
        list2.push({ student: s, avg: v.count ? v.sum / v.count : 0, count: v.count, minus: v.minus });
        bySubject.set(subject, list2);
      }
    }
    const subjectWeak = Array.from(bySubject.entries()).map(([subject, list]) => ({
      subject,
      // Weakness score: lower avg + more minus = weaker
      list: list
        .map((r) => ({ ...r, weakness: (r.count ? 5 - r.avg : 3) + r.minus * 0.5 }))
        .sort((a, b) => b.weakness - a.weakness)
        .slice(0, 5),
    })).sort((a, b) => a.subject.localeCompare(b.subject));

    return { rows, subjectWeak };
  }, [studentsQ.data, evalsQ.data]);

  const withActivity = rows.filter((r) => r.answered + r.notAnswered + r.absent > 0);
  const byMinus = [...withActivity].sort((a, b) => b.minusTotal - a.minusTotal).slice(0, 15).filter((r) => r.minusTotal > 0);
  const byLowest = [...withActivity]
    .map((r) => ({ ...r, weakness: (r.markCount ? 5 - r.avg : 2.5) + r.minusTotal * 0.3 }))
    .sort((a, b) => b.weakness - a.weakness)
    .slice(0, 15);

  const loading = studentsQ.isLoading || evalsQ.isLoading;

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl font-bold">Students Requiring Attention</h1>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Automatically identifies students who may need additional support.
        </p>
      </div>

      {loading && <div className="card-soft p-6 text-center text-sm text-muted-foreground">Loading…</div>}

      {!loading && (
        <>
          <section className="card-soft p-4">
            <div className="flex items-center gap-2">
              <MinusCircle className="h-4 w-4 text-red-600" />
              <h3 className="text-sm font-semibold">Highest Minus Count</h3>
            </div>
            {byMinus.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No minus records yet.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {byMinus.map((r) => (
                  <StudentRow key={r.student.id} r={r} highlight={`${r.minusTotal.toFixed(0)} minus`} />
                ))}
              </div>
            )}
          </section>

          <section className="card-soft p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <h3 className="text-sm font-semibold">Lowest Performing Students</h3>
            </div>
            {byLowest.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No evaluations yet.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {byLowest.map((r) => (
                  <StudentRow
                    key={r.student.id}
                    r={r}
                    highlight={r.markCount ? `${r.percentage.toFixed(0)}%` : `${r.minusCount} ✗`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card-soft p-4">
            <h3 className="text-sm font-semibold">Subject-wise Weak Students</h3>
            {subjectWeak.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing to show yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {subjectWeak.map((sw) => (
                  <div key={sw.subject} className="rounded-2xl border border-border bg-card p-3">
                    <div className="font-semibold text-foreground">{sw.subject}</div>
                    <ul className="mt-2 space-y-1">
                      {sw.list.map((row, i) => (
                        <li key={row.student.id}>
                          <Link
                            to="/students/$id"
                            params={{ id: row.student.id }}
                            className="flex items-center justify-between rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs hover:bg-secondary"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              <span className="text-muted-foreground">{i + 1}. </span>
                              <span className="font-semibold text-foreground">{row.student.name}</span>
                              <span className="text-muted-foreground"> · Class {row.student.class_id}</span>
                            </span>
                            <span className="ml-2 shrink-0 font-bold text-red-600">
                              {row.count ? `avg ${row.avg.toFixed(1)}` : ""}{row.minus ? ` · −${row.minus}` : ""}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StudentRow({ r, highlight }: { r: Row; highlight: string }) {
  const teacherNames = Array.from(r.teachers).map((c) => TEACHER_BY_CODE[c]?.shortName ?? c).join(", ");
  const lastStr = r.lastAt ? new Date(r.lastAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "—";
  return (
    <Link
      to="/students/$id"
      params={{ id: r.student.id }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition hover:border-red-400/50"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{r.student.name}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          Class {r.student.class_id} · {teacherNames || "—"} · last {lastStr}
        </div>
        {r.weakSubjects.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {r.weakSubjects.slice(0, 4).map((s) => (
              <span key={s} className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">{s}</span>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-base font-bold text-red-600">{highlight}</div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
          ✗ {r.notAnswered} · absent {r.absent}
        </div>
      </div>
    </Link>
  );
}
