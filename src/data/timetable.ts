// Single source of truth for Malja'a College timetable
// Extracted directly from the official PDF (NEW TT 3.pdf).
// IMPORTANT: There are TWO separate "Period 1" sessions in the PDF:
//   - P1     5:50 AM – 6:35 AM  (early morning)
//   - P1 (2) 7:00 AM – 7:40 AM  (after the get-fresh break)
// They MUST stay independent — never merge them.

export type DayCode = "SAT" | "SUN" | "MON" | "TUE" | "WED" | "THU";
export const DAYS: DayCode[] = ["SAT", "SUN", "MON", "TUE", "WED", "THU"];
export const DAY_LABELS: Record<DayCode, string> = {
  SAT: "Saturday",
  SUN: "Sunday",
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
};

// Period index 0 = early P1, 1 = P1 (2), 2..9 = P2..P9.
export type PeriodNum = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const PERIODS: PeriodNum[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export interface PeriodTime {
  period: PeriodNum;
  label: string;       // long label e.g. "Period 1 (Early)"
  labelShort: string;  // short label e.g. "P1", "P1 (2)", "P2"
  start: string;       // HH:MM 24h
  end: string;
  startMin: number;
  endMin: number;
}

const t = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export const PERIOD_TIMES: PeriodTime[] = [
  { period: 0, label: "Period 1 (Early)", labelShort: "P1",     start: "05:50", end: "06:35", startMin: t("05:50"), endMin: t("06:35") },
  { period: 1, label: "Period 1 (2)",     labelShort: "P1 (2)", start: "07:00", end: "07:40", startMin: t("07:00"), endMin: t("07:40") },
  { period: 2, label: "Period 2",         labelShort: "P2",     start: "07:40", end: "08:20", startMin: t("07:40"), endMin: t("08:20") },
  { period: 3, label: "Period 3",         labelShort: "P3",     start: "08:20", end: "09:00", startMin: t("08:20"), endMin: t("09:00") },
  { period: 4, label: "Period 4",         labelShort: "P4",     start: "09:40", end: "10:20", startMin: t("09:40"), endMin: t("10:20") },
  { period: 5, label: "Period 5",         labelShort: "P5",     start: "10:20", end: "11:00", startMin: t("10:20"), endMin: t("11:00") },
  { period: 6, label: "Period 6",         labelShort: "P6",     start: "11:15", end: "12:00", startMin: t("11:15"), endMin: t("12:00") },
  { period: 7, label: "Period 7",         labelShort: "P7",     start: "12:00", end: "12:45", startMin: t("12:00"), endMin: t("12:45") },
  { period: 8, label: "Period 8",         labelShort: "P8",     start: "14:15", end: "15:00", startMin: t("14:15"), endMin: t("15:00") },
  { period: 9, label: "Period 9",         labelShort: "P9",     start: "15:00", end: "15:45", startMin: t("15:00"), endMin: t("15:45") },
];

export type BreakKind = "GET_FRESH" | "BREAKFAST" | "INTERVAL" | "PRAYER_LUNCH";
export interface BreakSlot {
  kind: BreakKind;
  label: string;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
}

export const BREAKS: BreakSlot[] = [
  { kind: "GET_FRESH",    label: "Get Fresh",      start: "06:35", end: "07:00", startMin: t("06:35"), endMin: t("07:00") },
  { kind: "BREAKFAST",    label: "Breakfast",      start: "09:00", end: "09:40", startMin: t("09:00"), endMin: t("09:40") },
  { kind: "INTERVAL",     label: "Interval",       start: "11:00", end: "11:15", startMin: t("11:00"), endMin: t("11:15") },
  { kind: "PRAYER_LUNCH", label: "Prayer & Lunch", start: "12:45", end: "14:15", startMin: t("12:45"), endMin: t("14:15") },
];

export interface Teacher {
  code: string;
  shortName: string;
  fullName: string;
  position: string;
  color: string;       // EXACT colour from the official PDF legend
  colorSoft: string;   // soft bg derived from color
  syllabusPdf?: string;
}

// Colours read directly from the official timetable PDF legend (page 3).
export const TEACHERS: Teacher[] = [
  { code: "HU",  shortName: "HU",  fullName: "Hassan Hudawi",          position: "Usthad", color: "#547F35", colorSoft: "#E3EDD7", syllabusPdf: "/syllabus/HU.pdf"  },
  { code: "ZU",  shortName: "ZU",  fullName: "Muhammed Zaini",         position: "Usthad", color: "#FFFF00", colorSoft: "#FFFFCC", syllabusPdf: "/syllabus/ZU.pdf"  },
  { code: "HW",  shortName: "HW",  fullName: "Haneefa Wafy",           position: "Usthad", color: "#7030A0", colorSoft: "#E2D4ED", syllabusPdf: "/syllabus/HW.pdf"  },
  { code: "SF",  shortName: "SF",  fullName: "Shafeeq Faizy",          position: "Usthad", color: "#4E41F9", colorSoft: "#DDD9FD", syllabusPdf: "/syllabus/SF.pdf"  },
  { code: "SH",  shortName: "SH",  fullName: "Swalih Hudawi",          position: "Usthad", color: "#92D050", colorSoft: "#E4F2D2", syllabusPdf: "/syllabus/SH.pdf"  },
  { code: "SW",  shortName: "SW",  fullName: "Sufaid Wafy",            position: "Usthad", color: "#AA4D0E", colorSoft: "#F2D9C6", syllabusPdf: "/syllabus/SW.pdf"  },
  { code: "SSH", shortName: "SSH", fullName: "Sayyid Shafi Hudawi",    position: "Usthad", color: "#00B0F0", colorSoft: "#CCEFFB", syllabusPdf: "/syllabus/SSH.pdf" },
  { code: "AJR", shortName: "AJR", fullName: "Azhar Jamal Rahmani",    position: "Usthad", color: "#FF6F0D", colorSoft: "#FFDDC2", syllabusPdf: "/syllabus/AJR.pdf" },
  { code: "KF",  shortName: "KF",  fullName: "Kamil Faizy",            position: "Usthad", color: "#FF0000", colorSoft: "#FFCCCC", syllabusPdf: "/syllabus/KF.pdf"  },
  { code: "AF",  shortName: "AF",  fullName: "Ajsal Faizy",            position: "Usthad", color: "#BDD7EE", colorSoft: "#E5EFF8", syllabusPdf: "/syllabus/AF.pdf"  },
  { code: "NF",  shortName: "NF",  fullName: "Nisar Faizy",            position: "Usthad", color: "#FF00FF", colorSoft: "#FFCCFF", syllabusPdf: "/syllabus/NF.pdf"  },
  { code: "SN",  shortName: "SN",  fullName: "Sinan Nadwi",            position: "Usthad", color: "#FFE699", colorSoft: "#FFF4D1" },
];

export function textOn(hex: string): "#000000" | "#FFFFFF" {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.6 ? "#000000" : "#FFFFFF";
}

export const TEACHER_BY_CODE: Record<string, Teacher> = Object.fromEntries(
  TEACHERS.map((t) => [t.code, t]),
);

export const CLASSES = ["S1", "S2", "S3", "S4", "S5", "S6", "S7"] as const;
export type ClassId = (typeof CLASSES)[number];

export interface Slot {
  teacher: string;
  className: ClassId;
  subject: string;
}

export type DaySchedule = Record<PeriodNum, Slot[]>;
export type FullSchedule = Record<DayCode, DaySchedule>;

const emptyDay = (): DaySchedule => ({
  0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [],
});

// ---------- Source data: CLASS × DAY × 10 periods ----------
// Each cell is [teacherCode, subject] or null. Order: P1, P1(2), P2, P3, P4, P5, P6, P7, P8, P9.
type Cell = [string, string] | null;
type DayRows = Record<ClassId, Cell[]>;

const CLASS_DATA: Record<DayCode, DayRows> = {
  SAT: {
    S1: [null, null, ["AF","Nahvu (Avamil)"], ["NF","Aqeeda"], ["SF","Thareekh"], ["SW","Insha'"], ["HU","Fiqh"], ["AJR","Swarf"], ["AF","Adab"], null],
    S2: [null, null, ["AJR","Thafseer"], ["AF","Thasavvuf"], ["NF","Insha'"], ["KF","Swarf"], ["AF","Fiqh"], ["SW","Adab"], ["SSH","Urdu"], null],
    S3: [null, null, ["SSH","Thafseer"], ["HU","Fiqh"], ["AJR","Balaga"], ["NF","Insha'"], ["KF","Nahvu"], ["AF","Hadees"], ["HU","Urdu"], ["SH","Thareekh"]],
    S4: [null, ["SSH","Insha'"], ["HU","Nahvu"], ["SW","Politics"], ["HW","English"], ["SH","Hadees"], ["AJR","Fiqh"], ["KF","Sociology"], ["SF","Arabic"], ["KF","Urdu"]],
    S5: [null, ["AJR","Thafseer"], ["ZU","Nahvu"], ["HU","Fiqh"], ["SH","History"], ["HW","Hadees"], ["SW","Insha'"], ["SSH","Manthiq"], ["NF","English"], ["AF","Adab"]],
    S6: [null, ["SW","Thafseer"], ["NF","Balaga"], ["ZU","Nahvu"], ["HU","Fiqh"], ["SF","Hadees"], ["SSH","IT"], ["SH","AEC"], ["ZU","Thasavvuf"], ["SN","Minor"]],
    S7: [null, ["HU","Thafseer"], ["SW","Adab"], ["AJR","Manthiq"], ["KF","Translation"], ["ZU","Usoolul Fiqh"], ["SF","Hadees"], ["ZU","Fiqh"], ["SN","Minor politics"], ["SN","Minor politics"]],
  },
  SUN: {
    S1: [["KF","Nahvu (Nahvul Valih)"], null, ["AJR","Swarf"], ["SSH","Urdu"], ["AF","Adab"], ["NF","Aqeeda"], ["SW","Insha'"], ["HW","Khath"], ["SW","Thilava"], null],
    S2: [["AF","Thasavvuf"], null, ["SW","Thareekh"], ["AJR","Nahvu"], ["NF","Insha'"], ["SF","Thilava"], ["AJR","Nahvu"], ["SSH","Urdu"], ["AF","Fiqh"], null],
    S3: [["SSH","Fiqh"], null, ["KF","Nahvu"], ["AF","Hadees"], ["SH","Thareekh"], ["AJR","Balaga"], ["KF","Nahvu"], ["HU","Urdu"], ["NF","Insha'"], null],
    S4: [null, ["HU","Nahvu"], ["AF","Economics"], ["SW","Adab"], ["HW","English"], ["SH","History"], ["HU","Nahvu"], ["AJR","Fiqh"], ["ZU","Thasavvuf"], ["SSH","IT"]],
    S5: [null, ["AJR","Thafseer"], ["ZU","Nahvu"], ["HU","Fiqh"], ["KF","Sociology"], ["AF","Economics"], ["SSH","IT"], ["SW","Politics"], ["SF","Arabic"], ["HW","Hadees"]],
    S6: [null, ["SW","Thafseer"], ["NF","Balaga"], ["ZU","Nahvu"], ["HU","Fiqh"], ["SSH","Manthiq"], ["ZU","Thasavvuf"], ["SH","AEC"], ["KF","Urdu"], ["SN","Minor"]],
    S7: [null, ["ZU","Usoolul Fiqh"], ["HU","Thafseer"], ["NF","Balaga"], ["SF","Hadees"], ["ZU","Fiqh"], ["SH","AEC"], ["KF","Translation"], ["HW","Thasavvuf"], ["SN","Minor"]],
  },
  MON: {
    S1: [["AF","Nahvu (Avamil)"], null, ["KF","Nahvu (Nahvul Valih)"], ["SW","Insha'"], ["SF","Thareekh"], null, null, null, null, null],
    S2: [["KF","Swarf"], null, ["AF","Fiqh"], ["AJR","Nahvu"], ["SW","Adab"], null, null, null, null, null],
    S3: [["SSH","Fiqh"], null, ["NF","Insha'"], ["KF","Nahvu"], null, null, null, null, null, null],
    S4: [null, ["NF","Balaga"], ["SSH","Insha'"], ["AF","Economics"], ["HW","English"], ["SH","History"], ["KF","Urdu"], ["ZU","Thasavvuf"], ["AJR","Fiqh"], ["SW","Politics"]],
    S5: [null, ["AJR","Thafseer"], ["ZU","Nahvu"], ["NF","English"], ["SH","History"], ["HW","Hadees"], ["AF","Economics"], ["SW","Insha'"], ["AF","Adab"], ["SSH","IT"]],
    S6: [null, ["SW","Thafseer"], ["AJR","Adab"], null, null, ["SF","Hadees"], ["HW","Insha'"], ["SSH","Manthiq"], ["ZU","Nahvu"], ["KF","MDC"]],
    S7: [null, ["ZU","Usoolul Fiqh"], ["SW","Adab"], null, null, ["NF","Balaga"], ["SF","Hadees"], ["KF","Urdu"], ["SSH","Thakhassus"], ["AJR","Manthiq"]],
  },
  TUE: {
    S1: [["KF","Nahvu (Nahvul Valih)"], ["SSH","Urdu"], ["AJR","Swarf"], ["SW","Thilava"], null, null, null, null, null, null],
    S2: [["AF","Fiqh"], ["SW","Thareekh"], ["NF","Insha'"], null, null, null, null, null, null, null],
    S3: [["SSH","Fiqh"], ["AF","Hadees"], ["KF","Nahvu"], null, null, null, null, null, null, null],
    S4: [null, ["NF","Balaga"], ["KF","Sociology"], ["SW","Adab"], ["SH","History"], null, ["SSH","IT"], ["AJR","Fiqh"], ["ZU","Thasavvuf"], ["AF","Economics"]],
    S5: [null, ["AJR","Thafseer"], ["ZU","Nahvu"], ["AF","Economics"], ["KF","Urdu"], ["HU","Fiqh"], null, ["KF","Sociology"], ["NF","English"], ["SW","Politics"]],
    S6: [null, ["SW","Thafseer"], ["NF","Balaga"], null, null, ["SF","Hadees"], null, ["HU","Fiqh"], ["SSH","IT"], ["NF","Translation"]],
    S7: [null, ["ZU","Usoolul Fiqh"], ["AJR","Manthiq"], null, null, null, null, ["SSH","IT"], ["SF","MDC"], ["HU","Thafseer"]],
  },
  WED: {
    S1: [["AF","Adab"], ["KF","Nahvu (Nahvul Valih)"], ["SW","Insha'"], ["HU","Fiqh"], null, null, null, null, null, null],
    S2: [["KF","Swarf"], ["AF","Thasavvuf"], ["AJR","Nahvu"], ["NF","Insha'"], null, null, null, null, null, null],
    S3: [["SSH","Fiqh"], ["AJR","Balaga"], ["KF","Nahvu"], null, null, null, null, null, null, null],
    S4: [null, ["HU","Nahvu"], ["NF","Balaga"], ["AF","Economics"], ["HW","English"], ["SH","Hadees"], ["KF","Sociology"], ["AJR","Fiqh"], ["ZU","Thasavvuf"], ["SW","Politics"]],
    S5: [null, ["AJR","Thafseer"], ["ZU","Nahvu"], ["HU","Fiqh"], ["SH","History"], ["HW","Hadees"], ["SSH","Manthiq"], ["NF","English"], ["AF","Economics"], ["KF","Urdu"]],
    S6: [null, ["SW","Thafseer"], ["HU","Fiqh"], null, null, ["SF","Hadees"], ["ZU","Nahvu"], ["SSH","Manthiq"], ["NF","Translation"], ["AJR","Adab"]],
    S7: [null, ["ZU","Usoolul Fiqh"], ["SSH","IT"], null, null, null, ["SF","Hadees"], ["SW","Adab"], ["HW","Thasavvuf"], ["HU","Thafseer"]],
  },
  THU: {
    S1: [["HU","Fiqh"], ["AJR","Swarf"], ["AF","Nahvu (Avamil)"], ["KF","Tharbiya"], null, null, null, null, null, null],
    S2: [["AF","Fiqh"], ["KF","Swarf"], ["AJR","Nahvu"], ["SW","Adab"], null, null, null, null, null, null],
    S3: [["KF","Nahvu"], ["AF","Hadees"], ["SSH","Fiqh"], ["SH","Thareekh"], null, null, null, null, null, null],
    S4: [null, ["HU","Nahvu"], ["NF","Balaga"], ["SW","Adab"], ["HW","English"], ["SH","History"], ["SSH","Insha'"], ["AF","Economics"], ["AJR","Fiqh"], ["HU","Nahvu"]],
    S5: [null, ["AJR","Thafseer"], ["ZU","Nahvu"], ["NF","English"], ["AF","Economics"], ["SSH","Manthiq"], ["SW","Politics"], ["KF","Sociology"], ["HU","Fiqh"], ["HW","Hadees"]],
    S6: [null, ["SW","Thafseer"], ["HU","Fiqh"], null, ["ZU","Thasavvuf"], ["SF","Hadees"], ["ZU","Nahvu"], ["SSH","Manthiq"], ["HW","Insha'"], ["SN","Minor"]],
    S7: [null, ["ZU","Usoolul Fiqh"], ["SSH","Thakhassus"], null, ["NF","Balaga"], ["ZU","Fiqh"], ["HW","Thasavvuf"], ["HU","Thafseer"], ["SF","Life"], ["AJR","Manthiq"]],
  },
};

const SCHEDULE: FullSchedule = {
  SAT: emptyDay(), SUN: emptyDay(), MON: emptyDay(),
  TUE: emptyDay(), WED: emptyDay(), THU: emptyDay(),
};

for (const day of DAYS) {
  for (const cls of CLASSES) {
    const row = CLASS_DATA[day][cls];
    row.forEach((cell, idx) => {
      if (!cell) return;
      const p = idx as PeriodNum;
      const [teacher, subject] = cell;
      SCHEDULE[day][p].push({ teacher, className: cls, subject });
    });
  }
}

export { SCHEDULE };

// ---------- Derived helpers ----------

export function getTeacherSchedule(code: string): Record<DayCode, Record<PeriodNum, Slot | null>> {
  const out = {} as Record<DayCode, Record<PeriodNum, Slot | null>>;
  for (const d of DAYS) {
    out[d] = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null };
    for (const p of PERIODS) {
      out[d][p] = SCHEDULE[d][p].find((s) => s.teacher === code) || null;
    }
  }
  return out;
}

