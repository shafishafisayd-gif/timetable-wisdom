import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { ArrowLeft, Check, X, UserX, Sparkles, RotateCcw, User } from "lucide-react";
import {
  TEACHER_BY_CODE,
  jsDayToCode,
  PERIOD_LABELS,
  DAY_LABELS,
  textOn,
  type ClassId,
} from "@/data/timetable";
import { useNow } from "@/lib/use-now";
import {
  fetchStudents,
  fetchTodayRoundPicks,
  fetchTodayEvaluations,
  resetTodayRound,
  insertRoundPick,
  insertEvaluation,
  type Student,
  type RoundPick,
  type Evaluation,
} from "@/lib/students-api";

const searchSchema = z.object({
  teacher: z.string(),
  period: z.coerce.number().optional(),
});

export const Route = createFileRoute("/session/$class/$subject")({
  validateSearch: zodValidator(searchSchema),
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

  const studentsQ = useQuery({
    queryKey: ["students", classId],
    queryFn: () => fetchStudents(classId),
  });
  const picksQ = useQuery({
    queryKey: ["daily_round_picks", teacherCode, classId, subject, new Date().toDateString()],
    queryFn: () => fetchTodayRoundPicks(teacherCode, classId, subject),
  });
  const evalsQ = useQuery({
    queryKey: ["today_evaluations", teacherCode, classId, subject, new Date().toDateString()],
    queryFn: () => fetchTodayEvaluations(teacherCode, classId, subject),
  });

  const students = studentsQ.data ?? [];
  const picks = picksQ.data ?? [];
  const evals = evalsQ.data ?? [];

  const evaluatedIds = useMemo(() => new Set(evals.map((e) => e.student_id)), [evals]);
  const openPicks = useMemo(
    () => picks.filter((p) => !evaluatedIds.has(p.student_id)),
    [picks, evaluatedIds],
  );
  // The locked "active" pick — the most recent unresolved pick today.
  const activePickId = openPicks.length > 0 ? openPicks[openPicks.length - 1].student_id : null;
  const activeStudent = useMemo(
    () => students.find((s) => s.id === activePickId) ?? null,
    [students, activePickId],
  );

  const askedIds = useMemo(() => {
    const set = new Set<string>();
    picks.forEach((p) => set.add(p.student_id));
    return set;
  }, [picks]);
  const remaining = useMemo(
    () => students.filter((s) => !askedIds.has(s.id)),
    [students, askedIds],
  );
  const roundComplete = students.length > 0 && remaining.length === 0 && !activePickId;

  const [busy, setBusy] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [showMinus, setShowMinus] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const autoPickRef = useRef(false);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["daily_round_picks", teacherCode, classId, subject] });
    qc.invalidateQueries({ queryKey: ["today_evaluations", teacherCode, classId, subject] });
    qc.invalidateQueries({ queryKey: ["evaluations"] });
  }, [qc, teacherCode, classId, subject]);

  const pickFromPool = useCallback(
    async (pool: Student[]) => {
      if (pool.length === 0) return null;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      await insertRoundPick({
        teacher_code: teacherCode,
        class_id: classId,
        subject,
        student_id: chosen.id,
        round_no: 1,
      });
      return chosen;
    },
    [teacherCode, classId, subject],
  );

  // On first load with no active locked pick and remaining students, auto-pick.
  useEffect(() => {
    if (autoPickRef.current) return;
    if (studentsQ.isLoading || picksQ.isLoading || evalsQ.isLoading) return;
    if (activePickId) { autoPickRef.current = true; return; }
    if (remaining.length === 0) return;
    autoPickRef.current = true;
    (async () => {
      setBusy(true);
      try {
        await pickFromPool(remaining);
        invalidate();
      } finally { setBusy(false); }
    })();
  }, [studentsQ.isLoading, picksQ.isLoading, evalsQ.isLoading, activePickId, remaining, pickFromPool, invalidate]);

  const startNewRound = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await resetTodayRound(teacherCode, classId, subject);
      autoPickRef.current = false;
      invalidate();
      setFlash("New round started");
      setTimeout(() => setFlash(null), 1800);
    } finally { setBusy(false); }
  };

  const afterEvaluate = async (msg: string) => {
    setShowMarks(false);
    setShowMinus(false);
    // Auto-pick next.
    const stillRemaining = remaining.filter((s) => s.id !== activePickId);
    const next = await pickFromPool(stillRemaining);
    invalidate();
    setFlash(next ? `${msg} · Next: ${next.name.split(" ")[0]}` : `${msg} · round complete`);
    setTimeout(() => setFlash(null), 2500);
  };

  const recordAnswered = async (mark: number) => {
    if (!activeStudent || busy) return;
    setBusy(true);
    try {
      await insertEvaluation({
        student_id: activeStudent.id,
        teacher_code: teacherCode,
        class_id: classId,
        subject,
        day: day!,
        period,
        status: "answered",
        mark,
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
        teacher_code: teacherCode,
        class_id: classId,
        subject,
        day: day!,
        period,
        status: "not_answered",
        mark: minus, // negative or zero
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
        teacher_code: teacherCode,
        class_id: classId,
        subject,
        day: day!,
        period,
        status: "absent",
        mark: null,
      });
      await afterEvaluate(`${activeStudent.name.split(" ")[0]} marked absent`);
    } finally { setBusy(false); }
  };

  if (!teacher) {
    return <div className="card-soft p-6 text-sm text-destructive">Unknown teacher.</div>;
  }

  const fg = textOn(teacher.color);
  const askedCount = askedIds.size;
  const roundNo = 1; // daily round; historical rounds preserved separately

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate({ to: "/teachers/$code", params: { code: teacherCode } })}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to teacher
        </button>
        <button
          onClick={startNewRound}
          disabled={busy || askedCount === 0}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground transition hover:bg-secondary/80 disabled:opacity-40"
          title="Reset today's random selection — marks and history are kept"
        >
          <RotateCcw className="h-3 w-3" /> Reset Round
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
              {period ? ` · ${PERIOD_LABELS[period]}` : ""}
            </div>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {remaining.length}/{students.length} students remaining · {askedCount} asked today · Round {roundNo}
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
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected Student</div>
                    <Link
                      to="/students/$id"
                      params={{ id: activeStudent.id }}
                      className="block truncate text-xl font-bold text-foreground hover:underline"
                    >
                      {activeStudent.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      Adm #{activeStudent.admission_no} · Class {activeStudent.class_id}
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
              <div className="text-lg font-bold text-primary">🎉 Today's Round Completed</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Every student in {classId} has been asked in {subject} today.
              </div>
              <button
                onClick={startNewRound}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
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
