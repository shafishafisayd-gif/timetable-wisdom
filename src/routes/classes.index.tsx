import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Users, BookOpen, Clock, Activity } from "lucide-react";
import { CLASSES, SCHEDULE, DAYS, PERIODS, type ClassId } from "@/data/timetable";
import {
  fetchStudents,
  fetchEvaluations,
  computeStudentStats,
  type Evaluation,
} from "@/lib/students-api";
import {
  fetchSyllabusSettings,
  fetchSyllabusStatus,
  summarize,
} from "@/lib/syllabus-api";

export const Route = createFileRoute("/classes/")({
  head: () => ({ meta: [{ title: "Classes · Malja'a Timetable" }] }),
  component: ClassesIndex,
});

interface ClassMetrics {
  cls: ClassId;
  students: number;
  subjects: number;
  teachers: number;
  weekly: number;
  avgPoints: number;
  attendancePct: number;
  syllabusPct: number;
  activeRound: number;
}

function toneFor(pct: number) {
  if (pct >= 75) return { label: "Excellent", bar: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
  if (pct >= 50) return { label: "Good", bar: "bg-sky-500", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300" };
  if (pct > 0)  return { label: "Needs attention", bar: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300" };
  return { label: "No data", bar: "bg-muted", chip: "bg-secondary text-muted-foreground" };
}

function ClassesIndex() {
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const statusQ = useQuery({
    queryKey: ["syllabus_status", "all", settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () => fetchSyllabusStatus({ academicYear: settingsQ.data!.academic_year_name }),
  });
  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });
  const evalsQ = useQuery({ queryKey: ["evaluations", "all"], queryFn: () => fetchEvaluations() });

  const metrics = useMemo<ClassMetrics[]>(() => {
    const studentsByClass = new Map<ClassId, number>();
    for (const s of studentsQ.data ?? []) {
      studentsByClass.set(s.class_id, (studentsByClass.get(s.class_id) ?? 0) + 1);
    }
    const evalsByClass = new Map<string, Evaluation[]>();
    for (const e of evalsQ.data ?? []) {
      const arr = evalsByClass.get(e.class_id) ?? [];
      arr.push(e);
      evalsByClass.set(e.class_id, arr);
    }
    const statuses = statusQ.data ?? [];

    return CLASSES.map((cls) => {
      let weekly = 0;
      const subs = new Set<string>();
      const teachers = new Set<string>();
      const pairs: { className: ClassId; subject: string }[] = [];
      const pairSeen = new Set<string>();
      for (const d of DAYS) for (const p of PERIODS) {
        for (const s of SCHEDULE[d][p]) {
          if (s.className !== cls) continue;
          weekly++;
          subs.add(s.subject);
          teachers.add(s.teacher);
          const k = `${s.className}|${s.subject}`;
          if (!pairSeen.has(k)) { pairSeen.add(k); pairs.push({ className: cls, subject: s.subject }); }
        }
      }
      const evals = evalsByClass.get(cls) ?? [];
      let pointsSum = 0, attend = 0, asked = 0, maxRound = 0;
      const byStudent = new Map<string, Evaluation[]>();
      for (const e of evals) {
        asked++;
        if (e.status !== "absent") attend++;
        if (typeof e.mark === "number") pointsSum += e.mark;
        if (e.round_no > maxRound) maxRound = e.round_no;
        const arr = byStudent.get(e.student_id) ?? [];
        arr.push(e); byStudent.set(e.student_id, arr);
      }
      let totalStudentPoints = 0, evaluated = 0;
      for (const [, arr] of byStudent) {
        const st = computeStudentStats(arr);
        totalStudentPoints += st.totalPoints;
        evaluated++;
      }
      const avgPoints = evaluated ? totalStudentPoints / evaluated : 0;
      const attendancePct = asked ? Math.round((attend / asked) * 100) : 0;
      const syl = summarize(
        statuses.filter((s) => s.class_id === cls),
        pairs,
      );
      return {
        cls,
        students: studentsByClass.get(cls) ?? 0,
        subjects: subs.size,
        teachers: teachers.size,
        weekly,
        avgPoints,
        attendancePct,
        syllabusPct: syl.percent,
        activeRound: maxRound || 1,
      };
    });
  }, [studentsQ.data, evalsQ.data, statusQ.data]);

  const overall = useMemo(() => {
    const totalStudents = metrics.reduce((a, m) => a + m.students, 0);
    const avgSyl = metrics.length ? Math.round(metrics.reduce((a, m) => a + m.syllabusPct, 0) / metrics.length) : 0;
    const avgAtt = metrics.length ? Math.round(metrics.reduce((a, m) => a + m.attendancePct, 0) / metrics.length) : 0;
    const totalPeriods = metrics.reduce((a, m) => a + m.weekly, 0);
    return { totalStudents, avgSyl, avgAtt, totalPeriods };
  }, [metrics]);

  return (
    <div className="space-y-4">
      <div className="card-lift p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">Classes</h1>
            <p className="text-xs text-muted-foreground">Live class dashboard — tap any card to open its full workspace.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat icon={Users} label="Students" value={overall.totalStudents} />
          <MiniStat icon={Clock} label="Weekly Periods" value={overall.totalPeriods} />
          <MiniStat icon={Activity} label="Avg Attendance" value={`${overall.avgAtt}%`} />
          <MiniStat icon={BookOpen} label="Avg Syllabus" value={`${overall.avgSyl}%`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metrics.map((m) => {
          const tone = toneFor(Math.round((m.syllabusPct + m.attendancePct) / 2));
          return (
            <Link
              key={m.cls}
              to="/classes/$id"
              params={{ id: m.cls }}
              className="card-soft group relative overflow-hidden p-4 transition hover:shadow-[var(--shadow-lift)] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
                    {m.cls}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Class {m.cls}</div>
                    <div className="text-[11px] text-muted-foreground">{m.students} students · {m.teachers} teachers</div>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.chip}`}>{tone.label}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <Cell label="Subjects" value={m.subjects} />
                <Cell label="Weekly" value={m.weekly} />
                <Cell label="Round" value={`#${m.activeRound}`} />
                <Cell label="Avg Pts" value={m.avgPoints.toFixed(1)} />
                <Cell label="Attend" value={`${m.attendancePct}%`} />
                <Cell label="Syllabus" value={`${m.syllabusPct}%`} />
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Overall progress</span>
                  <span>{Math.round((m.syllabusPct + m.attendancePct) / 2)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${tone.bar}`}
                    style={{ width: `${Math.round((m.syllabusPct + m.attendancePct) / 2)}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-secondary/60 px-2 py-1.5 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