export function getClassSchedule(cls: ClassId): Record<DayCode, Record<PeriodNum, Slot | null>> {
  const out = {} as Record<DayCode, Record<PeriodNum, Slot | null>>;
  for (const d of DAYS) {
    out[d] = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null };
    for (const p of PERIODS) {
      out[d][p] = SCHEDULE[d][p].find((s) => s.className === cls) || null;
    }
  }
  return out;
}

export interface TeacherStats {
  totalWeeklyPeriods: number;
  totalClasses: number;
  classesAssigned: ClassId[];
  subjects: string[];
  periodsByDay: Record<DayCode, number>;
  workloadPercent: number;
}

export function getTeacherStats(code: string): TeacherStats {
  const sched = getTeacherSchedule(code);
  let total = 0;
  const classes = new Set<ClassId>();
  const subjects = new Set<string>();
  const byDay = {} as Record<DayCode, number>;
  for (const d of DAYS) {
    let n = 0;
    for (const p of PERIODS) {
      const s = sched[d][p];
      if (s) { n++; total++; classes.add(s.className); subjects.add(s.subject); }
    }
    byDay[d] = n;
  }
  return {
    totalWeeklyPeriods: total,
    totalClasses: classes.size,
    classesAssigned: Array.from(classes).sort(),
    subjects: Array.from(subjects).sort(),
    periodsByDay: byDay,
    workloadPercent: 0,
  };
}

