import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, BookOpen, Coffee, Maximize2, Download, Printer, Loader2, LayoutGrid, ChevronRight, CheckCircle2, CircleDashed, PlayCircle, History as HistoryIcon } from "lucide-react";

import { BREAKS } from "@/data/timetable";
import {
  TEACHER_BY_CODE,
  getTeacherSchedule,
  getTeacherStats,
  getCurrentStatus,
  getRemainingPeriodsToday,
  getNextPeriodForTeacher,
  PERIODS,
  PERIOD_LABELS,
  DAYS,
  DAY_LABELS,
  PERIOD_TIMES,
  jsDayToCode,
  workloadPercent,
  formatTime12,
  textOn,
  type DayCode,
  type Teacher,
} from "@/data/timetable";
import { useTempVersion } from "@/lib/temp-timetable";
import { useNow } from "@/lib/use-now";
import { AskQuestionCard } from "@/components/AskQuestionCard";
import { setPreferredTeacher } from "@/lib/preferred-teacher";
import {
  buildAcademicMonths,
  fetchSyllabusHistory,
  fetchSyllabusSettings,
  fetchSyllabusStatus,
  getTeacherClassSubjects,
  MONTH_LONG,
  setSyllabusStatus,
  summarize,
  type SyllabusStatusValue,
} from "@/lib/syllabus-api";


export const Route = createFileRoute("/teachers/$code")({
  head: ({ params }) => {
    const t = TEACHER_BY_CODE[params.code];
    const title = t ? `${t.fullName} · Malja'a Timetable` : "Teacher";
    return {
      meta: [
        { title },
        { name: "description", content: t ? `Weekly timetable and live status for ${t.fullName}.` : "Teacher profile" },
      ],
    };
  },
  loader: ({ params }) => {
    if (!TEACHER_BY_CODE[params.code]) throw notFound();
    return null;
  },
  component: TeacherPage,
  notFoundComponent: () => (
    <div className="card-soft p-10 text-center">
      <p className="text-sm text-muted-foreground">Teacher not found.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">Back to teachers</Link>
    </div>
  ),
});

type Tab = "overview" | "today" | "weekly" | "syllabus" | "syllabus_pdf";

