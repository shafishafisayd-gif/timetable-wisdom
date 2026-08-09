import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ListTree, Trophy } from "lucide-react";
import {
  fetchEvaluations,
  fetchStudents,
  type Evaluation,
  type Student,
} from "@/lib/students-api";
import { CLASSES, SCHEDULE, DAYS, PERIODS, TEACHER_BY_CODE, type ClassId } from "@/data/timetable";

export const Route = createFileRoute("/performance")({
  head: () => ({ meta: [{ title: "Performance · Malja'a" }] }),
  component: PerformancePage,
});

interface SubjectRow {
  student: Student;
  points: number;
  answered: number;
  notAnswered: number;
  absent: number;
  asked: number;
  totalMarks: number;
  avg: number;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

// Build the canonical Class → Subject → teachers[] map from the SCHEDULE.
function buildClassSubjectMap(): Map<ClassId, Map<string, Set<string>>> {
  const out = new Map<ClassId, Map<string, Set<string>>>();
  for (const c of CLASSES) out.set(c, new Map());
  for (const d of DAYS) {
    for (const p of PERIODS) {
      for (const s of SCHEDULE[d][p]) {
        if (!s.subjectSpecified) continue;
        const cls = out.get(s.className)!;
        const teachers = cls.get(s.subject) ?? new Set<string>();
        teachers.add(s.teacher);
        cls.set(s.subject, teachers);
      }
    }
  }
  return out;
}

function PerformancePage() {
  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });
  const evalsQ = useQuery({ queryKey: ["evaluations", "all"], queryFn: () => fetchEvaluations() });

  const classSubjectMap = useMemo(() => buildClassSubjectMap(), []);

  // Merge subjects from evaluations too (in case something isn't in schedule).
  const merged = useMemo(() => {
    const clone = new Map<ClassId, Map<string, Set<string>>>();
    for (const [c, sm] of classSubjectMap) {
      const m = new Map<string, Set<string>>();
      for (const [s, t] of sm) m.set(s, new Set(t));
      clone.set(c, m);
    }
    for (const e of evalsQ.data ?? []) {
      const cls = clone.get(e.class_id as ClassId);
      if (!cls) continue;
      const t = cls.get(e.subject) ?? new Set<string>();
      t.add(e.teacher_code);
      cls.set(e.subject, t);
    }
    return clone;
  }, [classSubjectMap, evalsQ.data]);

  // Group evaluations by class → subject → student.
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Map<string, Evaluation[]>>>();
    for (const e of evalsQ.data ?? []) {
      const cls = map.get(e.class_id) ?? new Map();
      const subj = cls.get(e.subject) ?? new Map();
      const list = subj.get(e.student_id) ?? [];
      list.push(e);
      subj.set(e.student_id, list);
      cls.set(e.subject, subj);
      map.set(e.class_id, cls);
    }
    return map;
  }, [evalsQ.data]);

  const studentMap = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of studentsQ.data ?? []) m.set(s.id, s);
    return m;
  }, [studentsQ.data]);

  const [openClass, setOpenClass] = useState<ClassId | null>("S1");

  return (
    <div className="space-y-4">
      <div className="card-soft overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
                <ListTree className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold">Class &amp; Subject Performance</h1>
                <p className="truncate text-xs text-muted-foreground">
                  Grouped Class → Subject → Student · live from cloud
                </p>
              </div>
            </div>
            <Link
              to="/rankings"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
            >
              <Trophy className="h-3.5 w-3.5" /> Rankings
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {CLASSES.map((c) => {
          const subjects = Array.from(merged.get(c)?.entries() ?? []).sort((a, b) =>
            a[0].localeCompare(b[0]),
          );
          const open = openClass === c;
          const classEvals = grouped.get(c);
          const activeCount = classEvals?.size ?? 0;
          return (
            <div key={c} className="card-soft overflow-hidden">
              <button
                onClick={() => setOpenClass(open ? null : c)}
                className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-secondary/40"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {c}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">Class {c}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {subjects.length} subjects · {activeCount} subjects with records
                  </div>
                </div>
                {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>

              {open && (
                <div className="space-y-3 border-t border-border p-3">
                  {subjects.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">
                      No subjects defined for this class.
                    </p>
                  ) : (
                    subjects.map(([subject, teacherSet]) => {
                      const teacherCodes = Array.from(teacherSet);
                      const studentEvals = grouped.get(c)?.get(subject);
                      const rows: SubjectRow[] = [];
                      if (studentEvals) {
                        for (const [sid, list] of studentEvals) {
                          const st = studentMap.get(sid);
                          if (!st) continue;
                          let answered = 0, notAnswered = 0, absent = 0, points = 0, totalMarks = 0;
                          let mSum = 0, mCount = 0;
                          for (const e of list) {
                            if (e.status === "answered") {
                              answered++;
                              if (typeof e.mark === "number") { points += e.mark; totalMarks += e.mark; mSum += e.mark; mCount++; }
                            } else if (e.status === "not_answered") {
                              notAnswered++;
                              if (typeof e.mark === "number") points += e.mark;
                            } else {
                              absent++;
                            }
                          }
                          rows.push({
                            student: st,
                            points,
                            answered,
                            notAnswered,
                            absent,
                            asked: list.length,
                            totalMarks,
                            avg: mCount > 0 ? mSum / mCount : 0,
                          });
                        }
                      }
                      rows.sort((a, b) => b.points - a.points || b.avg - a.avg);
                      return (
                        <SubjectBlock
                          key={subject}
                          subject={subject}
                          teacherCodes={teacherCodes}
                          rows={rows}
                        />
                      );
                    })
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

function SubjectBlock({ subject, teacherCodes, rows }: { subject: string; teacherCodes: string[]; rows: SubjectRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, 5);
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{subject}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {teacherCodes.length > 0 ? teacherCodes.map((code) => TEACHER_BY_CODE[code]?.shortName ?? code).join(" · ") : "No teacher on record"}
          </div>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
          {rows.length} student{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">No evaluations recorded yet.</p>
      ) : (
        <>
          <ol className="mt-2 space-y-1.5">
            {shown.map((r, i) => (
              <li key={r.student.id}>
                <Link
                  to="/students/$id"
                  params={{ id: r.student.id }}
                  className="flex items-center gap-2 rounded-xl bg-secondary/50 p-2 transition hover:bg-secondary"
                >
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${
                    i === 0 ? "bg-amber-400 text-amber-950" :
                    i === 1 ? "bg-slate-300 text-slate-800" :
                    i === 2 ? "bg-orange-400 text-orange-950" :
                    "bg-card text-foreground"
                  }`}>{i + 1}</div>
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {initials(r.student.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{r.student.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      #{r.student.admission_no} · asked {r.asked} · ✓{r.answered} · −{r.notAnswered} · A{r.absent} · avg {r.avg.toFixed(1)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold">{r.points}</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">pts</div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
          {rows.length > 5 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 w-full rounded-lg bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground transition hover:bg-secondary/70"
            >
              {expanded ? "Show top 5" : `Show all ${rows.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
