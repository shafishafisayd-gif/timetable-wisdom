import { useEffect, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CLASSES,
  DAYS,
  PERIODS,
  SCHEDULE,
  localDateKey,
  setTempOverrides,
  subscribeTempOverrides,
  getTempVersion,
  type ClassId,
  type DayCode,
  type PeriodNum,
} from "@/data/timetable";

export interface TempOverrideRow {
  id: string;
  override_date: string;
  day_code: string;
  class_id: string;
  period: number;
  subject: string;
  teacher_code: string | null;
  original_subject: string | null;
}

export async function fetchTempOverrides(date: string): Promise<TempOverrideRow[]> {
  const { data, error } = await supabase
    .from("temp_timetable")
    .select("*")
    .eq("override_date", date);
  if (error) throw error;
  return (data ?? []) as TempOverrideRow[];
}

export async function saveTempOverrides(
  date: string,
  dayCode: DayCode,
  entries: {
    class_id: ClassId;
    period: PeriodNum;
    subject: string;
    teacher_code: string | null;
    original_subject: string | null;
  }[],
) {
  // Replace the whole day's override set with the given entries.
  const { error: delErr } = await supabase
    .from("temp_timetable")
    .delete()
    .eq("override_date", date);
  if (delErr) throw delErr;
  if (!entries.length) return;
  const { error } = await supabase.from("temp_timetable").insert(
    entries.map((e) => ({ ...e, override_date: date, day_code: dayCode })),
  );
  if (error) throw error;
}

export async function clearTempOverrides(date: string) {
  const { error } = await supabase.from("temp_timetable").delete().eq("override_date", date);
  if (error) throw error;
}

/** Subjects legitimately taught to a class anywhere in the permanent timetable. */
export function subjectsForClass(cls: ClassId): string[] {
  const set = new Set<string>();
  for (const d of DAYS)
    for (const p of PERIODS)
      for (const s of SCHEDULE[d][p])
        if (s.className === cls && s.subjectSpecified) set.add(s.subject);
  return [...set].sort();
}

export const ALL_CLASSES = CLASSES;

/** Re-renders the caller whenever the active override registry changes. */
export function useTempVersion() {
  return useSyncExternalStore(subscribeTempOverrides, getTempVersion, getTempVersion);
}

/**
 * Loads today's overrides into the shared registry so every read helper
 * (teacher pages, Ask Question, class pages, timetable) picks them up.
 */
export function useTempTimetableSync() {
  const qc = useQueryClient();
  const today = localDateKey();

  const q = useQuery({
    queryKey: ["temp_timetable", today],
    queryFn: () => fetchTempOverrides(today),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    setTempOverrides(today, q.data ?? []);
  }, [q.data, today]);

  useEffect(() => {
    const channel = supabase
      .channel("temp-timetable-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "temp_timetable" },
        () => {
          qc.invalidateQueries({ queryKey: ["temp_timetable"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
