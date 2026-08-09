import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GraduationCap } from "lucide-react";
import {
  CLASSES,
  SCHEDULE,
  DAYS,
  PERIODS,
  PERIOD_TIMES,
  jsDayToCode,
  type ClassId,
} from "@/data/timetable";
import { fetchStudents } from "@/lib/students-api";
import {
  fetchSyllabusSettings,
  fetchSyllabusStatus,
  summarize,
} from "@/lib/syllabus-api";
import { useNow } from "@/lib/use-now";

export const Route = createFileRoute("/classes/")({
  head: () => ({ meta: [{ title: "Classes · Malja'a Timetable" }] }),
  component: ClassesIndex,
});

function ClassesIndex() {
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const statusQ = useQuery({
    queryKey: ["syllabus_status", "all", settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () => fetchSyllabusStatus({ academicYear: settingsQ.data!.academic_year_name }),
  });
  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });

  const now = useNow(30_000);
  const day = jsDayToCode(now.getDay());
  const mins = now.getHours() * 60 + now.getMinutes();
  const currentPeriod = PERIOD_TIMES.find((p) => mins >= p.startMin && mins < p.endMin) ?? null;

  const cards = useMemo(() => {
    const studentsByClass = new Map<ClassId, number>();
    for (const s of studentsQ.data ?? []) {
      studentsByClass.set(s.class_id, (studentsByClass.get(s.class_id) ?? 0) + 1);
    }
    const statuses = statusQ.data ?? [];

    return CLASSES.map((cls) => {
      const pairs: { className: ClassId; subject: string }[] = [];
      const seen = new Set<string>();
      for (const d of DAYS) for (const p of PERIODS) {
        for (const s of SCHEDULE[d][p]) {
          if (s.className !== cls || !s.subjectSpecified) continue;
          const k = `${s.className}|${s.subject}`;
          if (!seen.has(k)) { seen.add(k); pairs.push({ className: cls, subject: s.subject }); }
        }
      }
      const syl = summarize(statuses.filter((s) => s.class_id === cls), pairs);
      const currentSlot = day && currentPeriod ? SCHEDULE[day][currentPeriod.period].find((s) => s.className === cls) ?? null : null;
      return {
        cls,
        students: studentsByClass.get(cls) ?? 0,
        syllabusPct: syl.percent,
        current: currentSlot,
      };
    });
  }, [studentsQ.data, statusQ.data, day, currentPeriod]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">Classes</h1>
          <p className="text-xs text-muted-foreground">Tap any class to open its dashboard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.cls}
            to="/classes/$id"
            params={{ id: c.cls }}
            className="card-soft group flex flex-col gap-3 p-4 transition hover:shadow-[var(--shadow-lift)] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-base font-bold text-primary-foreground">
                {c.cls}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">Class {c.cls}</div>
                <div className="text-[11px] text-muted-foreground">{c.students} students</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </div>

            <div className="rounded-xl bg-secondary/50 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Now</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-foreground">
                {c.current ? `${c.current.subject} · ${c.current.teacher}` : "—"}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Syllabus</span>
                <span>{c.syllabusPct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${c.syllabusPct}%` }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