const allStats = TEACHERS.map((t) => ({ code: t.code, total: getTeacherStats(t.code).totalWeeklyPeriods }));
const MAX_LOAD = Math.max(...allStats.map((s) => s.total), 1);
export const TEACHER_LOADS = Object.fromEntries(allStats.map((s) => [s.code, s.total]));
export function workloadPercent(code: string) {
  return Math.round((TEACHER_LOADS[code] / MAX_LOAD) * 100);
}

export function jsDayToCode(d: number): DayCode | null {
  switch (d) {
    case 6: return "SAT";
    case 0: return "SUN";
    case 1: return "MON";
    case 2: return "TUE";
    case 3: return "WED";
    case 4: return "THU";
    case 5: return null; // Friday off
    default: return null;
  }
}

export type NowStatus =
  | { kind: "teaching"; slot: Slot; period: PeriodTime }
  | { kind: "free"; period: PeriodTime }
  | { kind: "break"; breakSlot: BreakSlot }
  | { kind: "before"; nextPeriod: PeriodTime }
  | { kind: "finished" }
  | { kind: "off" };

export function getCurrentStatus(code: string, now: Date = new Date()): NowStatus {
  const day = jsDayToCode(now.getDay());
  if (!day) return { kind: "off" };
  const mins = now.getHours() * 60 + now.getMinutes();
  for (const p of PERIOD_TIMES) {
    if (mins >= p.startMin && mins < p.endMin) {
      const slot = SCHEDULE[day][p.period].find((s) => s.teacher === code);
      return slot ? { kind: "teaching", slot, period: p } : { kind: "free", period: p };
    }
  }
  for (const b of BREAKS) {
    if (mins >= b.startMin && mins < b.endMin) return { kind: "break", breakSlot: b };
  }
  if (mins < PERIOD_TIMES[0].startMin) return { kind: "before", nextPeriod: PERIOD_TIMES[0] };
  return { kind: "finished" };
}

