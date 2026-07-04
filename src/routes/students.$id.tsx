import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, Check, X, UserX, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchEvaluations,
  fetchStudents,
  computeStudentStats,
  computeSubjectStats,
  type Student,
} from "@/lib/students-api";
import type { ClassId } from "@/data/timetable";

async function fetchStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Student | null;
}

export const Route = createFileRoute("/students/$id")({
  head: () => ({ meta: [{ title: "Student · Malja'a" }] }),
  component: StudentPage,
});

function StudentPage() {
  const { id } = Route.useParams();
  const studentQ = useQuery({ queryKey: ["student", id], queryFn: () => fetchStudent(id) });
  const evalsQ = useQuery({ queryKey: ["evaluations", "student", id], queryFn: () => fetchEvaluations({ studentId: id }) });
  const classmatesQ = useQuery({
    queryKey: ["students", studentQ.data?.class_id],
    queryFn: () => fetchStudents(studentQ.data!.class_id as ClassId),
    enabled: !!studentQ.data?.class_id,
  });
  const classEvalsQ = useQuery({
    queryKey: ["evaluations", "class", studentQ.data?.class_id],
    queryFn: () => fetchEvaluations({ classId: studentQ.data!.class_id }),
    enabled: !!studentQ.data?.class_id,
  });

  if (studentQ.isLoading) return <div className="card-soft p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  const student = studentQ.data;
  if (!student) return <div className="card-soft p-6 text-center text-sm text-muted-foreground">Student not found.</div>;

  const evals = evalsQ.data ?? [];
  const stats = computeStudentStats(evals.length ? evals : [{ student_id: id } as any]);
  const subjectStats = computeSubjectStats(evals);

  // Class rank
  const classEvals = classEvalsQ.data ?? [];
  const byStudent = new Map<string, typeof classEvals>();
  for (const e of classEvals) {
    const arr = byStudent.get(e.student_id) ?? [];
    arr.push(e);
    byStudent.set(e.student_id, arr);
  }
  const ranked = (classmatesQ.data ?? []).map((s) => ({
    s,
    score: computeStudentStats(byStudent.get(s.id) ?? []).performanceScore,
    asked: (byStudent.get(s.id) ?? []).length,
  })).sort((a, b) => (b.asked ? b.score : -Infinity) - (a.asked ? a.score : -Infinity));
  const rank = ranked.findIndex((r) => r.s.id === id) + 1;

  return (
    <div className="space-y-4">
      <Link to="/classes/$id" params={{ id: student.class_id }} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Class {student.class_id}
      </Link>

      <div className="card-lift p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            #{student.admission_no}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{student.name}</h1>
            <p className="text-sm text-muted-foreground">Class {student.class_id} · Admission {student.admission_no}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Questions Asked" value={stats.totalAsked} />
        <Stat label="Answered" value={stats.answered} tone="green" />
        <Stat label="Not Answered" value={stats.notAnswered} tone="red" />
        <Stat label="Absent" value={stats.absent} tone="amber" />
        <Stat label="Avg Mark" value={stats.averageMark.toFixed(1)} />
        <Stat label="Performance" value={stats.performanceScore.toFixed(1)} />
        <Stat label="Class Rank" value={rank ? `#${rank}` : "—"} />
        <Stat label="Attendance" value={`${stats.attendance}/${stats.totalAsked || 0}`} />
      </div>

      <section className="card-soft p-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Subject-wise Performance</h3>
        </div>
        {subjectStats.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No questions recorded yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {subjectStats.map((s) => (
              <div key={s.subject} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">{s.subject}</div>
                  <div className="text-xs text-muted-foreground">{s.asked} question{s.asked !== 1 ? "s" : ""}</div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                  <MiniStat label="Avg" value={s.average.toFixed(1)} />
                  <MiniStat label="High" value={s.highest} />
                  <MiniStat label="Low" value={s.lowest} />
                  <MiniStat label="✓" value={s.answered} />
                  <MiniStat label="✗" value={s.notAnswered} />
                  <MiniStat label="Absent" value={s.absent} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-soft p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Recent Activity</h3>
        </div>
        {evals.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {evals.slice(0, 20).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {e.status === "answered" ? <Check className="h-3.5 w-3.5 text-green-600" /> :
                   e.status === "not_answered" ? <X className="h-3.5 w-3.5 text-red-600" /> :
                   <UserX className="h-3.5 w-3.5 text-amber-600" />}
                  <span className="truncate font-semibold text-foreground">{e.subject}</span>
                  <span className="truncate text-muted-foreground">· {e.teacher_code}</span>
                </div>
                <div className="ml-2 shrink-0 font-semibold">
                  {e.status === "answered" ? `${e.mark}/10` : e.status === "not_answered" ? "-1" : "Absent"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "green" | "red" | "amber" }) {
  const color = tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-foreground";
  return (
    <div className="card-soft p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-sm font-bold text-foreground">{value}</div>
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
