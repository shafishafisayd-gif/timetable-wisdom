import { createFileRoute, Link } from "@tanstack/react-router";
import { CLASSES, SCHEDULE, DAYS, PERIODS } from "@/data/timetable";

export const Route = createFileRoute("/classes/")({
  head: () => ({ meta: [{ title: "Classes · Malja'a Timetable" }] }),
  component: ClassesIndex,
});

function ClassesIndex() {
  return (
    <div className="space-y-4">
      <div className="card-soft p-4">
        <h1 className="text-xl font-bold text-foreground">Classes</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Browse each class's full weekly schedule.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CLASSES.map((cls) => {
          let total = 0;
          const teachers = new Set<string>();
          for (const d of DAYS) for (const p of PERIODS) {
            const s = SCHEDULE[d][p].find((x) => x.className === cls);
            if (s) { total++; teachers.add(s.teacher); }
          }
          return (
            <Link key={cls} to="/classes/$id" params={{ id: cls }} className="card-soft p-4 transition hover:shadow-[var(--shadow-lift)] active:scale-[0.98]">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">{cls}</div>
              <div className="mt-3 text-sm font-semibold text-foreground">Class {cls}</div>
              <div className="mt-1 text-xs text-muted-foreground">{total} periods · {teachers.size} teachers</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
