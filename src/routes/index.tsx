import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Star, Users2 } from "lucide-react";
import {
  TEACHERS,
  getTeacherStats,
  getCurrentStatus,
  getRemainingPeriodsToday,
  jsDayToCode,
  DAY_LABELS,
  textOn,
} from "@/data/timetable";
import { useNow } from "@/lib/use-now";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Teachers · Malja'a Timetable" },
      { name: "description", content: "All teachers at Malja'a College with live period status." },
    ],
  }),
  component: Index,
});

function StatusBadge({ status }: { status: ReturnType<typeof getCurrentStatus> }) {
  const cls = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold";
  switch (status.kind) {
    case "teaching":
      return <span className={`${cls} bg-success text-success-foreground`}><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />Teaching now</span>;
    case "free":
      return <span className={`${cls} bg-accent/15 text-accent-foreground`}>Free now</span>;
    case "break":
      return <span className={`${cls} bg-warning/20 text-warning-foreground`}>{status.breakSlot.label}</span>;
    case "before":
      return <span className={`${cls} bg-secondary text-secondary-foreground`}>Starts {status.nextPeriod.start}</span>;
    case "finished":
      return <span className={`${cls} bg-secondary text-secondary-foreground`}>Finished today</span>;
    case "off":
      return <span className={`${cls} bg-secondary text-secondary-foreground`}>Day off</span>;
  }
}

function Index() {
  const [q, setQ] = useState("");
  const [showFavOnly, setShowFavOnly] = useState(false);
  const now = useNow();
  const { favorites, isFavorite, toggle } = useFavorites();
  const today = jsDayToCode(now.getDay());

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return TEACHERS.filter((t) => {
      if (showFavOnly && !favorites.includes(t.code)) return false;
      if (!query) return true;
      return (
        t.fullName.toLowerCase().includes(query) ||
        t.code.toLowerCase().includes(query) ||
        t.shortName.toLowerCase().includes(query)
      );
    });
  }, [q, showFavOnly, favorites]);

  return (
    <div className="space-y-5">
      <section className="card-soft p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight text-foreground">Teachers</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {today ? `Today is ${DAY_LABELS[today]}` : "Today is a holiday"} · {TEACHERS.length} teachers
            </p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Users2 className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or code (e.g. HU, AJR)"
              className="w-full rounded-2xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none ring-ring/40 transition focus:ring-2"
            />
          </div>
          <button
            onClick={() => setShowFavOnly((v) => !v)}
            aria-pressed={showFavOnly}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition ${
              showFavOnly
                ? "border-accent bg-accent/15 text-accent-foreground"
                : "border-input bg-background text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Toggle favorites only"
          >
            <Star className={`h-4 w-4 ${showFavOnly ? "fill-current" : ""}`} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((t) => {
          const stats = getTeacherStats(t.code);
          const status = getCurrentStatus(t.code, now);
          const remaining = getRemainingPeriodsToday(t.code, now);
          const fav = isFavorite(t.code);
          return (
            <Link
              key={t.code}
              to="/teachers/$code"
              params={{ code: t.code }}
              className="card-soft group relative overflow-hidden p-4 transition hover:shadow-[var(--shadow-lift)] active:scale-[0.99]"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ backgroundColor: t.color }}
              />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold"
                    style={{ backgroundColor: t.color, color: textOn(t.color) }}
                  >
                    {t.shortName}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold leading-tight text-foreground">
                      {t.fullName}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t.position} · <span className="font-mono">{t.code}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(t.code); }}
                  aria-label={fav ? "Unfavorite" : "Favorite"}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
                    fav ? "bg-accent/20 text-accent-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Star className={`h-4 w-4 ${fav ? "fill-current text-amber-500" : ""}`} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Stat label="Weekly" value={stats.totalWeeklyPeriods} />
                <Stat label="Classes" value={stats.totalClasses} />
                <Stat label="Today left" value={remaining} />
              </div>

              <div className="mt-3">
                <StatusBadge status={status} />
              </div>
            </Link>
          );
        })}
      </div>

      {list.length === 0 && (
        <div className="card-soft p-10 text-center text-sm text-muted-foreground">
          No teachers match your search.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-2.5 py-2 text-center">
      <div className="text-base font-bold leading-none text-foreground">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
