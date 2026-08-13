import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Trophy, AlertTriangle } from "lucide-react";
import {
  fetchEvaluations,
  fetchStudents,
  type Evaluation,
  type Student,
} from "@/lib/students-api";
import { CLASSES, type ClassId } from "@/data/timetable";

export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Rankings · Malja'a College" },
      { name: "description", content: "Simple student leaderboard: full college ranking, class-wise ranking, and students who need attention." },
      { property: "og:title", content: "Rankings · Malja'a College" },
      { property: "og:description", content: "Full rank, class-wise rank and students needing attention." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RankingsPage,
});

interface Row {
  student: Student;
  points: number;
  asked: number;
  answered: number;
  notAnswered: number;
  absent: number;
  minusCount: number;
  worstSubject?: string;
}

function buildRows(students: Student[], evals: Evaluation[]): Row[] {
  const byStudent = new Map<string, Evaluation[]>();
  for (const e of evals) {
    const arr = byStudent.get(e.student_id) ?? [];
    arr.push(e);
    byStudent.set(e.student_id, arr);
  }
  const rows = students.map((student) => {
    const list = byStudent.get(student.id) ?? [];
    let points = 0, answered = 0, notAnswered = 0, absent = 0, minusCount = 0;
    const subj = new Map<string, { sum: number; n: number }>();
    for (const e of list) {
      if (typeof e.mark === "number") points += e.mark;
      if (e.status === "answered") answered++;
      else if (e.status === "not_answered") { notAnswered++; if ((e.mark ?? 0) < 0) minusCount++; }
      else if (e.status === "absent") absent++;
      if (e.status !== "absent") {
        const cur = subj.get(e.subject) ?? { sum: 0, n: 0 };
        cur.sum += e.mark ?? 0;
        cur.n++;
        subj.set(e.subject, cur);
      }
    }
    let worstSubject: string | undefined;
    let worstAvg = Infinity;
    for (const [s, v] of subj) {
      const a = v.sum / v.n;
      if (v.n >= 2 && a < worstAvg) { worstAvg = a; worstSubject = s; }
    }
    return {
      student, points, asked: list.length, answered, notAnswered, absent,
      minusCount, worstSubject: worstAvg < 2 ? worstSubject : undefined,
    };
  });
  return rows.sort((a, b) => b.points - a.points || a.student.name.localeCompare(b.student.name));
}

/** Competition ranking: equal points share the same rank. */
function withRanks(rows: Row[]) {
  let lastPoints = Number.NaN;
  let lastRank = 0;
  return rows.map((r, i) => {
    if (r.points !== lastPoints) { lastRank = i + 1; lastPoints = r.points; }
    return { ...r, rank: lastRank };
  });
}

const MEDALS = ["🥇", "🥈", "🥉"];

