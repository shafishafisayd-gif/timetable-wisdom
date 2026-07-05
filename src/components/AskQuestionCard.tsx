import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Check, X, UserX, Sparkles, RotateCcw, Coffee } from "lucide-react";
import {
  getCurrentStatus,
  jsDayToCode,
  textOn,
  type Teacher,
} from "@/data/timetable";
import { useNow } from "@/lib/use-now";
import {
  fetchStudents,
  fetchTodayRoundPicks,
  resetTodayRound,
  insertRoundPick,
  insertEvaluation,
  type Student,
} from "@/lib/students-api";

export function AskQuestionCard({ teacher }: { teacher: Teacher }) {
  const now = useNow();
  const status = getCurrentStatus(teacher.code, now);
  const day = jsDayToCode(now.getDay());
  const navigate = useNavigate();
  const qc = useQueryClient();

  const teaching = status.kind === "teaching" ? status : null;
  const classId = teaching?.slot.className;
  const subject = teaching?.slot.subject;
  const period = teaching?.period.period;

  const studentsQ = useQuery({
    queryKey: ["students", classId],
    queryFn: () => fetchStudents(classId!),
    enabled: !!classId,
  });

  const picksQ = useQuery({
    queryKey: ["daily_round_picks", teacher.code, classId, subject, new Date().toDateString()],
    queryFn: () => fetchTodayRoundPicks(teacher.code, classId!, subject!),
    enabled: !!classId && !!subject,
  });

  const [selected, setSelected] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => { setSelected(null); setShowMarks(false); }, [classId, subject]);

  const students = studentsQ.data ?? [];
  const pickedIds = useMemo(
    () => new Set((picksQ.data ?? []).map((p) => p.student_id)),
    [picksQ.data],
  );
  const remaining = useMemo(
    () => students.filter((s) => !pickedIds.has(s.id)),
    [students, pickedIds],
  );
  const roundComplete = students.length > 0 && remaining.length === 0;
  const askedToday = pickedIds.size;
  const fg = textOn(teacher.color);

  const invalidatePicks = () => {
    qc.invalidateQueries({ queryKey: ["daily_round_picks", teacher.code, classId, subject] });
  };

  const pickFromPool = useCallback(
    async (pool: Student[]) => {
      if (pool.length === 0) return null;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      await insertRoundPick({
        teacher_code: teacher.code,
        class_id: classId!,
        subject: subject!,
        student_id: chosen.id,
        round_no: 1, // daily rounds — round_no kept for schema compatibility
      });
      return chosen;
    },
    [teacher.code, classId, subject],
  );

  const pickRandom = async () => {
    if (busy || remaining.length === 0 || !classId) return;
    setBusy(true);
    try {
      const chosen = await pickFromPool(remaining);
      if (chosen) {
        setSelected(chosen);
        setShowMarks(false);
        invalidatePicks();
        navigate({
          to: "/classes/$id",
          params: { id: classId },
          search: { highlight: chosen.id } as never,
        }).catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };

  const resetRound = async () => {
    if (busy || !classId || !subject) return;
    setBusy(true);
    try {
      await resetTodayRound(teacher.code, classId, subject);
      setSelected(null);
      setShowMarks(false);
      invalidatePicks();
      setFlash("Round reset · everyone eligible again");
      setTimeout(() => setFlash(null), 2000);
    } finally {
      setBusy(false);
    }
  };

  const recordAnswered = async (mark: number) => {
    if (!selected) return;
    setBusy(true);
    try {
      await insertEvaluation({
        student_id: selected.id,
        teacher_code: teacher.code,
        class_id: classId!,
        subject: subject!,
        day: day!,
        period: period!,
        status: "answered",
        mark,
      });
      setFlash(`${selected.name.split(" ")[0]}: ${mark}/10 recorded`);
      setSelected(null);
      setShowMarks(false);
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      setTimeout(() => setFlash(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  const recordNotAnswered = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await insertEvaluation({
        student_id: selected.id,
        teacher_code: teacher.code,
        class_id: classId!,
        subject: subject!,
        day: day!,
        period: period!,
        status: "not_answered",
        mark: -1,
      });
      setFlash(`${selected.name.split(" ")[0]}: minus recorded`);
      setSelected(null);
      setShowMarks(false);
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      setTimeout(() => setFlash(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  const recordAbsent = async () => {
    if (!selected || !classId) return;
    setBusy(true);
    try {
      await insertEvaluation({
        student_id: selected.id,
        teacher_code: teacher.code,
        class_id: classId,
        subject: subject!,
        day: day!,
        period: period!,
        status: "absent",
        mark: null,
      });
      qc.invalidateQueries({ queryKey: ["evaluations"] });

      // Auto-pick another eligible student from the same class.
      const stillRemaining = remaining.filter((s) => s.id !== selected.id);
      const absentName = selected.name.split(" ")[0];
      const nextPick = await pickFromPool(stillRemaining);
      invalidatePicks();
      if (nextPick) {
        setSelected(nextPick);
        setShowMarks(false);
        setFlash(`${absentName} marked absent · ${nextPick.name.split(" ")[0]} picked next`);
        navigate({
          to: "/classes/$id",
          params: { id: classId },
          search: { highlight: nextPick.id } as never,
        }).catch(() => {});
      } else {
        setSelected(null);
        setShowMarks(false);
        setFlash(`${absentName} marked absent · round complete`);
      }
      setTimeout(() => setFlash(null), 2800);
    } finally {
      setBusy(false);
    }
  };

  // Non-teaching state (free / break / off)
  if (!teaching || !classId || !subject || period === undefined || !day) {
    let msg = "This card activates automatically when you're teaching a class.";
    let icon = <Sparkles className="h-5 w-5" />;
    if (status.kind === "free") msg = "No class scheduled for this period.";
    else if (status.kind === "break") {
      msg = `${status.breakSlot.label} Break — enjoy the pause.`;
      icon = <Coffee className="h-5 w-5" />;
    } else if (status.kind === "before") msg = "Classes haven't started yet.";
    else if (status.kind === "finished") msg = "Today's schedule is finished.";
    else if (status.kind === "off") msg = "It's a day off.";

    return (
      <div className="card-lift p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon} Ask Question
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
        <button
          disabled
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-4 text-base font-bold text-muted-foreground opacity-70"
        >
          <HelpCircle className="h-5 w-5" />
          Ask Question · unavailable
        </button>
      </div>
    );
  }

  return (
    <div className="card-lift overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: teacher.color }} />
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-5 w-5" /> Ask Question
          </div>
          <button
            onClick={resetRound}
            disabled={busy || askedToday === 0}
            title="Reset today's random selection — marks, minus and absents are kept"
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-secondary-foreground transition hover:bg-secondary/80 disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" /> Reset Round
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <div className="text-lg font-bold text-foreground">{subject}</div>
          <div className="text-sm text-muted-foreground">· Class {classId} · Today</div>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {remaining.length}/{students.length} students remaining · {askedToday} asked today
        </div>

        {flash && (
          <div className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">{flash}</div>
        )}

        {!selected && !roundComplete && (
          <button
            onClick={pickRandom}
            disabled={busy || studentsQ.isLoading || students.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-bold shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: teacher.color, color: fg }}
          >
            <HelpCircle className="h-5 w-5" />
            Ask Question · Pick Random Student
          </button>
        )}

        {roundComplete && !selected && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center">
            <div className="text-base font-bold text-primary">🎉 Today's Round Completed</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Every student in {classId} has been asked in {subject} today.
            </div>
            <button
              onClick={resetRound}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Reset Round
            </button>
          </div>
        )}

        {selected && (
          <div className="mt-4 space-y-3">
            <div
              className="rounded-2xl border-2 p-4 shadow-sm"
              style={{ borderColor: teacher.color, backgroundColor: teacher.color + "12" }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected Student</div>
              <div className="mt-1 text-lg font-bold text-foreground">{selected.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Adm #{selected.admission_no} · Class {selected.class_id}
              </div>
            </div>

            {/* Three permanent action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowMarks((v) => !v)}
                disabled={busy}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 ${
                  showMarks ? "bg-green-700 ring-2 ring-green-300" : "bg-green-600"
                }`}
              >
                <Check className="h-5 w-5" /> Give Mark
              </button>
              <button
                onClick={recordNotAnswered}
                disabled={busy}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-red-600 px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                <X className="h-5 w-5" /> Give Minus
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
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Assign mark (0–10)</div>
                <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                  {Array.from({ length: 11 }, (_, i) => i).map((m) => (
                    <button
                      key={m}
                      onClick={() => recordAnswered(m)}
                      disabled={busy}
                      className="rounded-xl bg-secondary py-2 text-sm font-bold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-50"
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowMarks(false)}
                  className="mt-2 text-xs font-medium text-muted-foreground underline"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={() => { setSelected(null); setShowMarks(false); }}
              className="w-full text-xs font-medium text-muted-foreground underline"
            >
              Skip / pick another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
