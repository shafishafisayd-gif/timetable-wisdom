import { supabase } from "@/integrations/supabase/client";
import { DAYS, PERIODS, getTeacherSchedule, SUBJECT_UNSPECIFIED, type ClassId } from "@/data/timetable";

export type SyllabusStatusValue = "not_started" | "in_progress" | "completed";

export interface SyllabusSettings {
  id: number;
  academic_year_name: string;
  start_month: number; // 1-12
  end_month: number;   // 1-12
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
  created_at: string;
  updated_at: string;
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

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface AcademicMonth {
  month: number;      // 1-12
  monthName: string;
  monthLong: string;
  index: number;      // 0-based order within academic year
}

/** Build ordered list of months from start_month → end_month, wrapping if needed. */
export function buildAcademicMonths(startMonth: number, endMonth: number): AcademicMonth[] {
  const out: AcademicMonth[] = [];
  let m = startMonth;
  let i = 0;
  while (true) {
    out.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      monthLong: MONTH_LONG[m - 1],
      index: i,
    });
    if (m === endMonth) break;
    m = m === 12 ? 1 : m + 1;
    i++;
    if (i > 24) break; // safety
  }
  return out;
}

/** Unique class-subject pairs handled by a teacher (from timetable data). */
export function getTeacherClassSubjects(
  code: string,
): { className: ClassId; subject: string; weekly: number }[] {
  const sched = getTeacherSchedule(code, false);
  const map = new Map<string, { className: ClassId; subject: string; weekly: number }>();
  for (const d of DAYS) {
    for (const p of PERIODS) {
      const s = sched[d][p];
      if (!s) continue;
      // Teacher-only periods are assigned work, but never syllabus items.
      if (!s.subjectSpecified || s.subject === SUBJECT_UNSPECIFIED) continue;
      const key = `${s.className}|${s.subject}`;
      const row = map.get(key) ?? { className: s.className, subject: s.subject, weekly: 0 };
      row.weekly += 1;
      map.set(key, row);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => a.className.localeCompare(b.className) || a.subject.localeCompare(b.subject),
  );
}

export async function fetchSyllabusSettings(): Promise<SyllabusSettings> {
  const { data, error } = await supabase
    .from("syllabus_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // Ensure a row exists
    const { data: created, error: err2 } = await supabase
      .from("syllabus_settings")
      .insert({ id: 1 })
      .select()
      .single();
    if (err2) throw err2;
    return created as SyllabusSettings;
  }
  return data as SyllabusSettings;
}

export async function updateSyllabusSettings(
  patch: Partial<Pick<SyllabusSettings, "academic_year_name" | "start_month" | "end_month">>,
): Promise<SyllabusSettings> {
  const { data, error } = await supabase
    .from("syllabus_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return data as SyllabusSettings;
}

export async function fetchSyllabusStatus(opts?: {
  teacherCode?: string;
  classId?: string;
  subject?: string;
  academicYear?: string;
}): Promise<SyllabusStatusRow[]> {
  let q = supabase.from("syllabus_status").select("*").neq("subject", SUBJECT_UNSPECIFIED);
  if (opts?.teacherCode) q = q.eq("teacher_code", opts.teacherCode);
  if (opts?.classId) q = q.eq("class_id", opts.classId);
  if (opts?.subject) q = q.eq("subject", opts.subject);
  if (opts?.academicYear) q = q.eq("academic_year", opts.academicYear);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SyllabusStatusRow[];
}

export async function setSyllabusStatus(input: {
  class_id: string;
  subject: string;
  teacher_code: string;
  month: number;
  academic_year: string;
  status: SyllabusStatusValue;
  updated_by?: string | null;
}): Promise<SyllabusStatusRow> {
  const { data: existing, error: e1 } = await supabase
    .from("syllabus_status")
    .select("*")
    .eq("class_id", input.class_id)
    .eq("subject", input.subject)
    .eq("teacher_code", input.teacher_code)
    .eq("month", input.month)
    .eq("academic_year", input.academic_year)
    .maybeSingle();
  if (e1) throw e1;
  if (existing) {
    const { data, error } = await supabase
      .from("syllabus_status")
      .update({
        status: input.status,
        updated_by: input.updated_by ?? existing.updated_by,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as SyllabusStatusRow;
  }
  const { data, error } = await supabase
    .from("syllabus_status")
    .insert({
      class_id: input.class_id,
      subject: input.subject,
      teacher_code: input.teacher_code,
      month: input.month,
      academic_year: input.academic_year,
      status: input.status,
      updated_by: input.updated_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SyllabusStatusRow;
}

export async function fetchSyllabusHistory(opts?: {
  teacherCode?: string;
  classId?: string;
  subject?: string;
  academicYear?: string;
  limit?: number;
}): Promise<SyllabusHistoryRow[]> {
  let q = supabase
    .from("syllabus_history")
    .select("*")
    .order("changed_at", { ascending: false });
  if (opts?.teacherCode) q = q.eq("teacher_code", opts.teacherCode);
  if (opts?.classId) q = q.eq("class_id", opts.classId);
  if (opts?.subject) q = q.eq("subject", opts.subject);
  if (opts?.academicYear) q = q.eq("academic_year", opts.academicYear);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SyllabusHistoryRow[];
}

export interface SyllabusMonthStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percent: number;
}

export function summarize(
  statuses: SyllabusStatusRow[],
  pairs: { className: ClassId; subject: string }[],
): SyllabusMonthStats {
  const byKey = new Map<string, SyllabusStatusValue>();
  for (const s of statuses) byKey.set(`${s.class_id}|${s.subject}`, s.status);
  let completed = 0, inProgress = 0, notStarted = 0;
  for (const p of pairs) {
    const st = byKey.get(`${p.className}|${p.subject}`) ?? "not_started";
    if (st === "completed") completed++;
    else if (st === "in_progress") inProgress++;
    else notStarted++;
  }
  const total = pairs.length;
  return {
    total,
    completed,
    inProgress,
    notStarted,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}