export function getRemainingPeriodsToday(code: string, now: Date = new Date()): number {
  const day = jsDayToCode(now.getDay());
  if (!day) return 0;
  const mins = now.getHours() * 60 + now.getMinutes();
  let n = 0;
  for (const p of PERIOD_TIMES) {
    if (p.endMin > mins) {
      const slot = SCHEDULE[day][p.period].find((s) => s.teacher === code);
      if (slot) n++;
    }
  }
  return n;
}

export function getNextPeriodForTeacher(code: string, now: Date = new Date()): { period: PeriodTime; slot: Slot } | null {
  const day = jsDayToCode(now.getDay());
  if (!day) return null;
  const mins = now.getHours() * 60 + now.getMinutes();
  for (const p of PERIOD_TIMES) {
    if (p.startMin > mins) {
      const slot = SCHEDULE[day][p.period].find((s) => s.teacher === code);
      if (slot) return { period: p, slot };
    }
  }
  return null;
}

export function formatTime12(hhmm: string): string {
  const [hStr, m] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const am = h < 12;
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${am ? "AM" : "PM"}`;
}

// Short label for a period index (0 → "P1", 1 → "P1 (2)", etc.)
export function periodLabel(p: PeriodNum): string {
  return PERIOD_TIMES.find((pt) => pt.period === p)?.labelShort ?? `P${p}`;
}
