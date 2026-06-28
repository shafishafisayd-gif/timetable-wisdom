import { createFileRoute } from "@tanstack/react-router";
import { TEACHERS, getTeacherStats, CLASSES, SCHEDULE, DAYS, PERIODS, TEACHER_LOADS } from "@/data/timetable";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Stats · Malja'a Timetable" }] }),
  component: Stats,
});

function Stats() {
  // Aggregate
  let totalPeriods = 0;
  const subjects = new Set<string>();
  for (const d of DAYS) for (const p of PERIODS) for (const s of SCHEDULE[d][p]) {
    totalPeriods++;
    subjects.add(s.subject);
  }

  const sorted = [...TEACHERS].sort((a, b) => TEACHER_LOADS[b.code] - TEACHER_LOADS[a.code]);
  const max = sorted[0];
  const min = sorted[sorted.length - 1];
  const teachingHours = (totalPeriods * 40) / 60;

  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <h1 className="text-xl font-bold text-foreground">Statistics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">College-wide totals at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Big label="Teachers" value={TEACHERS.length} />
        <Big label="Classes" value={CLASSES.length} />
        <Big label="Subjects" value={subjects.size} />
        <Big label="Weekly Periods" value={totalPeriods} />
        <Big label="Teaching Hours" value={teachingHours.toFixed(0)} />
        <Big label="Avg / Day" value={(totalPeriods / 6).toFixed(1)} />
        <Big label="Top Teacher" value={max.code} sub={`${TEACHER_LOADS[max.code]} periods`} />
        <Big label="Lightest" value={min.code} sub={`${TEACHER_LOADS[min.code]} periods`} />
      </div>

      <div className="card-soft p-4">
        <h3 className="text-sm font-semibold text-foreground">Teacher Workload</h3>
        <div className="mt-4 space-y-3">
          {sorted.map((t) => {
            const stats = getTeacherStats(t.code);
            const pct = Math.round((TEACHER_LOADS[t.code] / TEACHER_LOADS[max.code]) * 100);
            return (
              <div key={t.code}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="font-semibold text-foreground">{t.fullName}</span>
                    <span className="text-muted-foreground">· {t.code}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{stats.totalWeeklyPeriods}p · {stats.totalClasses}cls</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: t.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Big({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card-soft p-4">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
