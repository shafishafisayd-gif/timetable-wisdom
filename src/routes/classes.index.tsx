import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, GraduationCap, TrendingUp, Users } from "lucide-react";
import {
  CLASSES,
  SCHEDULE,
  DAYS,
  PERIODS,
  type ClassId,
} from "@/data/timetable";
import { fetchStudents } from "@/lib/students-api";
import {
  fetchSyllabusSettings,
  fetchSyllabusStatus,
  summarize,
} from "@/lib/syllabus-api";

export const Route = createFileRoute("/classes/")({
  head: () => ({
    meta: [
      { title: "Classes · Malja'a Timetable" },
      { name: "description", content: "Class overview for S1–S7: students, subjects, weekly periods and syllabus progress at Malja'a College." },
      { property: "og:title", content: "Classes · Malja'a Timetable" },
      { property: "og:description", content: "Students, subjects, weekly periods and syllabus progress for every class." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClassesIndex,
});

/** Weekly periods (incl. Sub N/S) and specified subjects for each class. */
function classTotals() {
  const map = new Map<ClassId, { weekly: number; subjects: Set<string> }>();
  for (const c of CLASSES) map.set(c, { weekly: 0, subjects: new Set() });
  for (const d of DAYS) for (const p of PERIODS) {
    for (const s of SCHEDULE[d][p]) {
      const row = map.get(s.className);
      if (!row) continue;
      row.weekly += 1;
      if (s.subjectSpecified) row.subjects.add(s.subject);
    }
  }
  return map;
}

function ClassesIndex() {
  const settingsQ = useQuery({ queryKey: ["syllabus_settings"], queryFn: fetchSyllabusSettings });
  const statusQ = useQuery({
    queryKey: ["syllabus_status", "all", settingsQ.data?.academic_year_name],
    enabled: !!settingsQ.data,
    queryFn: () => fetchSyllabusStatus({ academicYear: settingsQ.data!.academic_year_name }),
  });
  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });

  const cards = useMemo(() => {
    const totals = classTotals();
    const studentsByClass = new Map<ClassId, number>();
    for (const s of studentsQ.data ?? []) {
      studentsByClass.set(s.class_id, (studentsByClass.get(s.class_id) ?? 0) + 1);
    }
    const statuses = statusQ.data ?? [];

    return CLASSES.map((cls) => {
      const t = totals.get(cls)!;
      const pairs = Array.from(t.subjects).map((subject) => ({ className: cls, subject }));
      const syl = summarize(statuses.filter((s) => s.class_id === cls), pairs);
      return {
        cls,
        students: studentsByClass.get(cls) ?? 0,
        subjects: t.subjects.size,
        weekly: t.weekly,
        syllabusPct: syl.percent,
      };
    });
  }, [studentsQ.data, statusQ.data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">Classes</h1>
          <p className="text-xs text-muted-foreground">Tap a class to open its dashboard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.cls} className="card-soft flex flex-col gap-3 p-4">
            <Link
              to="/classes/$id"
              params={{ id: c.cls }}
              search={{ tab: "overview" }}
              className="flex items-center gap-3"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-base font-bold text-primary-foreground">
                {c.cls}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">Class {c.cls}</div>
                <div className="text-[11px] text-muted-foreground">
                  {c.students} students · {c.subjects} subjects · {c.weekly} periods/wk
                </div>
              </div>
            </Link>

            <div>
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Syllabus</span>
                <span>{c.syllabusPct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${c.syllabusPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <QuickAction cls={c.cls} tab="students" label="Students" icon={Users} />
              <QuickAction cls={c.cls} tab="timetable" label="Timetable" icon={CalendarDays} />
              <QuickAction cls={c.cls} tab="performance" label="Performance" icon={TrendingUp} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAction({
  cls, tab, label, icon: Icon,
}: { cls: ClassId; tab: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link
      to="/classes/$id"
      params={{ id: cls }}
      search={{ tab }}
      className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-2 py-2 text-[11px] font-semibold text-foreground transition hover:bg-secondary"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}