function TeacherPage() {
  const { code } = Route.useParams();
  const teacher = TEACHER_BY_CODE[code]!;
  useTempVersion();
  const now = useNow();
  const sched = getTeacherSchedule(code);
  const stats = getTeacherStats(code);
  const status = getCurrentStatus(code, now);
  const remaining = getRemainingPeriodsToday(code, now);
  const next = getNextPeriodForTeacher(code, now);
  const today = jsDayToCode(now.getDay());
  const workload = workloadPercent(code);
  const fg = textOn(teacher.color);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    setPreferredTeacher(code);
  }, [code]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/teachers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All teachers
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to="/timetable" className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground transition hover:bg-secondary/80">
            <LayoutGrid className="h-3.5 w-3.5" /> Overall Timetable
          </Link>
        </div>

      </div>


      {/* Header */}
      <div className="card-lift overflow-hidden">
        <div className="h-2" style={{ backgroundColor: teacher.color }} />
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-xl font-bold" style={{ backgroundColor: teacher.color, color: fg }}>
              {teacher.shortName}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold leading-tight">{teacher.fullName}</h1>
              <p className="text-sm text-muted-foreground">{teacher.position} · <span className="font-mono">{teacher.code}</span></p>
            </div>
          </div>

          {/* Workload bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Workload</span>
              <span className="font-semibold text-foreground">{workload}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full transition-all" style={{ width: `${workload}%`, backgroundColor: teacher.color }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabBar tab={tab} setTab={setTab} hasSyllabus={!!teacher.syllabusPdf} />

      {/* Now widget */}
      {tab === "overview" && (
      <NowCard teacher={teacher} status={status} next={next} remaining={remaining} today={today} />
      )}

      {/* Ask Question */}
      {tab === "overview" && <AskQuestionCard teacher={teacher} />}


      {/* Stats grid */}
      {tab === "overview" && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Assigned" value={stats.totalWeeklyPeriods} />
        <StatCard label="Subject Specified" value={stats.subjectSpecifiedPeriods} />
        <StatCard label="Not Specified" value={stats.subjectUnspecifiedPeriods} />
        <StatCard label="Teaching Hrs" value={`${(stats.totalWeeklyPeriods * 0.67).toFixed(1)}`} />
      </div>
      )}

      {tab === "overview" && (
      <div className="card-soft p-4">
        <h3 className="text-sm font-semibold text-foreground">Subject Breakdown</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Counted only where the official timetable writes a subject.</p>
        <div className="mt-3 space-y-1.5">
          {stats.subjectBreakdown.map((row) => (
            <div key={row.subject} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-xs">
              <span className="font-medium text-foreground">{row.subject}</span>
              <span className="font-bold text-foreground">{row.periods}</span>
            </div>
          ))}
          {stats.subjectUnspecifiedPeriods > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-border px-3 py-2 text-xs">
              <span className="font-medium italic text-muted-foreground">Sub N/S</span>
              <span className="font-bold text-foreground">{stats.subjectUnspecifiedPeriods}</span>
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">Total Assigned</span>
            <span className="font-bold text-foreground">{stats.totalWeeklyPeriods}</span>
          </div>
        </div>
      </div>
      )}

      {/* Subjects + classes */}
      {tab === "overview" && (
      <div className="card-soft p-4">
        <h3 className="text-sm font-semibold text-foreground">Teaches</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.subjects.map((s) => (
            <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{s}</span>
          ))}
        </div>
        <h3 className="mt-4 text-sm font-semibold text-foreground">Classes Assigned</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.classesAssigned.map((c) => (
            <span key={c} className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: teacher.color, color: fg }}>{c}</span>
          ))}
        </div>
      </div>
      )}

      {/* Today's timetable */}
      {(tab === "overview" || tab === "today") && today && (
        <section className="card-soft p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Today · {DAY_LABELS[today]}</h3>
            <span className="text-xs text-muted-foreground">
              {sched[today] && Object.values(sched[today]).filter(Boolean).length} periods
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              ...PERIOD_TIMES.map((pt) => ({ kind: "period" as const, pt })),
              ...BREAKS.map((br) => ({ kind: "break" as const, br })),
            ]
              .sort((a, b) => (a.kind === "period" ? a.pt.startMin : a.br.startMin) - (b.kind === "period" ? b.pt.startMin : b.br.startMin))
              .map((entry, idx) => {
                const nowMin = now.getHours() * 60 + now.getMinutes();
                if (entry.kind === "break") {
                  const br = entry.br;
                  const isNow = nowMin >= br.startMin && nowMin < br.endMin;
                  const isPast = nowMin >= br.endMin;
                  return (
                    <div
                      key={`br-${idx}`}
                      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 transition ${
                        isNow ? "border-warning bg-warning/10" : isPast ? "border-border bg-secondary/40 opacity-70" : "border-border/60 bg-secondary/20"
                      }`}
                    >
                      <div className="grid h-10 min-w-[3.25rem] shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Coffee className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{br.label} Break</div>
                        <StatusChip label={isNow ? "Now" : isPast ? "Finished" : "Upcoming"} tone={isNow ? "now" : isPast ? "past" : "upcoming"} />
                      </div>
                      <div className="text-right text-[11px] font-medium text-muted-foreground">
                        {formatTime12(br.start)}
                        <div className="text-muted-foreground/70">{formatTime12(br.end)}</div>
                      </div>
                    </div>
                  );
                }
                const pt = entry.pt;
                const slot = sched[today][pt.period];
                const isNow = nowMin >= pt.startMin && nowMin < pt.endMin;
                const isPast = nowMin >= pt.endMin;
                const isFree = !slot;
                const label = isFree
                  ? isPast ? "Finished" : isNow ? "Free Now" : "Free Period"
                  : isPast ? "Completed" : isNow ? "Teaching Now" : "Upcoming";
                const tone = isNow ? "now" : isPast ? "past" : isFree ? "free" : "upcoming";
                const cardColor = slot ? teacher.color : undefined;
                const cardFg = slot ? textOn(teacher.color) : undefined;
                const countdownMin = !isPast && !isNow ? pt.startMin - nowMin : null;
                return (
                  <div
                    key={`p-${pt.period}`}
                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 transition ${
                      isNow && slot ? "border-transparent shadow-sm" : isNow ? "border-primary bg-primary/5" : isPast ? "border-border bg-secondary/40 opacity-70" : "border-border bg-card"
                    }`}
                    style={isNow && slot ? { backgroundColor: cardColor, color: cardFg, borderColor: cardColor } : undefined}
                  >
                    <div
                      className="grid h-10 min-w-[3.25rem] shrink-0 place-items-center rounded-xl px-2 text-[11px] font-bold"
                      style={
                        isNow && slot
                          ? { backgroundColor: "rgba(255,255,255,0.22)", color: cardFg }
                          : undefined
                      }
                    >
                      <span className={isNow && slot ? "" : "text-secondary-foreground"}>{PERIOD_LABELS[pt.period]}</span>
                    </div>
                    <div className="min-w-0">
                      {slot ? (
                        <>
                          <div className="truncate text-sm font-semibold">{slot.subject}</div>
                          <div className={`text-xs ${isNow ? "opacity-90" : "text-muted-foreground"}`}>Class {slot.className}</div>
                        </>
                      ) : (
                        <div className="text-sm font-medium text-muted-foreground">Free Period</div>
                      )}
                      <div className="mt-1 flex items-center gap-1.5">
                        <StatusChip label={label} tone={tone} inverse={isNow && !!slot} />
                        {countdownMin !== null && countdownMin > 0 && countdownMin <= 60 && (
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            in {countdownMin < 60 ? `${countdownMin}m` : `${Math.floor(countdownMin / 60)}h ${countdownMin % 60}m`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`text-right text-[11px] font-medium ${isNow && slot ? "" : "text-muted-foreground"}`}>
                      {formatTime12(pt.start)}
                      <div className={isNow && slot ? "opacity-80" : "text-muted-foreground/70"}>{formatTime12(pt.end)}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}


      {/* Weekly timetable */}
      {(tab === "overview" || tab === "weekly") && (
      <section className="card-soft p-4">
        <h3 className="text-sm font-semibold text-foreground">Weekly Timetable</h3>
        <div className="mt-3 -mx-4 overflow-x-auto hide-scrollbar px-4">
          <table className="w-full min-w-[680px] border-separate border-spacing-1.5">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 rounded-xl bg-secondary px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Day</th>
                {PERIODS.map((p) => (
                  <th key={p} className="rounded-xl bg-secondary px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{PERIOD_LABELS[p]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => (
                <tr key={d}>
                  <td className="sticky left-0 z-10 rounded-xl bg-secondary px-2 py-2 text-xs font-semibold text-foreground">{d}</td>
                  {PERIODS.map((p) => {
                    const slot = sched[d][p];
                    return (
                      <td key={p} className="align-top">
                        {slot ? (
                          <div className="rounded-xl px-2 py-1.5 text-[11px] font-semibold shadow-sm" style={{ backgroundColor: teacher.color, color: fg }}>
                            <div className="font-bold">{slot.className}</div>
                            <div className="opacity-90">{slot.subject}</div>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-secondary/40 px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground">FREE</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {tab === "syllabus" && <SyllabusTracker teacher={teacher} />}
      {tab === "syllabus_pdf" && <SyllabusViewer teacher={teacher} />}
    </div>
  );
}

function TabBar({ tab, setTab, hasSyllabus }: { tab: Tab; setTab: (t: Tab) => void; hasSyllabus: boolean }) {
  const items: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "today", label: "Today" },
    { id: "weekly", label: "Weekly" },
    { id: "syllabus", label: "Syllabus" },
    ...(hasSyllabus ? [{ id: "syllabus_pdf" as Tab, label: "Syllabus PDF" }] : []),
  ];
  return (
    <div className="card-soft -mx-1 flex gap-1.5 overflow-x-auto p-1.5 hide-scrollbar">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => setTab(it.id)}
          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            tab === it.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function SyllabusTracker({ teacher }: { teacher: Teacher }) {
  const qc = useQueryClient();
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const statusQ = useQuery({
    queryKey: ["syllabus_status", teacher.code, settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () =>
      fetchSyllabusStatus({
        teacherCode: teacher.code,
        academicYear: settingsQ.data!.academic_year_name,
      }),
  });
  const historyQ = useQuery({
    queryKey: ["syllabus_history", teacher.code, settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () =>
      fetchSyllabusHistory({
        teacherCode: teacher.code,
        academicYear: settingsQ.data!.academic_year_name,
        limit: 30,
      }),
  });

  const pairs = useMemo(() => getTeacherClassSubjects(teacher.code), [teacher.code]);
  const months = useMemo(
    () =>
      settingsQ.data
        ? buildAcademicMonths(settingsQ.data.start_month, settingsQ.data.end_month)
        : [],
    [settingsQ.data],
  );

  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: {
      class_id: string;
      subject: string;
      month: number;
      status: SyllabusStatusValue;
    }) =>
      setSyllabusStatus({
        class_id: input.class_id,
        subject: input.subject,
        teacher_code: teacher.code,
        month: input.month,
        academic_year: settingsQ.data!.academic_year_name,
        status: input.status,
        updated_by: teacher.code,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["syllabus_status"] });
      qc.invalidateQueries({ queryKey: ["syllabus_history"] });
    },
  });

  if (settingsQ.isLoading || !settingsQ.data) {
    return (
      <div className="card-soft flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statuses = statusQ.data ?? [];
  const overall = summarize(statuses, pairs);
  const settings = settingsQ.data;

  return (
    <div className="space-y-3">
      <div className="card-soft p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Syllabus Progress</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Academic Year <span className="font-semibold text-foreground">{settings.academic_year_name}</span>
              {" · "}
              {MONTH_LONG[settings.start_month - 1]} → {MONTH_LONG[settings.end_month - 1]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              <HistoryIcon className="h-3.5 w-3.5" /> History
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall completion</span>
            <span className="font-semibold text-foreground">
              {overall.completed}/{overall.total} ({overall.percent}%)
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${overall.percent}%`, backgroundColor: teacher.color }}
            />
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="card-soft p-3">
          <h4 className="mb-2 text-xs font-semibold text-foreground">Recent Updates</h4>
          {historyQ.data && historyQ.data.length > 0 ? (
            <ul className="space-y-1.5">
              {historyQ.data.map((h) => (
                <li key={h.id} className="rounded-lg bg-secondary/40 px-2.5 py-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {h.class_id} · {h.subject}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(h.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    {MONTH_LONG[h.month - 1]} · {h.previous_status ?? "—"} → <span className="font-semibold text-foreground">{h.new_status}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">No history yet.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {months.map((m) => {
          const monthStatuses = statuses.filter((s) => s.month === m.month);
          const sum = summarize(monthStatuses, pairs);
          const isOpen = openMonth === m.month;
          return (
            <div key={m.month} className="card-soft overflow-hidden">
              <button
                onClick={() => setOpenMonth(isOpen ? null : m.month)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-secondary/40"
              >
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] font-bold uppercase"
                  style={{ backgroundColor: teacher.color, color: textOn(teacher.color) }}
                >
                  {m.monthName}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{m.monthLong}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full" style={{ width: `${sum.percent}%`, backgroundColor: teacher.color }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-foreground">{sum.percent}%</div>
                  <div className="text-[10px] text-muted-foreground">
                    {sum.completed}/{sum.total} done
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-90" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-border bg-secondary/20 p-3">
                  {pairs.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">No class-subject assignments.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {pairs.map((p) => {
                        const rowStatus =
                          (monthStatuses.find((s) => s.class_id === p.className && s.subject === p.subject)?.status ??
                            "not_started") as SyllabusStatusValue;
                        return (
                          <li key={`${p.className}|${p.subject}`} className="rounded-xl bg-card p-2.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="rounded-md px-2 py-0.5 text-[11px] font-bold"
                                style={{ backgroundColor: teacher.color, color: textOn(teacher.color) }}
                              >
                                {p.className}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{p.subject}</span>
                              <StatusPill status={rowStatus} />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(["not_started", "in_progress", "completed"] as SyllabusStatusValue[]).map((s) => (
                                <button
                                  key={s}
                                  disabled={mutation.isPending || rowStatus === s}
                                  onClick={() =>
                                    mutation.mutate({
                                      class_id: p.className,
                                      subject: p.subject,
                                      month: m.month,
                                      status: s,
                                    })
                                  }
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                                    rowStatus === s
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                  } disabled:opacity-60`}
                                >
                                  {s === "not_started" ? <CircleDashed className="h-3 w-3" /> : s === "in_progress" ? <PlayCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                  {statusLabel(s)}
                                </button>
                              ))}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function statusLabel(s: SyllabusStatusValue) {
  if (s === "not_started") return "Not Started";
  if (s === "in_progress") return "In Progress";
  return "Completed";
}

function StatusPill({ status }: { status: SyllabusStatusValue }) {
  const cls =
    status === "completed"
      ? "bg-green-500/15 text-green-700"
      : status === "in_progress"
        ? "bg-amber-500/15 text-amber-700"
        : "bg-secondary text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}

function SyllabusViewer({ teacher }: { teacher: Teacher }) {
  const url = teacher.syllabusPdf!;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let createdUrl: string | null = null;
    setBlobUrl(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const blob = await res.blob();
        const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
        createdUrl = URL.createObjectURL(pdfBlob);
        if (!revoked) setBlobUrl(createdUrl);
      } catch (e) {
        if (!revoked) setError(e instanceof Error ? e.message : "Could not load syllabus");
      }
    })();
    return () => {
      revoked = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url]);

  const openFs = () => window.open(blobUrl ?? url, "_blank", "noopener,noreferrer");
  const printIt = () => {
    const w = window.open(blobUrl ?? url, "_blank");
    if (w) w.addEventListener("load", () => w.print());
  };

  return (
    <section className="card-soft overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Monthly Syllabus</h3>
          <p className="text-xs text-muted-foreground">{teacher.fullName} · June – October</p>
        </div>
        <div className="flex gap-1.5">
          <a
            href={url}
            download={`${teacher.code}-syllabus.pdf`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/80"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
          <button
            onClick={printIt}
            disabled={!blobUrl}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:bg-secondary/80 disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            onClick={openFs}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Open
          </button>
        </div>
      </div>
      <div className="bg-secondary/30">
        {error ? (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">Couldn't preview the PDF here. {error}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Open syllabus in new tab
            </a>
          </div>
        ) : !blobUrl ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <object data={`${blobUrl}#view=FitH`} type="application/pdf" className="h-[80vh] w-full">
            <iframe src={blobUrl} title={`${teacher.fullName} monthly syllabus`} className="h-[80vh] w-full" />
          </object>
        )}
      </div>
    </section>
  );
}


function StatusChip({ label, tone, inverse }: { label: string; tone: "now" | "past" | "upcoming" | "free"; inverse?: boolean }) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
  if (inverse) return <span className={`${base} bg-white/25 text-white`}>{label}</span>;
  const toneCls =
    tone === "now" ? "bg-green-500/15 text-green-700"
      : tone === "past" ? "bg-secondary text-muted-foreground"
      : tone === "free" ? "bg-amber-500/15 text-amber-700"
      : "bg-primary/10 text-primary";
  return <span className={`${base} ${toneCls}`}>{label}</span>;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card-soft p-3 text-center">
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function NowCard({
  teacher, status, next, remaining, today,
}: {
  teacher: Teacher;
  status: ReturnType<typeof getCurrentStatus>;
  next: ReturnType<typeof getNextPeriodForTeacher>;
  remaining: number;
  today: DayCode | null;
}) {
  let title = "";
  let body: React.ReactNode = null;
  let bg = "bg-secondary";
  let fg = "text-foreground";
  let icon: React.ReactNode = <Clock className="h-5 w-5" />;

  if (status.kind === "teaching") {
    title = "Teaching Now";
    bg = ""; fg = "text-white";
    icon = <BookOpen className="h-5 w-5" />;
    body = (
      <div className="mt-1.5">
        <div className="text-2xl font-bold leading-tight">{status.slot.subject}</div>
        <div className="text-sm opacity-90">Class {status.slot.className} · {PERIOD_LABELS[status.period.period]} · {formatTime12(status.period.start)}–{formatTime12(status.period.end)}</div>
      </div>
    );
  } else if (status.kind === "free") {
    title = "Free Period";
    body = <div className="mt-1 text-sm opacity-80">{PERIOD_LABELS[status.period.period]} · {formatTime12(status.period.start)}–{formatTime12(status.period.end)}</div>;
  } else if (status.kind === "break") {
    title = status.breakSlot.label + " Break";
    icon = <Coffee className="h-5 w-5" />;
    body = <div className="mt-1 text-sm opacity-80">{formatTime12(status.breakSlot.start)} – {formatTime12(status.breakSlot.end)}</div>;
  } else if (status.kind === "before") {
    title = "Before classes";
    body = <div className="mt-1 text-sm opacity-80">Day starts at {formatTime12(status.nextPeriod.start)}</div>;
  } else if (status.kind === "finished") {
    title = "Finished for Today";
    body = <div className="mt-1 text-sm opacity-80">{today ? DAY_LABELS[today] : ""} schedule completed</div>;
  } else {
    title = "Day Off";
    body = <div className="mt-1 text-sm opacity-80">No classes scheduled today</div>;
  }

  const isTeaching = status.kind === "teaching";
  return (
    <div
      className={`card-lift overflow-hidden p-5 ${isTeaching ? "" : bg} ${isTeaching ? "" : fg}`}
      style={isTeaching ? { backgroundColor: teacher.color, color: textOn(teacher.color) } : undefined}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
        {icon} {title}
      </div>
      {body}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {next ? (
          <div className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
            Next: {PERIOD_LABELS[next.period.period]} · {next.slot.className} · {next.slot.subject}
          </div>
        ) : (
          <div className="rounded-full bg-white/15 px-3 py-1">No more classes today</div>
        )}
        <div className="rounded-full bg-white/15 px-3 py-1">{remaining} periods left</div>
      </div>
    </div>
  );
}
