import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import {
  ArrowLeft,
  Check,
  X,
  UserX,
  Sparkles,
  RotateCcw,
  User,
  Users,
  History,
  ChevronDown,
  ChevronUp,
  Trophy,
} from "lucide-react";
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
  fetchAllRoundPicks,
  startNewRound as apiStartNewRound,
  insertRoundPick,
  insertEvaluation,
  type Student,
  type Evaluation,
} from "@/lib/students-api";
import { fetchSyllabusSettings } from "@/lib/syllabus-api";

const searchSchema = z.object({
  teacher: z.string().optional().catch(undefined),
  period: z.coerce.number().optional().catch(undefined),
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
    <div className="card-soft p-6 text-sm text-destructive" role="alert">{error instanceof Error ? error.message : String(error)}</div>
  ),
  notFoundComponent: () => <div className="card-soft p-6 text-sm">Session not found.</div>,
});

type EvalMode = "answered" | "not_answered" | null;

function SessionPage() {
  const { class: classIdParam, subject } = Route.useParams();
  const classId = classIdParam as ClassId;
  const { teacher: teacherParam, period: periodParam } = Route.useSearch();
  const teacherCode = teacherParam ?? "";
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

  const roundStateQ = useQuery({
    queryKey: ["round_state", teacherCode, classId, subject, students.length],
    enabled: !studentsQ.isLoading,
    queryFn: () => fetchRoundState(teacherCode, classId, subject, students.length),
  });
  const roundNo = roundStateQ.data?.roundNo ?? 1;
  const picks = roundStateQ.data?.picks ?? [];

  // All evaluations for this teacher/class/subject (all rounds) — for history + current-round stats.
  const evalsQ = useQuery({
    queryKey: ["evaluations", "tcs", teacherCode, classId, subject],
    queryFn: () => fetchEvaluations({ teacherCode, classId, subject }),
  });
  const allEvals = evalsQ.data ?? [];

  // All picks across every round — for round history.
  const allPicksQ = useQuery({
    queryKey: ["round_picks", "all", teacherCode, classId, subject],
    queryFn: () => fetchAllRoundPicks(teacherCode, classId, subject),
  });
  const allPicks = allPicksQ.data ?? [];

  const currentRoundEvals = useMemo(
    () => allEvals.filter((e) => e.round_no === roundNo),
    [allEvals, roundNo],
  );

  // A student is "asked in this round" if they appear in picks OR have an evaluation in this round.
  const askedIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of picks) set.add(p.student_id);
    for (const e of currentRoundEvals) set.add(e.student_id);
    return set;
  }, [picks, currentRoundEvals]);

  const evaluatedIds = useMemo(
    () => new Set(currentRoundEvals.map((e) => e.student_id)),
    [currentRoundEvals],
  );

  // Random locked pick = last pick that's not yet evaluated.
  const openRandomPick = useMemo(() => {
    const open = picks.filter((p) => !evaluatedIds.has(p.student_id));
    return open.length > 0 ? open[open.length - 1] : null;
  }, [picks, evaluatedIds]);

  const activeStudent = useMemo(
    () => students.find((s) => s.id === openRandomPick?.student_id) ?? null,
    [students, openRandomPick],
  );

  // Remaining pool = not asked at all yet in this round AND not the currently locked random student.
  const remaining = useMemo(
    () => students.filter((s) => !askedIds.has(s.id)),
    [students, askedIds],
  );

  const remainingForList = useMemo(
    () => remaining.filter((s) => s.id !== activeStudent?.id),
    [remaining, activeStudent],
  );

  const roundComplete =
    students.length > 0 && askedIds.size >= students.length && !activeStudent;

  // Local UI state
  const [busy, setBusy] = useState(false);
  const [randomMode, setRandomMode] = useState<EvalMode>(null);
  const [manualId, setManualId] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState<EvalMode>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const autoPickRef = useRef<string | null>(null);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["round_state", teacherCode, classId, subject] });
    qc.invalidateQueries({ queryKey: ["evaluations"] });
    qc.invalidateQueries({ queryKey: ["round_picks"] });
    qc.invalidateQueries({ queryKey: ["daily_round_picks"] });
  }, [qc, teacherCode, classId, subject]);

  const commonEvalPayload = () => ({
    teacher_code: teacherCode,
    class_id: classId,
    subject,
    day: day!,
    period,
    academic_year: academicYear,
    round_no: roundNo,
  });

  // Auto-pick a random student when no active locked random & pool still has fresh students.
  useEffect(() => {
    const guardKey = `${roundNo}:${openRandomPick?.id ?? ""}:${remaining.length}`;
    if (autoPickRef.current === guardKey) return;
    if (studentsQ.isLoading || roundStateQ.isLoading || evalsQ.isLoading) return;
    if (openRandomPick) { autoPickRef.current = guardKey; return; }
    if (remaining.length === 0) return;
    autoPickRef.current = guardKey;
    (async () => {
      setBusy(true);
      try {
        const chosen = remaining[Math.floor(Math.random() * remaining.length)];
        await insertRoundPick({
          teacher_code: teacherCode,
          class_id: classId,
          subject,
          student_id: chosen.id,
          round_no: roundNo,
        });
        invalidate();
      } finally { setBusy(false); }
    })();
  }, [
    studentsQ.isLoading, roundStateQ.isLoading, evalsQ.isLoading,
    openRandomPick, remaining, roundNo, teacherCode, classId, subject, invalidate,
  ]);

  const startNewRound = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const nextRound = await apiStartNewRound(teacherCode, classId, subject);
      autoPickRef.current = null;
      // Insert a first random pick for the new round.
      if (students.length > 0) {
        const chosen = students[Math.floor(Math.random() * students.length)];
        await insertRoundPick({
          teacher_code: teacherCode,
          class_id: classId,
          subject,
          student_id: chosen.id,
          round_no: nextRound,
        });
      }
      invalidate();
      setFlash(`Round ${nextRound} started`);
      setTimeout(() => setFlash(null), 1800);
    } finally { setBusy(false); }
  };

  const saveEvaluation = async (
    student: Student,
    status: Evaluation["status"],
    mark: number | null,
    isManual: boolean,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      // For manual selection, ensure a round_pick exists so pool math stays consistent.
      if (isManual) {
        await insertRoundPick({
          teacher_code: teacherCode,
          class_id: classId,
          subject,
          student_id: student.id,
          round_no: roundNo,
        });
      }
      await insertEvaluation({
        student_id: student.id,
        status,
        mark,
        ...commonEvalPayload(),
      });
      const label =
        status === "answered" ? `${mark}/5` :
        status === "not_answered" ? `${mark}` : "absent";
      setFlash(`${student.name.split(" ")[0]}: ${label}`);
      setTimeout(() => setFlash(null), 2000);
      if (isManual) { setManualId(null); setManualMode(null); }
      else { setRandomMode(null); }
      invalidate();
    } finally { setBusy(false); }
  };

  if (!teacher) {
    return (
      <div className="card-soft space-y-2 p-6 text-sm">
        <p className="font-semibold text-foreground">Pick a teacher to start this session</p>
        <p className="text-muted-foreground">
          Open a question session from a teacher page or from the class page so the right teacher is attached.
        </p>
      </div>
    );
  }

  const fg = textOn(teacher.color);
  const askedCount = askedIds.size;
  const total = students.length;
  const progressPct = total > 0 ? Math.round((askedCount / total) * 100) : 0;

  // Current round quick counters.
  const cAnswered = currentRoundEvals.filter((e) => e.status === "answered").length;
  const cNot = currentRoundEvals.filter((e) => e.status === "not_answered").length;
  const cAbsent = currentRoundEvals.filter((e) => e.status === "absent").length;
  const cRemaining = total - askedCount;

  const manualStudent = manualId ? students.find((s) => s.id === manualId) ?? null : null;

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

      {/* Session header + round progress */}
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

          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="font-bold">Round {roundNo}</div>
            <div className="text-xs text-muted-foreground">{askedCount} / {total} asked</div>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: teacher.color }}
            />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
            <MiniStat label="Answered" value={cAnswered} tone="emerald" />
            <MiniStat label="Not Ans." value={cNot} tone="rose" />
            <MiniStat label="Absent" value={cAbsent} tone="amber" />
            <MiniStat label="Remain" value={cRemaining} tone="slate" />
          </div>

          {flash && (
            <div className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">{flash}</div>
          )}
        </div>
      </div>

      {/* Active student card — manual takes priority over the random locked pick */}
      {!roundComplete && (manualStudent || activeStudent) && (
        (() => {
          const isManual = !!manualStudent;
          const s = (manualStudent ?? activeStudent)!;
          const accent = isManual ? "hsl(var(--primary))" : teacher.color;
          const badgeFg = isManual ? "hsl(var(--primary-foreground))" : fg;
          return (
            <div className="card-lift overflow-hidden ring-2" style={{ boxShadow: `0 0 0 2px ${accent}` }}>
              <div className="h-1.5" style={{ backgroundColor: accent }} />
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
                    <Sparkles className="h-4 w-4" />
                    {isManual ? "Manually Selected · Active" : "Random Selected · Active"}
                  </div>
                  {isManual && (
                    <button
                      onClick={() => { setManualId(null); setManualMode(null); }}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/70"
                    >
                      <X className="h-3.5 w-3.5" /> Back to random
                    </button>
                  )}
                </div>
                <div
                  className="mt-3 rounded-3xl border-2 p-4 shadow-sm"
                  style={{ borderColor: accent, backgroundColor: accent + "14" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold"
                      style={{ backgroundColor: accent, color: badgeFg }}
                    >
                      <User className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/students/$id"
                        params={{ id: s.id }}
                        className="block whitespace-normal break-words text-xl font-bold leading-snug text-foreground hover:underline sm:text-2xl"
                      >
                        {s.name}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground break-words">
                        Adm #{s.admission_no} · Class {s.class_id} · {subject}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                          Round {roundNo}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                          style={{ backgroundColor: accent }}
                        >
                          Awaiting Evaluation
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <EvalControls
                  mode={isManual ? manualMode : randomMode}
                  setMode={isManual ? setManualMode : setRandomMode}
                  onAnswered={(m) => saveEvaluation(s, "answered", m, isManual)}
                  onNotAnswered={(m) => saveEvaluation(s, "not_answered", m, isManual)}
                  onAbsent={() => saveEvaluation(s, "absent", null, isManual)}
                  busy={busy}
                />
              </div>
            </div>
          );
        })()
      )}

      {/* Round complete summary */}
      {roundComplete && (
        <RoundCompleteCard
          roundNo={roundNo}
          students={students}
          evals={currentRoundEvals}
          onStart={startNewRound}
          busy={busy}
          teacherColor={teacher.color}
        />
      )}

      {/* Manual selection: students remaining in this round */}
      {!roundComplete && (
        <div className="card-soft p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Students Remaining in This Round</h2>
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
              {remainingForList.length} left
            </span>
          </div>
          {remainingForList.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {activeStudent
                ? "All other students have been asked. Evaluate the active student above to finish the round."
                : "No students remaining."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {remainingForList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setManualId(s.id); setManualMode(null); }}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    manualId === s.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-bold text-secondary-foreground">
                    #{s.admission_no}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="whitespace-normal break-words text-sm font-semibold leading-tight">
                      {s.name}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Tap to evaluate now
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Round history */}
      <RoundHistory
        open={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
        allPicks={allPicks}
        allEvals={allEvals}
        students={students}
        currentRoundNo={roundNo}
        roundComplete={roundComplete}
      />

      {!activeStudent && !roundComplete && (
        <div className="card-soft p-4 text-center text-sm text-muted-foreground">
          Preparing next random student…
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" | "amber" | "slate" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-800",
    rose: "bg-rose-100 text-rose-800",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-100 text-slate-800",
  };
  return (
    <div className={`rounded-xl px-2 py-1.5 ${map[tone]}`}>
      <div className="text-base font-black leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}

function EvalControls({
  mode, setMode, onAnswered, onNotAnswered, onAbsent, busy,
}: {
  mode: EvalMode;
  setMode: (m: EvalMode) => void;
  onAnswered: (m: number) => void;
  onNotAnswered: (m: number) => void;
  onAbsent: () => void;
  busy: boolean;
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setMode(mode === "answered" ? null : "answered")}
          disabled={busy}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 ${
            mode === "answered" ? "bg-green-700 ring-2 ring-green-300" : "bg-green-600"
          }`}
        >
          <Check className="h-5 w-5" /> Answered
        </button>
        <button
          onClick={() => setMode(mode === "not_answered" ? null : "not_answered")}
          disabled={busy}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 ${
            mode === "not_answered" ? "bg-red-700 ring-2 ring-red-300" : "bg-red-600"
          }`}
        >
          <X className="h-5 w-5" /> Not Answered
        </button>
        <button
          onClick={onAbsent}
          disabled={busy}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-amber-500 px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          <UserX className="h-5 w-5" /> Absent
        </button>
      </div>
      {mode === "answered" && (
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <div className="text-xs font-semibold text-muted-foreground">Assign mark (0–5)</div>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((m) => (
              <button
                key={m}
                onClick={() => onAnswered(m)}
                disabled={busy}
                className="rounded-xl bg-secondary py-3 text-base font-bold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-50"
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === "not_answered" && (
        <div className="rounded-2xl border border-border bg-background/60 p-3">
          <div className="text-xs font-semibold text-muted-foreground">Assign minus (−1 to −5)</div>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {[-1, -2, -3, -4, -5].map((m) => (
              <button
                key={m}
                onClick={() => onNotAnswered(m)}
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
  );
}

function summarizeRound(students: Student[], evals: Evaluation[]) {
  const answered = evals.filter((e) => e.status === "answered");
  const notAnswered = evals.filter((e) => e.status === "not_answered");
  const absent = evals.filter((e) => e.status === "absent");
  const posPoints = answered.reduce((s, e) => s + (e.mark ?? 0), 0);
  const minusPoints = notAnswered.reduce((s, e) => s + (e.mark ?? 0), 0);
  const marks = answered.map((e) => e.mark ?? 0);
  const avg = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
  // Per-student totals for this round.
  const perStudent = new Map<string, number>();
  for (const e of evals) {
    if (e.status === "absent") continue;
    perStudent.set(e.student_id, (perStudent.get(e.student_id) ?? 0) + (e.mark ?? 0));
  }
  let highest: { student: Student; pts: number } | null = null;
  const fullMarks: Student[] = [];
  const withMinus: Student[] = [];
  for (const s of students) {
    const pts = perStudent.get(s.id);
    if (pts !== undefined) {
      if (!highest || pts > highest.pts) highest = { student: s, pts };
    }
    const sEvals = evals.filter((e) => e.student_id === s.id);
    if (sEvals.length > 0 && sEvals.every((e) => e.status === "answered" && e.mark === 5)) {
      fullMarks.push(s);
    }
    if (sEvals.some((e) => e.status === "not_answered")) withMinus.push(s);
  }
  const completion = students.length
    ? Math.round((new Set(evals.map((e) => e.student_id)).size / students.length) * 100)
    : 0;
  return {
    total: students.length,
    answered: answered.length,
    notAnswered: notAnswered.length,
    absent: absent.length,
    posPoints, minusPoints, avg, highest, fullMarks, withMinus, completion,
  };
}

function RoundCompleteCard({
  roundNo, students, evals, onStart, busy, teacherColor,
}: {
  roundNo: number;
  students: Student[];
  evals: Evaluation[];
  onStart: () => void;
  busy: boolean;
  teacherColor: string;
}) {
  const s = summarizeRound(students, evals);
  const [showDetails, setShowDetails] = useState(false);
  const perStudent = useMemo(() => {
    const rows = students.map((st) => {
      const list = evals.filter((e) => e.student_id === st.id);
      const status = list[0]?.status ?? "—";
      const pts = list.reduce((sum, e) => sum + (e.mark ?? 0), 0);
      return { st, status, pts, list };
    });
    return rows.sort((a, b) => b.pts - a.pts);
  }, [students, evals]);

  return (
    <div className="card-lift overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: teacherColor }} />
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
          <Trophy className="h-4 w-4" /> Round {roundNo} Completed
        </div>
        <div className="mt-1 text-2xl font-black">🎉 Great job!</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Completion {s.completion}% · Every student has been asked this round.
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SumStat label="Total Students" value={s.total} />
          <SumStat label="Answered" value={s.answered} tone="emerald" />
          <SumStat label="Not Answered" value={s.notAnswered} tone="rose" />
          <SumStat label="Absent" value={s.absent} tone="amber" />
          <SumStat label="Positive Pts" value={s.posPoints} tone="emerald" />
          <SumStat label="Minus Pts" value={s.minusPoints} tone="rose" />
          <SumStat label="Avg Mark" value={s.avg.toFixed(2)} />
          <SumStat label="Completion" value={`${s.completion}%`} />
        </div>

        {s.highest && (
          <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Highest Scorer
            </div>
            <div className="mt-0.5 whitespace-normal break-words text-sm font-bold text-amber-900">
              {s.highest.student.name} · {s.highest.pts} pts
            </div>
          </div>
        )}
        {s.fullMarks.length > 0 && (
          <div className="mt-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Full Marks
            </div>
            <div className="mt-0.5 text-xs text-emerald-900">
              {s.fullMarks.map((st) => st.name).join(", ")}
            </div>
          </div>
        )}
        {s.withMinus.length > 0 && (
          <div className="mt-2 rounded-2xl border border-rose-300 bg-rose-50 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
              Students with Minus
            </div>
            <div className="mt-0.5 text-xs text-rose-900">
              {s.withMinus.map((st) => st.name).join(", ")}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onStart}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" /> Start New Round
          </button>
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showDetails ? "Hide" : "View"} Round Performance
          </button>
        </div>

        {showDetails && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {perStudent.map((row, i) => (
                  <tr key={row.st.id} className="border-t border-border">
                    <td className="px-3 py-2 font-bold">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        to="/students/$id"
                        params={{ id: row.st.id }}
                        className="whitespace-normal break-words font-semibold hover:underline"
                      >
                        {row.st.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 capitalize">{row.status.replace("_", " ")}</td>
                    <td className="px-3 py-2 text-right font-bold">{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SumStat({ label, value, tone }: { label: string; value: string | number; tone?: "emerald" | "rose" | "amber" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
  };
  const cls = tone ? map[tone] : "bg-background border-border text-foreground";
  return (
    <div className={`rounded-xl border p-2 ${cls}`}>
      <div className="text-lg font-black leading-none">{value}</div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}

function RoundHistory({
  open, onToggle, allPicks, allEvals, students, currentRoundNo, roundComplete,
}: {
  open: boolean;
  onToggle: () => void;
  allPicks: { student_id: string; round_no: number }[];
  allEvals: Evaluation[];
  students: Student[];
  currentRoundNo: number;
  roundComplete: boolean;
}) {
  const rounds = useMemo(() => {
    const set = new Set<number>();
    for (const p of allPicks) set.add(p.round_no);
    for (const e of allEvals) set.add(e.round_no);
    return Array.from(set).sort((a, b) => b - a);
  }, [allPicks, allEvals]);

  const [expanded, setExpanded] = useState<number | null>(null);

  if (rounds.length === 0) return null;

  return (
    <div className="card-soft">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">Round History</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
            {rounds.length}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-4">
          {rounds.map((rn) => {
            const rEvals = allEvals.filter((e) => e.round_no === rn);
            const asked = new Set([
              ...allPicks.filter((p) => p.round_no === rn).map((p) => p.student_id),
              ...rEvals.map((e) => e.student_id),
            ]);
            const isCurrent = rn === currentRoundNo;
            const done = isCurrent ? roundComplete : asked.size >= students.length && students.length > 0;
            const s = summarizeRound(students, rEvals);
            const isOpen = expanded === rn;
            return (
              <div key={rn} className="overflow-hidden rounded-2xl border border-border">
                <button
                  onClick={() => setExpanded(isOpen ? null : rn)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-secondary/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">Round {rn}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        done
                          ? "bg-emerald-100 text-emerald-700"
                          : isCurrent
                          ? "bg-primary/10 text-primary"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {done ? "Completed" : isCurrent ? "In Progress" : "Incomplete"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {asked.size}/{students.length} asked · {s.posPoints} pts · {s.notAnswered ? `${s.minusPoints} minus` : "no minus"}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border p-3">
                    {rEvals.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No evaluations recorded for this round yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {students
                          .map((st) => {
                            const list = rEvals.filter((e) => e.student_id === st.id);
                            if (list.length === 0) return null;
                            const pts = list.reduce((sum, e) => sum + (e.mark ?? 0), 0);
                            const status = list[0].status;
                            return (
                              <Link
                                key={st.id}
                                to="/students/$id"
                                params={{ id: st.id }}
                                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs transition hover:border-primary/40"
                              >
                                <span className="whitespace-normal break-words font-semibold">{st.name}</span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                  <span className="capitalize text-muted-foreground">{status.replace("_", " ")}</span>
                                  <span className="font-bold">{pts}</span>
                                </span>
                              </Link>
                            );
                          })
                          .filter(Boolean)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
