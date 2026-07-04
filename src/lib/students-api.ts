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
  performanceScore: number; // 0..10
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

export function computeStudentStats(evals: Evaluation[]): StudentStats {
  const s: StudentStats = {
    studentId: evals[0]?.student_id ?? "",
    answered: 0,
    notAnswered: 0,
    absent: 0,
    totalAsked: 0,
    averageMark: 0,
    performanceScore: 0,
    attendance: 0,
  };
  let markSum = 0;
  let markCount = 0;
  for (const e of evals) {
    s.totalAsked++;
    if (e.status === "answered") {
      s.answered++;
      if (typeof e.mark === "number") { markSum += e.mark; markCount++; }
    } else if (e.status === "not_answered") {
      s.notAnswered++;
    } else if (e.status === "absent") {
      s.absent++;
    }
  }
  s.attendance = s.answered + s.notAnswered;
  s.averageMark = markCount > 0 ? markSum / markCount : 0;
  // Performance score: avg mark, but not-answered pulls it down slightly.
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
