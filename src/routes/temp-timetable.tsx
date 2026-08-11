import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Coffee, RotateCcw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  CLASSES,
  DAY_LABELS,
  PERIOD_LABELS,
  TIMETABLE_COLUMNS,
  TEACHER_BY_CODE,
  SCHEDULE,
  formatTime12,
  jsDayToCode,
  localDateKey,
  textOn,
  CLASS_BREAKS,
  CLASS_ACTIVITIES,
  type ClassId,
  type PeriodNum,
} from "@/data/timetable";
import {
  clearTempOverrides,
  deleteTempOverride,
  fetchTempOverrides,
  saveTempOverrides,
  subjectsForClass,
  upsertTempOverride,
} from "@/lib/temp-timetable";
import { useNow } from "@/lib/use-now";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/temp-timetable")({
  head: () => ({
    meta: [
      { title: "Temporary Timetable · Malja'a" },
      {
        name: "description",
        content: "Make one-day timetable changes without touching the permanent 2026–27 timetable.",
      },
      { property: "og:title", content: "Temporary Timetable · Malja'a" },
      {
        property: "og:description",
        content: "One-day timetable overrides that expire automatically at midnight.",
      },
    ],
  }),
  component: TempTimetablePage;
});

type EditTarget = {
  cls: ClassId;
  period: PeriodNum;
  time: string;
  teacher: string;
  permanentSubject: string;
  currentSubject: string;
};

