import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Award, Check, X, UserX, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchEvaluations,
  fetchStudents,
  computeStudentStats,
  computeSubjectStats,
  updateEvaluation,
  deleteEvaluation,
  type Student,
  type Evaluation,
} from "@/lib/students-api";
import { DAY_LABELS, TEACHER_BY_CODE, type ClassId } from "@/data/timetable";

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
  const qc = useQueryClient();
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

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["evaluations"] });
    qc.invalidateQueries({ queryKey: ["today_evaluations"] });
  };

  const delMut = useMutation({
    mutationFn: (evalId: string) => deleteEvaluation(evalId),
    onSuccess: invalidateAll,
  });
  const updMut = useMutation({
    mutationFn: (v: { id: string; patch: Partial<Pick<Evaluation, "status" | "mark">> }) =>
      updateEvaluation(v.id, v.patch),
    onSuccess: invalidateAll,
  });

  const [editing, setEditing] = useState<Evaluation | null>(null);

  if (studentQ.isLoading) return <div className="card-soft p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  const student = studentQ.data;
  if (!student) return <div className="card-soft p-6 text-center text-sm text-muted-foreground">Student not found.</div>;

  const evals = evalsQ.data ?? [];
  const stats = computeStudentStats(evals);
  const subjectStats = computeSubjectStats(evals);

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
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            #{student.admission_no}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-bold leading-snug">{student.name}</h1>
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
          <h3 className="text-sm font-semibold">Evaluation History</h3>
          <span className="ml-auto text-xs text-muted-foreground">{evals.length} record{evals.length !== 1 ? "s" : ""}</span>
        </div>
        {evals.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {evals.map((e) => {
              const teacher = TEACHER_BY_CODE[e.teacher_code];
              const d = new Date(e.created_at);
              const dateStr = d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
              const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={e.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {e.status === "answered" ? <Check className="h-3.5 w-3.5 text-green-600" /> :
                         e.status === "not_answered" ? <X className="h-3.5 w-3.5 text-red-600" /> :
                         <UserX className="h-3.5 w-3.5 text-amber-600" />}
                        <span className="font-semibold text-foreground">{e.subject}</span>
                        <span className="text-xs text-muted-foreground">· {teacher?.shortName ?? e.teacher_code}</span>
                        <span className="text-xs text-muted-foreground">· Class {e.class_id}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {dateStr} · {DAY_LABELS[e.day as keyof typeof DAY_LABELS] ?? e.day} · P{e.period} · {timeStr}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`rounded-lg px-2 py-1 text-xs font-bold ${
                        e.status === "answered" ? "bg-green-100 text-green-700" :
                        e.status === "not_answered" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {e.status === "answered" ? `${e.mark}/5` : e.status === "not_answered" ? `${e.mark}` : "Absent"}
                      </span>
                      <button
                        onClick={() => setEditing(e)}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this evaluation? This will update all statistics.")) {
                            delMut.mutate(e.id);
                          }
                        }}
                        disabled={delMut.isPending}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-secondary-foreground transition hover:bg-red-600 hover:text-white disabled:opacity-50"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editing && (
        <EditModal
          evalRow={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updMut.mutate({ id: editing.id, patch }, { onSuccess: () => setEditing(null) });
          }}
          saving={updMut.isPending}
        />
      )}
    </div>
  );
}

function EditModal({
  evalRow,
  onClose,
  onSave,
  saving,
}: {
  evalRow: Evaluation;
  onClose: () => void;
  onSave: (patch: Partial<Pick<Evaluation, "status" | "mark">>) => void;
  saving: boolean;
}) {
  const [status, setStatus] = useState<Evaluation["status"]>(evalRow.status);
  const [mark, setMark] = useState<number>(evalRow.mark ?? 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Edit Evaluation</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{evalRow.subject} · P{evalRow.period}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["answered", "not_answered", "absent"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); if (s === "absent") setMark(0); }}
              className={`rounded-xl px-2 py-2 text-xs font-bold transition ${
                status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {s === "answered" ? "Answered" : s === "not_answered" ? "Not Answered" : "Absent"}
            </button>
          ))}
        </div>

        {status === "answered" && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-muted-foreground">Mark (0–5)</div>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((m) => (
                <button key={m} onClick={() => setMark(m)}
                  className={`rounded-lg py-2 text-sm font-bold ${mark === m ? "bg-green-600 text-white" : "bg-secondary text-secondary-foreground"}`}>{m}</button>
              ))}
            </div>
          </div>
        )}
        {status === "not_answered" && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-muted-foreground">Minus (0 to −5)</div>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {[0, -1, -2, -3, -4, -5].map((m) => (
                <button key={m} onClick={() => setMark(m)}
                  className={`rounded-lg py-2 text-sm font-bold ${mark === m ? "bg-red-600 text-white" : "bg-secondary text-secondary-foreground"}`}>{m}</button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground">Cancel</button>
          <button
            disabled={saving}
            onClick={() => onSave({ status, mark: status === "absent" ? null : mark })}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
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
