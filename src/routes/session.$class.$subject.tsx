import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { ArrowLeft, Check, X, UserX, Sparkles, RotateCcw, User } from "lucide-react";
import {
  TEACHER_BY_CODE,
  jsDayToCode,
  DAY_LABELS,
  textOn,
  type ClassId,
} from "@/data/timetable";
import { useNow } from "@/lib/use-now";
import {
  fetchStudents,
  fetchRoundState,
  fetchEvaluations,
  startNewRound as apiStartNewRound,
  insertRoundPick,
  insertEvaluation,
  type Student,
} from "@/lib/students-api";
import { fetchSyllabusSettings } from "@/lib/syllabus-api";

const searchSchema = z.object({
  teacher: z.string(),
  period: z.coerce.number().optional(),
});

export const Route = createFileRoute("/session/$class/$subject")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `${params.subject} · ${params.class} · Session` },
      { name: "description", content: `Question session for ${params.subject} in ${params.class}.` },
    ],
  }),
  component: SessionPage,
  errorComponent: ({ error }) => (
    <div className="card-soft p-6 text-sm text-destructive" role="alert">{error.message}</div>
  ),
  notFoundComponent: () => <div className="card-soft p-6 text-sm">Session not found.</div>,
});

function SessionPage() {
  const { class: classIdParam, subject } = Route.useParams();
  const classId = classIdParam as ClassId;
  const { teacher: teacherCode, period: periodParam } = Route.useSearch();
  const teacher = TEACHER_BY_CODE[teacherCode];
  const now = useNow();
  const day = jsDayToCode(now.getDay());
  const period = periodParam ?? 0;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const academicYear = settingsQ.data?.academic_year_name ?? null;

  const studentsQ = useQuery({
    queryKey: ["students", classId],
    queryFn: () => fetchStudents(classId),
  });
  const students = studentsQ.data ?? [];

  // Persistent round state — per teacher/class/subject, remembers previous position.
  const roundStateQ = useQuery({
    queryKey: ["round_state", teacherCode, classId, subject, students.length],
    enabled: !studentsQ.isLoading,
    queryFn: () => fetchRoundState(teacherCode, classId, subject, students.length),
  });
  const roundNo = roundStateQ.data?.roundNo ?? 1;
  const picks = roundStateQ.data?.picks ?? [];

  // Evaluations for this specific round → determines "asked but unresolved".
  const evalsQ = useQuery({
    queryKey: ["evaluations", "round", teacherCode, classId, subject, roundNo],
    enabled: !!roundStateQ.data,
    queryFn: () =>
      fetchEvaluations({ teacherCode, classId, subject }).then((rows) =>
        rows.filter((e) => e.round_no === roundNo),
      ),
  });
  const evals = evalsQ.data ?? [];

  const evaluatedIds = useMemo(() => new Set(evals.map((e) => e.student_id)), [evals]);
  const openPicks = useMemo(
    () => picks.filter((p) => !evaluatedIds.has(p.student_id)),
    [picks, evaluatedIds],
  );
  const activePickId = openPicks.length > 0 ? openPicks[openPicks.length - 1].student_id : null;
  const activeStudent = useMemo(
    () => students.find((s) => s.id === activePickId) ?? null,
    [students, activePickId],
  );

  const askedIds = useMemo(() => new Set(picks.map((p) => p.student_id)), [picks]);
  const remaining = useMemo(
    () => students.filter((s) => !askedIds.has(s.id)),
    [students, askedIds],
  );
  const roundComplete = students.length > 0 && remaining.length === 0 && !activePickId;

  const [busy, setBusy] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [showMinus, setShowMinus] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const autoPickRef = useRef<string | null>(null);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["round_state", teacherCode, classId, subject] });
    qc.invalidateQueries({ queryKey: ["evaluations"] });
    qc.invalidateQueries({ queryKey: ["daily_round_picks"] });
  }, [qc, teacherCode, classId, subject]);

  const pickFromPool = useCallback(
    async (pool: Student[], targetRound: number) => {
      if (pool.length === 0) return null;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      await insertRoundPick({
        teacher_code: teacherCode,
        class_id: classId,
        subject,
        student_id: chosen.id,
        round_no: targetRound,
      });
      return chosen;
    },
    [teacherCode, classId, subject],
  );

  // Auto-pick when there is no active locked student and remaining students exist in this round.
  useEffect(() => {
    const guardKey = `${roundNo}:${activePickId ?? ""}:${remaining.length}`;
    if (autoPickRef.current === guardKey) return;
    if (studentsQ.isLoading || roundStateQ.isLoading || evalsQ.isLoading) return;
    if (activePickId) { autoPickRef.current = guardKey; return; }
    if (remaining.length === 0) return;
    autoPickRef.current = guardKey;
    (async () => {
      setBusy(true);
      try {
        await pickFromPool(remaining, roundNo);
        invalidate();
      } finally { setBusy(false); }
    })();
  }, [studentsQ.isLoading, roundStateQ.isLoading, evalsQ.isLoading, activePickId, remaining, roundNo, pickFromPool, invalidate]);

  const startNewRound = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const nextRound = await apiStartNewRound(teacherCode, classId, subject);
      await pickFromPool(students, nextRound);
      autoPickRef.current = null;
      invalidate();
      setFlash(`Round ${nextRound} started`);
      setTimeout(() => setFlash(null), 1800);
    } finally { setBusy(false); }
  };

  const commonEvalPayload = () => ({
    teacher_code: teacherCode,
    class_id: classId,
    subject,
    day: day!,
    period,
    academic_year: academicYear,
    round_no: roundNo,
  });

  const afterEvaluate = async (msg: string) => {
    setShowMarks(false);
    setShowMinus(false);
    const stillRemaining = remaining.filter((s) => s.id !== activePickId);
    if (stillRemaining.length > 0) {
      const next = await pickFromPool(stillRemaining, roundNo);
      invalidate();
      setFlash(next ? `${msg} · Next: ${next.name.split(" ")[0]}` : msg);
    } else {
      invalidate();
      setFlash(`${msg} · Round ${roundNo} complete 🎉`);
    }
    setTimeout(() => setFlash(null), 2500);
  };

  const recordAnswered = async (mark: number) => {
    if (!activeStudent || busy) return;
    setBusy(true);
    try {
      await insertEvaluation({
        student_id: activeStudent.id,
        status: "answered",
        mark,
        ...commonEvalPayload(),
      });
      await afterEvaluate(`${activeStudent.name.split(" ")[0]}: ${mark}/5`);
    } finally { setBusy(false); }
  };

  const recordNotAnswered = async (minus: number) => {
    if (!activeStudent || busy) return;
    setBusy(true);
    try {
      await insertEvaluation({
        student_id: activeStudent.id,
        status: "not_answered",
        mark: minus,
        ...commonEvalPayload(),
      });
      await afterEvaluate(`${activeStudent.name.split(" ")[0]}: ${minus}`);
    } finally { setBusy(false); }
  };

  const recordAbsent = async () => {
    if (!activeStudent || busy) return;
    setBusy(true);
    try {
      await insertEvaluation({
        student_id: activeStudent.id,
        status: "absent",
        mark: null,
        ...commonEvalPayload(),
      });
      await afterEvaluate(`${activeStudent.name.split(" ")[0]} marked absent`);
    } finally { setBusy(false); }
  };

  if (!teacher) {
    return <div className="card-soft p-6 text-sm text-destructive">Unknown teacher.</div>;
  }

  const fg = textOn(teacher.color);
  const askedCount = picks.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate({ to: "/teachers/$code", params: { code: teacherCode } })}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to teacher
        </button>
      </div>

      <div className="card-lift overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: teacher.color }} />
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Question Session
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <div className="text-lg font-bold">{subject}</div>
            <div className="text-sm text-muted-foreground">
              · Class {classId} · {teacher.shortName}
              {day ? ` · ${DAY_LABELS[day]}` : ""}
              {period ? ` · P${period}` : ""}
            </div>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {remaining.length}/{students.length} students remaining · {askedCount} asked this round · Round {roundNo}
          </div>

          {flash && (
            <div className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">{flash}</div>
          )}

          {activeStudent && (
            <div className="mt-4 space-y-4">
              <div
                className="rounded-3xl border-2 p-5 shadow-sm"
                style={{ borderColor: teacher.color, backgroundColor: teacher.color + "14" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold"
                    style={{ backgroundColor: teacher.color, color: fg }}
                  >
                    <User className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected Student</div>
                    <Link
                      to="/students/$id"
                      params={{ id: activeStudent.id }}
                      className="block break-words text-xl font-bold leading-snug text-foreground hover:underline sm:text-2xl"
                    >
                      {activeStudent.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground break-words">
                      Adm #{activeStudent.admission_no} · Class {activeStudent.class_id} · {subject}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                  <Meta label="Teacher" value={teacher.shortName} />
                  <Meta label="Subject" value={subject} />
                  <Meta label="Day" value={day ? DAY_LABELS[day] : "—"} />
                  <Meta label="Round" value={String(roundNo)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setShowMarks((v) => !v); setShowMinus(false); }}
                  disabled={busy}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 ${
                    showMarks ? "bg-green-700 ring-2 ring-green-300" : "bg-green-600"
                  }`}
                >
                  <Check className="h-5 w-5" /> Answered
                </button>
                <button
                  onClick={() => { setShowMinus((v) => !v); setShowMarks(false); }}
                  disabled={busy}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 ${
                    showMinus ? "bg-red-700 ring-2 ring-red-300" : "bg-red-600"
                  }`}
                >
                  <X className="h-5 w-5" /> Not Answered
                </button>
                <button
                  onClick={recordAbsent}
                  disabled={busy}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-amber-500 px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  <UserX className="h-5 w-5" /> Absent
                </button>
              </div>

              {showMarks && (
                <div className="rounded-2xl border border-border p-3">
                  <div className="text-xs font-semibold text-muted-foreground">Assign mark (0–5)</div>
                  <div className="mt-2 grid grid-cols-6 gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((m) => (
                      <button
                        key={m}
                        onClick={() => recordAnswered(m)}
                        disabled={busy}
                        className="rounded-xl bg-secondary py-3 text-base font-bold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-50"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showMinus && (
                <div className="rounded-2xl border border-border p-3">
                  <div className="text-xs font-semibold text-muted-foreground">Assign minus (0 to −5)</div>
                  <div className="mt-2 grid grid-cols-6 gap-1.5">
                    {[0, -1, -2, -3, -4, -5].map((m) => (
                      <button
                        key={m}
                        onClick={() => recordNotAnswered(m)}
                        disabled={busy}
                        className="rounded-xl bg-secondary py-3 text-base font-bold text-secondary-foreground transition hover:bg-red-600 hover:text-white active:scale-95 disabled:opacity-50"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!activeStudent && roundComplete && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 text-center">
              <div className="text-lg font-bold text-primary">🎉 Round {roundNo} Completed</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Every student in {classId} has been asked in {subject} this round.
                <br />Marks, minus, absences and stats are preserved.
              </div>
              <button
                onClick={startNewRound}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" /> Start New Round
              </button>
            </div>
          )}

          {!activeStudent && !roundComplete && (
            <div className="mt-4 rounded-2xl bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
              Preparing next student…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/60 px-2 py-1.5">
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-xs font-semibold text-foreground">{value}</div>
    </div>
  );
}