function TempTimetablePage() {
  const now = useNow(60_000);
  const date = localDateKey(now);
  const day = jsDayToCode(now.getDay());
  const qc = useQueryClient();

  const overridesQ = useQuery({
    queryKey: ["temp_timetable", date],
    queryFn: () => fetchTempOverrides(date),
  });

  const overrideMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of overridesQ.data ?? []) m.set(`${o.class_id}|${o.period}`, o.subject);
    return m;
  }, [overridesQ.data]);

  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [choice, setChoice] = useState<string>("");

  const applyM = useMutation({
    mutationFn: async (t: EditTarget & { subject: string }) => {
      if (!day) return;
      if (t.subject === t.permanentSubject) {
        await deleteTempOverride(date, t.cls, t.period);
        return;
      }
      await upsertTempOverride({
        override_date: date,
        day_code: day,
        class_id: t.cls,
        period: t.period,
        subject: t.subject,
        teacher_code: t.teacher,
        original_subject: t.permanentSubject,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["temp_timetable"] });
      setEdit(null);
      toast.success("Temporary change applied for today");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveM = useMutation({
    mutationFn: async () => {
      if (!day) return;
      await saveTempOverrides(
        date,
        day,
        (overridesQ.data ?? []).map((o) => ({
          class_id: o.class_id as ClassId,
          period: o.period as PeriodNum,
          subject: o.subject,
          teacher_code: o.teacher_code,
          original_subject: o.original_subject,
        })),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["temp_timetable"] });
      toast.success("Temporary timetable saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetM = useMutation({
    mutationFn: () => clearTempOverrides(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["temp_timetable"] });
      toast.success("Today's temporary changes removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (!day) {
    return (
      <div className="card-soft p-5">
        <h1 className="text-xl font-bold text-foreground">Temporary Timetable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {dateLabel} — no classes are scheduled today, so there is nothing to override.
        </p>
        <Link to="/timetable" className="mt-4 inline-block text-sm font-semibold text-primary">
          Back to Overall Timetable
        </Link>
      </div>
    );
  }

  const changeCount = overrideMap.size;

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground">Temporary Timetable</h1>
            <p className="text-xs text-muted-foreground">
              {dateLabel} · {DAY_LABELS[day]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Changes apply to today only. The permanent 2026–27 timetable is never modified and
              returns automatically tomorrow.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              changeCount
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {changeCount ? `${changeCount} temporary change${changeCount > 1 ? "s" : ""} active` : "No temporary changes"}
          </span>
          <button
            onClick={() => saveM.mutate()}
            disabled={saveM.isPending || !changeCount}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> Save Temporary Timetable
          </button>
          <button
            onClick={() => resetM.mutate()}
            disabled={resetM.isPending || !changeCount}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Changes
          </button>
        </div>
      </div>

      <div className="card-soft p-2 sm:p-3">
        <div
          className="overflow-x-auto overscroll-x-contain rounded-xl"
          style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
        >
          <table className="w-full min-w-max border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 rounded-lg bg-secondary px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm">
                  Class
                </th>
                {TIMETABLE_COLUMNS.map((col, i) =>
                  col.type === "period" ? (
                    <th
                      key={`h-p-${i}`}
                      className="sticky top-0 z-10 rounded-lg bg-secondary px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-sm"
                    >
                      <div className="whitespace-nowrap">{PERIOD_LABELS[col.period.period]}</div>
                      <div className="whitespace-nowrap font-normal text-[9px] text-muted-foreground/80">
                        {formatTime12(col.period.start)}
                      </div>
                    </th>
                  ) : (
                    <th
                      key={`h-b-${i}`}
                      className="sticky top-0 z-10 rounded-lg bg-primary/10 px-1.5 py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-primary/80 shadow-sm"
                    >
                      <Coffee className="mx-auto h-3 w-3" />
                      <div className="mt-0.5 whitespace-nowrap">{col.brk.label}</div>
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((cls) => (
                <tr key={cls}>
                  <td className="sticky left-0 z-10 rounded-lg bg-primary px-2 py-2 text-center text-xs font-bold text-primary-foreground shadow-sm">
                    {cls}
                  </td>
                  {TIMETABLE_COLUMNS.map((col, i) => {
                    if (col.type === "break") {
                      return (
                        <td key={`c-b-${cls}-${i}`} className="align-middle">
                          <div className="grid h-full min-h-[44px] w-6 place-items-center rounded-lg bg-primary/5">
                            <div
                              className="rotate-180 whitespace-nowrap text-[8px] font-semibold uppercase tracking-wider text-primary/60"
                              style={{ writingMode: "vertical-rl" }}
                            >
                              Break
                            </div>
                          </div>
                        </td>
                      );
                    }
                    const p = col.period.period;
                    const permanent = SCHEDULE[day][p].find((s) => s.className === cls);

                    if (!permanent) {
                      if (CLASS_BREAKS[day][cls] === p) {
                        return (
                          <td key={`c-p-${cls}-${i}`} className="align-top">
                            <div className="min-w-[92px] rounded-lg bg-primary/10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-primary/80">
                              Break
                            </div>
                          </td>
                        );
                      }
                      const label = CLASS_ACTIVITIES[day][cls][p];
                      return (
                        <td key={`c-p-${cls}-${i}`} className="align-top">
                          <div
                            className={`min-w-[92px] rounded-lg px-2 py-2 text-center text-[10px] font-semibold ${
                              label
                                ? "bg-secondary text-secondary-foreground"
                                : "bg-secondary/40 font-medium text-muted-foreground"
                            }`}
                          >
                            {label ?? "FREE"}
                          </div>
                        </td>
                      );
                    }

                    const override = overrideMap.get(`${cls}|${p}`);
                    const subject = override ?? permanent.subject;
                    const teacher = TEACHER_BY_CODE[permanent.teacher];
                    const color = teacher?.color ?? "#64748B";

                    return (
                      <td key={`c-p-${cls}-${i}`} className="align-top">
                        <button
                          onClick={() => {
                            setChoice(subject);
                            setEdit({
                              cls,
                              period: p,
                              time: `${formatTime12(col.period.start)} – ${formatTime12(col.period.end)}`,
                              teacher: permanent.teacher,
                              permanentSubject: permanent.subject,
                              currentSubject: subject,
                            });
                          }}
                          className={`block w-full min-w-[92px] rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold shadow-sm transition active:scale-95 ${
                            override ? "ring-2 ring-amber-500 ring-offset-1 ring-offset-card" : ""
                          }`}
                          style={{ backgroundColor: color, color: textOn(color) }}
                        >
                          <div
                            className={`font-bold leading-tight ${
                              permanent.subjectSpecified || override ? "truncate" : "italic opacity-80"
                            }`}
                          >
                            {permanent.subjectSpecified || override ? subject : "Subject not specified"}
                          </div>
                          <div className="flex items-center gap-1 leading-tight opacity-90">
                            <span>{permanent.teacher}</span>
                            {override && (
                              <span className="rounded bg-amber-500 px-1 text-[8px] font-bold text-white">
                                TEMP
                              </span>
                            )}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change subject for today</DialogTitle>
            <DialogDescription>
              This override applies only to {dateLabel}. The permanent timetable stays unchanged.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info label="Day" value={DAY_LABELS[day]} />
                <Info label="Class" value={edit.cls} />
                <Info label="Period" value={PERIOD_LABELS[edit.period]} />
                <Info label="Time" value={edit.time} />
                <Info label="Teacher" value={TEACHER_BY_CODE[edit.teacher]?.name ?? edit.teacher} />
                <Info label="Current subject" value={edit.currentSubject} />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Replacement subject (valid for {edit.cls})
                </label>
                <select
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={edit.permanentSubject}>
                    {edit.permanentSubject} (permanent)
                  </option>
                  {subjectsForClass(edit.cls)
                    .filter((s) => s !== edit.permanentSubject)
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Only subjects already taught to {edit.cls} can be
                  selected.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <button
              onClick={() => setEdit(null)}
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => edit && applyM.mutate({ ...edit, subject: choice })}
              disabled={applyM.isPending}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-2.5 py-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-xs font-semibold text-foreground break-words">{value}</div>
    </div>
  );
}
