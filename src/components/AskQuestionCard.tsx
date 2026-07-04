import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Check, X, UserX, Sparkles, RotateCcw } from "lucide-react";
import {
  getCurrentStatus,
  jsDayToCode,
  textOn,
  type Teacher,
} from "@/data/timetable";
import { useNow } from "@/lib/use-now";
import {
  fetchStudents,
  fetchRoundPicks,
  fetchCurrentRoundNo,
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

  const roundQ = useQuery({
    queryKey: ["round_no", teacher.code, classId, subject],
    queryFn: () => fetchCurrentRoundNo(teacher.code, classId!, subject!),
    enabled: !!classId && !!subject,
  });

  const roundNo = roundQ.data ?? 1;

  const picksQ = useQuery({
    queryKey: ["round_picks", teacher.code, classId, subject, roundNo],
    queryFn: () => fetchRoundPicks(teacher.code, classId!, subject!, roundNo),
    enabled: !!classId && !!subject && !!roundNo,
  });

  const [selected, setSelected] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Reset selection when context changes
  useEffect(() => { setSelected(null); setShowMarks(false); }, [classId, subject]);

  const students = studentsQ.data ?? [];
  const pickedIds = useMemo(() => new Set((picksQ.data ?? []).map((p) => p.student_id)), [picksQ.data]);
  const remaining = students.filter((s) => !pickedIds.has(s.id));
  const roundComplete = students.length > 0 && remaining.length === 0;
  const fg = textOn(teacher.color);

  if (!teaching || !classId || !subject || !period === undefined || !day) {
    return (
      <div className="card-lift p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-5 w-5" /> Ask Question
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          This card activates automatically when you're teaching a class. Come back during a live period to pick a student.
        </p>
      </div>
    );
  }

  const pickRandom = async () => {
    if (busy || remaining.length === 0) return;
    setBusy(true);
    try {
      const chosen = remaining[Math.floor(Math.random() * remaining.length)];
      await insertRoundPick({
        teacher_code: teacher.code,
        class_id: classId!,
        subject: subject!,
        student_id: chosen.id,
        round_no: roundNo,
      });
      setSelected(chosen);
      setShowMarks(false);
      qc.invalidateQueries({ queryKey: ["round_picks", teacher.code, classId, subject, roundNo] });
      navigate({
        to: "/classes/$id",
        params: { id: classId! },
        search: { highlight: chosen.id } as never,
      }).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const startNewRound = async () => {
    // just bump: next pick will be under roundNo + 1 — we set state locally by inserting a marker? Simpler: force a new round by refetching from server with roundNo + 1.
    // We achieve this by writing a placeholder pick? Actually simpler: increment via the round_no cache.
    // We'll insert a client-side "virtual" bump by refetching with round_no+1 as base — but we need server truth.
    // Approach: overwrite the round query cache with roundNo+1 and clear picks list.
    qc.setQueryData(["round_no", teacher.code, classId, subject], roundNo + 1);
    qc.setQueryData(["round_picks", teacher.code, classId, subject, roundNo + 1], []);
    setSelected(null);
    setShowMarks(false);
    setFlash(`Round ${roundNo + 1} started`);
    setTimeout(() => setFlash(null), 2000);
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
      setFlash(`${selected.name.split(" ")[0]}: -1 recorded`);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      setTimeout(() => setFlash(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  const recordAbsent = async () => {
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
        status: "absent",
        mark: null,
      });
      setFlash(`${selected.name.split(" ")[0]}: absent`);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      setTimeout(() => setFlash(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-lift overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: teacher.color }} />
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-5 w-5" /> Ask Question
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <div className="text-lg font-bold text-foreground">{subject}</div>
          <div className="text-sm text-muted-foreground">
            · Class {classId} · Round {roundNo}
          </div>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {remaining.length}/{students.length} students remaining this round
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
            <div className="text-base font-bold text-primary">🎉 Round {roundNo} Completed</div>
            <div className="mt-1 text-xs text-muted-foreground">Every student in {classId} has been asked in {subject}.</div>
            <button
              onClick={startNewRound}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Start New Round
            </button>
          </div>
        )}

        {selected && (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border-2 p-4 shadow-sm" style={{ borderColor: teacher.color, backgroundColor: teacher.color + "12" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected Student</div>
              <div className="mt-1 text-lg font-bold text-foreground">{selected.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Adm #{selected.admission_no} · Class {selected.class_id}</div>
            </div>

            {!showMarks ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setShowMarks(true)}
                  disabled={busy}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-green-600 px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  <Check className="h-5 w-5" /> Answered
                </button>
                <button
                  onClick={recordNotAnswered}
                  disabled={busy}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-red-600 px-3 py-3 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
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
            ) : (
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
