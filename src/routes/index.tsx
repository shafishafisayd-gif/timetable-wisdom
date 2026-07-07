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
    <div className="card-soft p-10 text-center text-sm text-muted-foreground">Loading…</div>
  );
}
