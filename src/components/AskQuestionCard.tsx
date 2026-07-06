import { useNavigate } from "@tanstack/react-router";
import { HelpCircle, Sparkles, Coffee } from "lucide-react";
import {
  getCurrentStatus,
  textOn,
  type Teacher,
} from "@/data/timetable";
import { useNow } from "@/lib/use-now";

export function AskQuestionCard({ teacher }: { teacher: Teacher }) {
  const now = useNow();
  const status = getCurrentStatus(teacher.code, now);
  const navigate = useNavigate();

  const teaching = status.kind === "teaching" ? status : null;
  const classId = teaching?.slot.className;
  const subject = teaching?.slot.subject;
  const period = teaching?.period.period;
  const fg = textOn(teacher.color);

  if (!teaching || !classId || !subject || period === undefined) {
    let msg = "This card activates automatically when you're teaching a class.";
    let icon = <Sparkles className="h-5 w-5" />;
    if (status.kind === "free") msg = "No class scheduled for this period.";
    else if (status.kind === "break") {
      msg = `${status.breakSlot.label} Break — enjoy the pause.`;
      icon = <Coffee className="h-5 w-5" />;
    } else if (status.kind === "before") msg = "Classes haven't started yet.";
    else if (status.kind === "finished") msg = "Today's schedule is finished.";
    else if (status.kind === "off") msg = "It's a day off.";

    return (
      <div className="card-lift p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon} Ask Question
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
        <button
          disabled
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-4 text-base font-bold text-muted-foreground opacity-70"
        >
          <HelpCircle className="h-5 w-5" />
          Ask Question · unavailable
        </button>
      </div>
    );
  }

  const openSession = () => {
    navigate({
      to: "/session/$class/$subject",
      params: { class: classId, subject },
      search: { teacher: teacher.code, period },
    });
  };

  return (
    <div className="card-lift overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: teacher.color }} />
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-5 w-5" /> Ask Question
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <div className="text-lg font-bold text-foreground">{subject}</div>
          <div className="text-sm text-muted-foreground">· Class {classId} · Now</div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Opens the Question Session — a random student is locked in until you record their result.
        </p>
        <button
          onClick={openSession}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-bold shadow-sm transition active:scale-[0.98]"
          style={{ backgroundColor: teacher.color, color: fg }}
        >
          <HelpCircle className="h-5 w-5" />
          Ask Question · Open Session
        </button>
      </div>
    </div>
  );
}
