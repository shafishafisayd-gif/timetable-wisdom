import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { TEACHER_BY_CODE } from "@/data/timetable";
import { getPreferredTeacher } from "@/lib/preferred-teacher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Malja'a Teachers Timetable" },
      { name: "description", content: "Modern timetable app for Malja'a Shareeath & Arts College." },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const pref = getPreferredTeacher();
    if (pref && TEACHER_BY_CODE[pref]) {
      navigate({ to: "/teachers/$code", params: { code: pref }, replace: true });
    } else {
      navigate({ to: "/timetable", replace: true });
    }
  }, [navigate]);
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 text-center">
      <img
        src="/maljaa-icon-192-v3.png"
        alt="Malja'a College"
        className="h-24 w-24 rounded-3xl object-cover shadow-lift"
        width={96}
        height={96}
      />
      <div>
        <h1 className="text-lg font-bold text-foreground">Malja'a College</h1>
        <p className="mt-1 text-sm text-muted-foreground">Loading timetable…</p>
      </div>
    </div>
  );
}
