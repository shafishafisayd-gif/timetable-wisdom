import { supabase } from "@/integrations/supabase/client";
import {
  SCHEDULE,
  DAYS,
  PERIODS,
  TEACHER_BY_CODE,
  type ClassId,
} from "@/data/timetable";

export type SyllabusStatusValue = "not_started" | "in_progress" | "completed";

export interface SyllabusSettings {
  id: number;
  academic_year_name: string;
  start_month: number; // 1-12
  end_month: number; // 1-12
  updated_at: string;
}

export interface SyllabusStatusRow {
  id: string;
  class_id: string;
  subject: string;
  teacher_code: string;
  month: number;
  academic_year: string;
  status: SyllabusStatusValue;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface SyllabusHistoryRow {
  id: string;
  class_id: string;
  subject: string;
  teacher_code: string;
  month: number;
  academic_year: string;
  previous_status: SyllabusStatusValue | null;
  new_status: SyllabusStatusValue;
  updated_by: string | null;
  changed_at: string;
}

export interface SyllabusTriple {
  key: string; // class::subject::teacher
  class_id: ClassId;
  subject: string;
  teacher_code: string;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
export const MONTH_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];
export const monthName = (m: number) => MONTH_NAMES[m - 1] ?? String(m);

/** Derive all distinct (class, subject, teacher) triples from the timetable. */
export function getSyllabusTriples(): SyllabusTriple[] {
  const map = new Map<string, SyllabusTriple>();
  for (const d of DAYS) {
    for (const p of PERIODS) {
      for (const slot of SCHEDULE[d][p]) {
        const key = `${slot.className}::${slot.subject}::${slot.teacher}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            class_id: slot.className,
            subject: slot.subject,
            teacher_code: slot.teacher,
          });
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.class_id !== b.class_id) return a.class_id.localeCompare(b.class_id);
    return a.subject.localeCompare(b.subject);
  });
}

/** Weekly period count per (class, subject, teacher). */
export function getTripleWeeklyPeriods(t: SyllabusTriple): number {
  let n = 0;
  for (const d of DAYS)
    for (const p of PERIODS)
      for (const s of SCHEDULE[d][p])
        if (
          s.className === t.class_id &&
          s.subject === t.subject &&
          s.teacher === t.teacher_code
        )
          n++;
  return n;
}

/** Given a year-start month (1-12) and end month, return the ordered list of month numbers. */
export function monthsInAcademicYear(start: number, end: number): number[] {
  const months: number[] = [];
  let m = start;
  for (let i = 0; i < 12; i++) {
    months.push(m);
    if (m === end) break;
    m = m === 12 ? 1 : m + 1;
  }
  return months;
}

/** Return the "current" academic month within the configured year. */
export function currentAcademicMonth(settings: SyllabusSettings): number {
  const months = monthsInAcademicYear(settings.start_month, settings.end_month);
  const now = new Date().getMonth() + 1;
  return months.includes(now) ? now : months[0];
}

// ---------- API ----------

export async function fetchSettings(): Promise<SyllabusSettings> {
  const { data, error } = await supabase
    .from("syllabus_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as SyllabusSettings;
  const seed: SyllabusSettings = {
    id: 1,
    academic_year_name: "2025-2026",
    start_month: 6,
    end_month: 3,
    updated_at: new Date().toISOString(),
  };
  await supabase.from("syllabus_settings").insert(seed);
  return seed;
}

export async function updateSettings(
  patch: Partial<Pick<SyllabusSettings, "academic_year_name" | "start_month" | "end_month">>,
) {
  const { error } = await supabase
    .from("syllabus_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

export async function fetchStatuses(academicYear: string): Promise<SyllabusStatusRow[]> {
  const { data, error } = await supabase
    .from("syllabus_status")
    .select("*")
    .eq("academic_year", academicYear);
  if (error) throw error;
  return (data ?? []) as SyllabusStatusRow[];
}

export async function upsertStatus(input: {
  class_id: string;
  subject: string;
  teacher_code: string;
  month: number;
  academic_year: string;
  status: SyllabusStatusValue;
  updated_by?: string | null;
}) {
  const { error } = await supabase
    .from("syllabus_status")
    .upsert(
      {
        ...input,
        updated_by: input.updated_by ?? TEACHER_BY_CODE[input.teacher_code]?.fullName ?? input.teacher_code,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "class_id,subject,teacher_code,month,academic_year" },
    );
  if (error) throw error;
}

export async function fetchHistory(academicYear: string, limit = 200): Promise<SyllabusHistoryRow[]> {
  const { data, error } = await supabase
    .from("syllabus_history")
    .select("*")
    .eq("academic_year", academicYear)
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SyllabusHistoryRow[];
}

// ---------- Lookup helpers ----------

export function makeStatusIndex(rows: SyllabusStatusRow[]) {
  const map = new Map<string, SyllabusStatusRow>();
  for (const r of rows) {
    map.set(`${r.class_id}::${r.subject}::${r.teacher_code}::${r.month}`, r);
  }
  return {
    get: (t: { class_id: string; subject: string; teacher_code: string }, month: number) =>
      map.get(`${t.class_id}::${t.subject}::${t.teacher_code}::${month}`),
  };
}
