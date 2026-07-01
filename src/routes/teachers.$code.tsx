import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, BookOpen, Coffee, Maximize2, Download, Printer, Loader2 } from "lucide-react";
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
import { useNow } from "@/lib/use-now";

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

type Tab = "overview" | "today" | "weekly" | "syllabus";

function TeacherPage() {
  const { code } = Route.useParams();
  const teacher = TEACHER_BY_CODE[code]!;
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

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All teachers
      </Link>

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

      {/* Stats grid */}
      {tab === "overview" && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Weekly Periods" value={stats.totalWeeklyPeriods} />
        <StatCard label="Classes" value={stats.totalClasses} />
        <StatCard label="Subjects" value={stats.subjects.length} />
        <StatCard label="Teaching Hrs" value={`${(stats.totalWeeklyPeriods * 0.67).toFixed(1)}`} />
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
            <span className="text-xs text-muted-foreground">{sched[today] && Object.values(sched[today]).filter(Boolean).length} periods</span>
          </div>
          <div className="mt-3 space-y-2">
            {PERIOD_TIMES.map((pt) => {
              const slot = sched[today][pt.period];
              const nowMin = now.getHours() * 60 + now.getMinutes();
              const isNow = nowMin >= pt.startMin && nowMin < pt.endMin;
              const isPast = nowMin >= pt.endMin;
              return (
                <div
                  key={pt.period}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 transition ${
                    isNow ? "border-primary bg-primary/5" : isPast ? "border-border bg-secondary/40 opacity-70" : "border-border bg-card"
                  }`}
                >
                  <div className="grid h-10 min-w-[3.25rem] shrink-0 place-items-center rounded-xl bg-secondary px-2 text-[11px] font-bold text-secondary-foreground">
                    {PERIOD_LABELS[pt.period]}
                  </div>
                  <div className="min-w-0">
                    {slot ? (
                      <>
                        <div className="truncate text-sm font-semibold text-foreground">{slot.subject}</div>
                        <div className="text-xs text-muted-foreground">Class {slot.className}</div>
                      </>
                    ) : (
                      <div className="text-sm font-medium text-muted-foreground">Free Period</div>
                    )}
                  </div>
                  <div className="text-right text-[11px] font-medium text-muted-foreground">
                    {formatTime12(pt.start)}
                    <div className="text-muted-foreground/70">{formatTime12(pt.end)}</div>
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

      {tab === "syllabus" && <SyllabusViewer teacher={teacher} />}
    </div>
  );
}

function TabBar({ tab, setTab, hasSyllabus }: { tab: Tab; setTab: (t: Tab) => void; hasSyllabus: boolean }) {
  const items: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "today", label: "Today" },
    { id: "weekly", label: "Weekly" },
    ...(hasSyllabus ? [{ id: "syllabus" as Tab, label: "Monthly Syllabus" }] : []),
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
