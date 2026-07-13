import { supabase } from "@/integrations/supabase/client";
import type { ClassId } from "@/data/timetable";

export interface Student {
  id: string;
  admission_no: number;
  name: string;
  class_id: ClassId;
  sl_no: number | null;
}

export interface Evaluation {
  id: string;
  student_id: string;
  teacher_code: string;
  class_id: string;
  subject: string;
  day: string;
  period: number;
  status: "answered" | "not_answered" | "absent";
  mark: number | null;
  academic_year: string | null;
  round_no: number;
  eval_date: string;
  created_at: string;
}

export interface RoundPick {
  id: string;
  teacher_code: string;
  class_id: string;
  subject: string;
  student_id: string;
  round_no: number;
  picked_at: string;
}


export interface StudentStats {
  studentId: string;
  answered: number;
  notAnswered: number;
  absent: number;
  totalAsked: number;
  averageMark: number;
  performanceScore: number; // 0..10 (legacy)
  totalPoints: number; // sum of all mark values (primary ranking metric)
  attendance: number; // answered + not_answered
}

export async function fetchStudents(classId?: ClassId): Promise<Student[]> {
  let q = supabase.from("students").select("*").order("sl_no", { ascending: true });
  if (classId) q = q.eq("class_id", classId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Student[];
}

export async function fetchEvaluations(opts?: {
  studentId?: string;
  classId?: string;
  teacherCode?: string;
  subject?: string;
}): Promise<Evaluation[]> {
  let q = supabase.from("evaluations").select("*").order("created_at", { ascending: false });
  if (opts?.studentId) q = q.eq("student_id", opts.studentId);
  if (opts?.classId) q = q.eq("class_id", opts.classId);
  if (opts?.teacherCode) q = q.eq("teacher_code", opts.teacherCode);
  if (opts?.subject) q = q.eq("subject", opts.subject);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Evaluation[];
}

export async function fetchRoundPicks(teacherCode: string, classId: string, subject: string, roundNo: number) {
  const { data, error } = await supabase
    .from("round_picks")
    .select("*")
    .eq("teacher_code", teacherCode)
    .eq("class_id", classId)
    .eq("subject", subject)
    .eq("round_no", roundNo);
  if (error) throw error;
  return (data ?? []) as RoundPick[];
}

export async function fetchCurrentRoundNo(teacherCode: string, classId: string, subject: string): Promise<number> {
  const { data, error } = await supabase
    .from("round_picks")
    .select("round_no")
    .eq("teacher_code", teacherCode)
    .eq("class_id", classId)
    .eq("subject", subject)
    .order("round_no", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? (data[0].round_no as number) : 1;
}

// ---- Daily round helpers ----
export function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchTodayEvaluations(
  teacherCode: string,
  classId: string,
  subject: string,
): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .eq("teacher_code", teacherCode)
    .eq("class_id", classId)
    .eq("subject", subject)
    .gte("created_at", todayStartIso())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Evaluation[];
}


/**
 * Fetch all round picks for a teacher/class/subject across every round.
 * Rounds are persistent — they never reset with the day. Kept for history views.
 */
export async function fetchAllRoundPicks(
  teacherCode: string,
  classId: string,
  subject: string,
): Promise<RoundPick[]> {
  const { data, error } = await supabase
    .from("round_picks")
    .select("*")
    .eq("teacher_code", teacherCode)
    .eq("class_id", classId)
    .eq("subject", subject)
    .order("picked_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoundPick[];
}

/**
 * Compute the effective current round state for a teacher/class/subject.
 * Rounds are per teacher-class-subject and NOT scoped to the day — the
 * system remembers exactly which students have already been asked in the
 * current round and which are still waiting.
 *
 * When every student in the class has been picked in the current round,
 * the round is considered complete and the next call surfaces it as
 * "round complete" (empty picks for roundNo + 1).
 */
export async function fetchRoundState(
  teacherCode: string,
  classId: string,
  subject: string,
  studentCount: number,
): Promise<{ roundNo: number; picks: RoundPick[] }> {
  const maxRound = await fetchCurrentRoundNo(teacherCode, classId, subject);
  const picks = await fetchRoundPicks(teacherCode, classId, subject, maxRound);
  if (studentCount > 0 && picks.length >= studentCount) {
    return { roundNo: maxRound + 1, picks: [] };
  }
  return { roundNo: maxRound, picks };
}

/**
 * Start a new round explicitly — used by the "Start New Round" button after
 * a round is completed. This does not touch evaluations, marks, minus,
 * absences, or statistics — only the selection order is reset.
 * Returns the new round number to insert future picks under.
 */
export async function startNewRound(
  teacherCode: string,
  classId: string,
  subject: string,
): Promise<number> {
  const maxRound = await fetchCurrentRoundNo(teacherCode, classId, subject);
  return maxRound + 1;
}



export async function insertRoundPick(pick: Omit<RoundPick, "id" | "picked_at">) {
  const { data, error } = await supabase.from("round_picks").insert(pick).select().single();
  if (error) throw error;
  return data as RoundPick;
}

export async function insertEvaluation(evalRow: Omit<Evaluation, "id" | "created_at">) {
  const { data, error } = await supabase.from("evaluations").insert(evalRow).select().single();
  if (error) throw error;
  return data as Evaluation;
}

export async function updateEvaluation(
  id: string,
  patch: Partial<Pick<Evaluation, "status" | "mark">>,
) {
  const { data, error } = await supabase.from("evaluations").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Evaluation;
}

export async function deleteEvaluation(id: string) {
  const { error } = await supabase.from("evaluations").delete().eq("id", id);
  if (error) throw error;
}

export function computeStudentStats(evals: Evaluation[]): StudentStats {
  const s: StudentStats = {
    studentId: evals[0]?.student_id ?? "",
    answered: 0,
    notAnswered: 0,
    absent: 0,
    totalAsked: 0,
    averageMark: 0,
    performanceScore: 0,
    totalPoints: 0,
    attendance: 0,
  };
  let markSum = 0;
  let markCount = 0;
  let pointsSum = 0;
  for (const e of evals) {
    s.totalAsked++;
    if (e.status === "answered") {
      s.answered++;
      if (typeof e.mark === "number") { markSum += e.mark; markCount++; pointsSum += e.mark; }
    } else if (e.status === "not_answered") {
      s.notAnswered++;
      if (typeof e.mark === "number") pointsSum += e.mark; // minus is stored as negative
    } else if (e.status === "absent") {
      s.absent++;
    }
  }
  s.attendance = s.answered + s.notAnswered;
  s.averageMark = markCount > 0 ? markSum / markCount : 0;
  s.totalPoints = pointsSum;
  const denom = s.answered + s.notAnswered;
  s.performanceScore = denom > 0 ? (markSum + s.notAnswered * -1) / denom : 0;
  return s;
}

export interface SubjectStats {
  subject: string;
  asked: number;
  answered: number;
  notAnswered: number;
  absent: number;
  average: number;
  highest: number;
  lowest: number;
}

export function computeSubjectStats(evals: Evaluation[]): SubjectStats[] {
  const bySubject = new Map<string, Evaluation[]>();
  for (const e of evals) {
    const arr = bySubject.get(e.subject) ?? [];
    arr.push(e);
    bySubject.set(e.subject, arr);
  }
  const out: SubjectStats[] = [];
  for (const [subject, list] of bySubject) {
    let answered = 0, notAnswered = 0, absent = 0;
    const marks: number[] = [];
    for (const e of list) {
      if (e.status === "answered") { answered++; if (typeof e.mark === "number") marks.push(e.mark); }
      else if (e.status === "not_answered") notAnswered++;
      else absent++;
    }
    out.push({
      subject,
      asked: list.length,
      answered,
      notAnswered,
      absent,
      average: marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0,
      highest: marks.length ? Math.max(...marks) : 0,
      lowest: marks.length ? Math.min(...marks) : 0,
    });
  }
  return out.sort((a, b) => b.asked - a.asked);
}
