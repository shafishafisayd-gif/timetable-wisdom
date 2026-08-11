import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { activeTempCount, DAY_LABELS, jsDayToCode } from "@/data/timetable";
import { useTempVersion } from "@/lib/temp-timetable";
import { useNow } from "@/lib/use-now";

export function TempBanner() {
  useTempVersion();
  const now = useNow(60_000);
  const count = activeTempCount(now);
  if (!count) return null;
  const day = jsDayToCode(now.getDay());
  const label = `${day ? DAY_LABELS[day] : ""}, ${now.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  })}`;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
        <CalendarClock className="h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          Temporary Timetable Active — {label} · {count} change{count > 1 ? "s" : ""}
        </div>
        <Link
          to="/temp-timetable"
          className="shrink-0 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white"
        >
          View
        </Link>
      </div>
    </div>
  );
}