function PodiumCard({ row, rank }: { row: Row & { rank: number }; rank: number }) {
  const tone = rank === 1 ? "border-warning bg-warning/10" : rank === 2 ? "border-primary/40 bg-primary/5" : "border-accent/40 bg-accent/5";
  return (
    <Link
      to="/students/$id"
      params={{ id: row.student.id }}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition hover:shadow-md ${tone}`}
    >
      <div className="text-3xl leading-none">{MEDALS[rank - 1]}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Rank {row.rank}</div>
      <div className="w-full whitespace-normal break-words text-base font-bold leading-snug text-foreground">
        {row.student.name}
      </div>
      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
        {row.student.class_id}
      </span>
      <div className="text-xl font-black text-foreground">{row.points}<span className="ml-1 text-xs font-semibold text-muted-foreground">pts</span></div>
    </Link>
  );
}

function RankRow({ row, showClass = true }: { row: Row & { rank: number }; showClass?: boolean }) {
  return (
    <Link
      to="/students/$id"
      params={{ id: row.student.id }}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-secondary-foreground">
        {row.rank}
      </div>
      <div className="min-w-0">
        <div className="whitespace-normal break-words text-sm font-semibold leading-snug text-foreground">{row.student.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span>#{row.student.admission_no}</span>
          {showClass && <span className="rounded-full bg-secondary px-1.5 py-0.5 font-semibold">{row.student.class_id}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-base font-black text-foreground">{row.points}</div>
        <div className="text-[10px] font-semibold uppercase text-muted-foreground">pts</div>
      </div>
    </Link>
  );
}

function RankingBlock({ rows, showClass }: { rows: (Row & { rank: number })[]; showClass?: boolean }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No records yet.</p>;
  }
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {top3.map((r, i) => <PodiumCard key={r.student.id} row={r} rank={i + 1} />)}
      </div>
      {rest.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Complete Ranking</h3>
          {rest.map((r) => <RankRow key={r.student.id} row={r} showClass={showClass} />)}
        </div>
      )}
    </div>
  );
}

function attentionReasons(r: Row, lowPointsThreshold: number): string[] {
  const reasons: string[] = [];
  if (r.asked > 0 && r.points <= lowPointsThreshold) reasons.push("Low total points");
  if (r.minusCount >= 3) reasons.push(`${r.minusCount} minus`);
  if (r.notAnswered >= 3) reasons.push(`${r.notAnswered} not answered`);
  if (r.absent >= 3) reasons.push(`${r.absent} absences`);
  if (r.worstSubject) reasons.push(`Weak in ${r.worstSubject}`);
  return reasons;
}

type Tab = "full" | "class" | "attention";

function RankingsPage() {
  const studentsQ = useQuery({ queryKey: ["students", "all"], queryFn: () => fetchStudents() });
  const evalsQ = useQuery({ queryKey: ["evaluations", "all"], queryFn: () => fetchEvaluations() });

  const [tab, setTab] = useState<Tab>("full");
  const [cls, setCls] = useState<ClassId>("S1");
  const [attnScope, setAttnScope] = useState<"all" | ClassId>("all");

  const rows = useMemo(
    () => buildRows(studentsQ.data ?? [], evalsQ.data ?? []),
    [studentsQ.data, evalsQ.data],
  );

  const fullRanked = useMemo(() => withRanks(rows), [rows]);
  const classRanked = useMemo(
    () => withRanks(rows.filter((r) => r.student.class_id === cls)),
    [rows, cls],
  );

  const attention = useMemo(() => {
    const active = rows.filter((r) => r.asked > 0);
    if (active.length === 0) return [];
    const sorted = [...active].sort((a, b) => a.points - b.points);
    const cutIdx = Math.max(0, Math.floor(sorted.length * 0.25) - 1);
    const lowPointsThreshold = sorted[cutIdx]?.points ?? 0;
    return active
      .map((r) => ({ r, reasons: attentionReasons(r, lowPointsThreshold) }))
      .filter((x) => x.reasons.length > 0)
      .filter((x) => attnScope === "all" || x.r.student.class_id === attnScope)
      .sort((a, b) => a.r.points - b.r.points);
  }, [rows, attnScope]);

  const loading = studentsQ.isLoading || evalsQ.isLoading;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy className="h-5 w-5 shrink-0 text-primary" />
          <h1 className="truncate text-2xl font-black text-foreground">Rankings</h1>
        </div>
      </header>

      <nav className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
        {([
          ["full", "Full Rank"],
          ["class", "Class-wise"],
          ["attention", "Need Attention"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading rankings…</p>
      ) : (
        <div className="mt-5">
          {tab === "full" && <RankingBlock rows={fullRanked} showClass />}

          {tab === "class" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {CLASSES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCls(c)}
                    className={`min-w-[52px] rounded-xl px-3 py-2 text-sm font-bold transition ${
                      cls === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <h2 className="text-sm font-bold text-foreground">{cls} Ranking</h2>
              <RankingBlock rows={classRanked} showClass={false} />
            </div>
          )}

          {tab === "attention" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAttnScope("all")}
                  className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                    attnScope === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  All Classes
                </button>
                {CLASSES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAttnScope(c)}
                    className={`min-w-[52px] rounded-xl px-3 py-2 text-sm font-bold transition ${
                      attnScope === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {attention.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No students need attention right now.
                </p>
              ) : (
                <div className="space-y-2">
                  {attention.map(({ r, reasons }) => (
                    <Link
                      key={r.student.id}
                      to="/students/$id"
                      params={{ id: r.student.id }}
                      className="block rounded-2xl border border-destructive/30 bg-destructive/5 p-3 transition hover:border-destructive/60"
                    >
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                        <div className="min-w-0">
                          <div className="whitespace-normal break-words text-sm font-bold leading-snug text-foreground">
                            {r.student.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            #{r.student.admission_no} · {r.student.class_id}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {reasons.map((reason) => (
                              <span key={reason} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-base font-black text-foreground">{r.points}</div>
                          <div className="text-[10px] font-semibold uppercase text-muted-foreground">pts</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
