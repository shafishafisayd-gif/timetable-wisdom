// Single source of truth for Malja'a College timetable
// Extracted from the provided PDFs.

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

export type PeriodNum = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const PERIODS: PeriodNum[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Short label used everywhere in the UI. Period 0 is the early-morning P1
// (5:50 – 6:35) and period 1 is P1-(2) (7:00 – 7:40). They are TWO independent
// teaching periods and must NEVER be merged.
export function periodLabel(p: PeriodNum): string {
  if (p === 0) return "P1";
  if (p === 1) return "P1-(2)";
  return `P${p}`;
}

export interface PeriodTime {
  period: PeriodNum;
  label: string;       // short label (e.g. "P1", "P1-(2)", "P2")
  longLabel: string;   // long label (e.g. "Period 1", "Period 1-(2)")
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
  { period: 0, label: "P1",     longLabel: "Period 1",     start: "05:50", end: "06:35", startMin: t("05:50"), endMin: t("06:35") },
  { period: 1, label: "P1-(2)", longLabel: "Period 1-(2)", start: "07:00", end: "07:40", startMin: t("07:00"), endMin: t("07:40") },
  { period: 2, label: "P2",     longLabel: "Period 2",     start: "07:40", end: "08:20", startMin: t("07:40"), endMin: t("08:20") },
  { period: 3, label: "P3",     longLabel: "Period 3",     start: "08:20", end: "09:00", startMin: t("08:20"), endMin: t("09:00") },
  { period: 4, label: "P4",     longLabel: "Period 4",     start: "09:40", end: "10:20", startMin: t("09:40"), endMin: t("10:20") },
  { period: 5, label: "P5",     longLabel: "Period 5",     start: "10:20", end: "11:00", startMin: t("10:20"), endMin: t("11:00") },
  { period: 6, label: "P6",     longLabel: "Period 6",     start: "11:15", end: "12:00", startMin: t("11:15"), endMin: t("12:00") },
  { period: 7, label: "P7",     longLabel: "Period 7",     start: "12:00", end: "12:45", startMin: t("12:00"), endMin: t("12:45") },
  { period: 8, label: "P8",     longLabel: "Period 8",     start: "14:15", end: "15:00", startMin: t("14:15"), endMin: t("15:00") },
  { period: 9, label: "P9",     longLabel: "Period 9",     start: "15:00", end: "15:45", startMin: t("15:00"), endMin: t("15:45") },
];

export type BreakKind = "GET_FRESH" | "BREAKFAST" | "INTERVAL" | "PRAYER_LUNCH" | "AFTER";
export interface BreakSlot {
  kind: BreakKind;
  label: string;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
}

export const BREAKS: BreakSlot[] = [
  { kind: "BREAKFAST", label: "Breakfast", start: "09:00", end: "09:40", startMin: t("09:00"), endMin: t("09:40") },
  { kind: "INTERVAL", label: "Interval", start: "11:00", end: "11:15", startMin: t("11:00"), endMin: t("11:15") },
  { kind: "PRAYER_LUNCH", label: "Prayer & Lunch", start: "12:45", end: "14:15", startMin: t("12:45"), endMin: t("14:15") },
];

export interface Teacher {
  code: string;
  shortName: string;
  fullName: string;
  position: string;
  color: string; // EXACT colour from the official PDF legend
  colorSoft: string; // soft bg derived from color
  syllabusPdf?: string; // url to monthly syllabus pdf page
}

// Colours below are read directly from the official timetable PDF legend
// (Page 3 of NEW TT 3.pdf). Do not redesign or replace them.
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

// Pick readable text colour (black or white) for a given background hex.
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
  teacher: string; // teacher code
  className: ClassId;
  subject: string;
}

// schedule[day][period] = Slot[]  (multiple classes happen in parallel)
export type DaySchedule = Record<PeriodNum, Slot[]>;
export type FullSchedule = Record<DayCode, DaySchedule>;

const emptyDay = (): DaySchedule => ({
  0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [],
});

const SCHEDULE: FullSchedule = {
  SAT: emptyDay(),
  SUN: emptyDay(),
  MON: emptyDay(),
  TUE: emptyDay(),
  WED: emptyDay(),
  THU: emptyDay(),
};

// Raw teacher-wise data. Each row: [day, p1..p9] where each cell is "ClassId - Subject" or null.
type Row = [DayCode, ...(string | null)[]];

const RAW: Record<string, Row[]> = {
  HU: [
    ["SAT", "S7 - Thafseer", "S4 - Nahvu",     "S5 - Fiqh",      "S6 - Fiqh",      null,           "S1 - Fiqh",      null,           "S3 - Urdu",      null],
    ["SUN", "S4 - Nahvu",    "S7 - Thafseer",  "S5 - Fiqh",      "S6 - Fiqh",      null,           "S4 - Nahvu",     "S3 - Urdu",     null,             null],
    ["MON", null, null, null, null, null, null, null, null, null],
    ["TUE", null, null, null, "S4 - Nahvu",     "S5 - Fiqh",      "S7 - Thafseer",  "S6 - Fiqh",      null,           "S7 - Thafseer"],
    ["WED", "S4 - Nahvu",    "S6 - Fiqh",      "S5 - Fiqh",      "S1 - Fiqh",      null, null, null, null,           "S7 - Thafseer"],
    ["THU", "S1 - Fiqh",     "S4 - Nahvu",     "S6 - Fiqh",      null, null, null, "S7 - Thafseer",  "S5 - Fiqh",     "S4 - Nahvu"],
  ],
  ZU: [
    ["SAT", null,             "S5 - Nahvu",    "S6 - Nahvu",     null,             "S7 - Usoolul Fiqh", null,        "S7 - Fiqh",     "S6 - Thasavvuf", null],
    ["SUN", "S7 - Usoolul Fiqh","S5 - Nahvu",  "S6 - Nahvu",     null,             "S7 - Fiqh",        "S6 - Thasavvuf", null,        "S4 - Thasavvuf", null],
    ["MON", "S7 - Usoolul Fiqh","S5 - Nahvu",  null,             null, null, null, "S4 - Thasavvuf",   "S6 - Nahvu", null],
    ["TUE", "S7 - Usoolul Fiqh","S5 - Nahvu",  null, null,        "S7 - Fiqh",      "S6 - Nahvu",     null,           "S4 - Thasavvuf", null],
    ["WED", "S7 - Usoolul Fiqh","S5 - Nahvu",  null, null,        "S7 - Fiqh",      "S6 - Nahvu",     null,           "S4 - Thasavvuf", null],
    ["THU", "S7 - Usoolul Fiqh","S5 - Nahvu",  null, "S6 - Thasavvuf", "S7 - Fiqh", "S6 - Nahvu",     null, null, null],
  ],
  HW: [
    ["SAT", null, null, null, "S4 - English", "S5 - Hadees", null, null, null, null],
    ["SUN", null, null, null, "S4 - English", null, null, "S1 - Khath", "S7 - Thasavvuf", "S5 - Hadees"],
    ["MON", null, null, null, "S4 - English", "S5 - Hadees", "S6 - Insha'", null, null, null],
    ["TUE", null, null, null, null, null, null, null, null, null],
    ["WED", null, null, null, "S4 - English", "S5 - Hadees", null, null, "S7 - Thasavvuf", null],
    ["THU", null, null, null, "S4 - English", null, "S7 - Thasavvuf", null, "S6 - Insha'", "S5 - Hadees"],
  ],
  SF: [
    ["SAT", null, null, null, "S1 - Thareekh", "S6 - Hadees", "S7 - Hadees", null, "S4 - Arabic", null],
    ["SUN", null, null, null, "S7 - Hadees",   "S2 - Thilava",null,           null, "S5 - Arabic", null],
    ["MON", null, null, null, "S1 - Thareekh", "S6 - Hadees", "S7 - Hadees", null, null, null],
    ["TUE", null, null, null, null,            "S6 - Hadees", null, null, "S7 - MDC", null],
    ["WED", null, null, null, null,            "S6 - Hadees", "S7 - Hadees", null, null, null],
    ["THU", null, null, null, null,            "S6 - Hadees", null, null, "S7 - Life", null],
  ],
  SW: [
    ["SAT", "S6 - Thafseer", "S7 - Adab",     "S4 - Politics",  null,           "S1 - Insha'",    "S5 - Insha'",   "S2 - Adab",     null, null],
    ["SUN", "S6 - Thafseer", "S2 - Thareekh", "S4 - Adab",      null, null,     "S1 - Insha'",    "S5 - Politics", "S1 - Thilava", null],
    ["MON", "S6 - Thafseer", "S7 - Adab",     "S1 - Insha'",    "S2 - Adab",    null, null,       "S5 - Insha'",   null,           "S4 - Politics"],
    ["TUE", "S6 - Thafseer", "S2 - Thareekh", "S4 - Adab",      "S1 - Thilava", null, null, null, null,           "S5 - Politics"],
    ["WED", "S6 - Thafseer", null,             "S1 - Insha'",   null, null, null, "S7 - Adab",    null,           "S4 - Politics"],
    ["THU", "S6 - Thafseer", null,             "S4 - Adab",     "S2 - Adab",    null, "S5 - Politics", null, null, null],
  ],
  SH: [
    ["SAT", null, null, null, "S5 - History",  "S4 - Hadees",   null, "S6 - AEC",     null, "S3 - Thareekh"],
    ["SUN", null, null, null, "S3 - Thareekh", "S4 - History",  "S7 - AEC", "S6 - AEC", null, null],
    ["MON", null, null, null, "S5 - History",  "S4 - Hadees",   null, null, null, null],
    ["TUE", null, null, null, "S3 - Thareekh", "S4 - History",  null, null, null, null],
    ["WED", null, null, null, "S5 - History",  "S4 - Hadees",   null, null, null, null],
    ["THU", null, null, null, "S3 - Thareekh", "S4 - History",  null, null, null, null],
  ],
  SSH: [
    ["SAT", "S4 - Insha'",   "S3 - Fiqh",    null, null, null,        "S6 - IT",       "S5 - Manthiq", "S2 - Urdu", null],
    ["SUN", "S3 - Fiqh",     null,           "S1 - Urdu", null,       "S6 - Manthiq",  "S5 - IT",      "S2 - Urdu", null, "S4 - IT"],
    ["MON", "S3 - Fiqh",     "S4 - Insha'", null, null, null, null,   "S6 - Manthiq",  "S7 - Thakhassus", "S5 - IT"],
    ["TUE", "S3 - Fiqh",     "S1 - Urdu",   null, null, null,         "S4 - IT",       "S7 - IT",      "S6 - IT", null],
    ["WED", "S3 - Fiqh",     "S7 - IT",     null, null, null,         "S5 - Manthiq",  "S6 - Manthiq", null, null],
    ["THU", null,             "S7 - Thakhassus", "S3 - Fiqh", null,   "S5 - Manthiq",  "S4 - Insha'",  "S6 - Manthiq", null, null],
  ],
  AJR: [
    ["SAT", "S5 - Thafseer", "S2 - Nahvu",  "S7 - Manthiq", "S3 - Balaga", null,            "S4 - Fiqh", "S1 - Swarf", null, null],
    ["SUN", "S5 - Thafseer", "S1 - Swarf",  "S2 - Nahvu",   null,           "S3 - Balaga",  "S2 - Nahvu", "S4 - Fiqh", null, null],
    ["MON", "S5 - Thafseer", "S6 - Adab",   "S2 - Nahvu",   null, null, null, null,         "S4 - Fiqh", "S7 - Manthiq"],
    ["TUE", "S5 - Thafseer", "S7 - Manthiq","S1 - Swarf",   "S2 - Nahvu",   null, null,     "S4 - Fiqh", null, null],
    ["WED", "S5 - Thafseer", "S3 - Balaga", "S2 - Nahvu",   null, null, null, "S4 - Fiqh",  null, "S6 - Adab"],
    ["THU", "S5 - Thafseer", "S1 - Swarf",  "S2 - Nahvu",   null, null, null, null,         "S4 - Fiqh", "S7 - Manthiq"],
  ],
  KF: [
    ["SAT", null, null,                       "S3 - Nahvu",     "S7 - Translation","S2 - Swarf","S3 - Nahvu",    "S4 - Sociology", null, "S4 - Urdu"],
    ["SUN", "S1 - Nahvu (Nahvul Valih)", "S3 - Nahvu", null,    "S5 - Sociology",  null,        "S3 - Nahvu",    "S7 - Translation","S6 - Urdu", null],
    ["MON", "S2 - Swarf", "S1 - Nahvu (Nahvul Valih)", "S3 - Nahvu", null, null,   "S4 - Urdu", "S7 - Urdu",     null, "S6 - MDC"],
    ["TUE", "S1 - Nahvu (Nahvul Valih)", "S4 - Sociology", "S3 - Nahvu", "S5 - Urdu", null, null,"S5 - Sociology", null, null],
    ["WED", "S2 - Swarf", "S1 - Nahvu (Nahvul Valih)", "S3 - Nahvu", null, null,   "S4 - Sociology", null, null, "S5 - Urdu"],
    ["THU", "S3 - Nahvu", "S2 - Swarf", null, "S1 - Tharbiya", null, null,        "S5 - Sociology", null, null],
  ],
  AF: [
    ["SAT", null, "S1 - Nahvu (Avamil)", "S2 - Thasavvuf", null, null,        "S2 - Fiqh",  "S3 - Hadees", "S1 - Adab",     "S5 - Adab"],
    ["SUN", "S2 - Thasavvuf", "S4 - Economics","S3 - Hadees", "S1 - Adab",    "S5 - Economics", null, null,"S2 - Fiqh", null],
    ["MON", "S1 - Nahvu (Avamil)", "S2 - Fiqh", "S4 - Economics", null, null, "S5 - Economics", null, "S5 - Adab", null],
    ["TUE", "S2 - Fiqh",  "S3 - Hadees", "S5 - Economics", null, null,       "S5 - Adab",  null, null, "S4 - Economics"],
    ["WED", "S1 - Adab",  "S2 - Thasavvuf","S4 - Economics", null, null, null, null,       "S5 - Economics", null],
    ["THU", "S2 - Fiqh",  "S3 - Hadees", "S1 - Nahvu (Avamil)", "S5 - Economics", null, null,"S4 - Economics", null, null],
  ],
  NF: [
    ["SAT", null, "S6 - Balaga", "S1 - Aqeeda", "S2 - Insha'", "S3 - Insha'", null, null, "S5 - English", null],
    ["SUN", null, "S6 - Balaga", "S7 - Balaga", "S2 - Insha'", "S1 - Aqeeda", null, null, "S3 - Insha'", null],
    ["MON", "S4 - Balaga", "S3 - Insha'", "S5 - English", null, "S7 - Balaga", null, null, null, null],
    ["TUE", "S4 - Balaga", "S6 - Balaga", "S2 - Insha'", null, null, null, null, "S5 - English", "S6 - Translation"],
    ["WED", null, "S4 - Balaga", null, "S2 - Insha'", null, null, "S5 - English", "S6 - Translation", null],
    ["THU", null, "S4 - Balaga", "S5 - English", "S7 - Balaga", null, null, null, null, null],
  ],
  SN: [
    // Derived from overall TT (Minor / Minor politics)
    ["SAT", null, null, null, null, null, null, null, "S6 - Minor", null],
    ["SAT", null, null, null, null, null, null, null, "S7 - Minor politics", "S7 - Minor politics"],
    ["SUN", null, null, null, null, null, null, null, "S6 - Minor", null],
    ["SUN", null, null, null, null, null, null, null, null, "S7 - Minor"],
    ["THU", null, null, null, null, null, null, null, null, "S6 - Minor"],
  ],
};

// Populate SCHEDULE
for (const [code, rows] of Object.entries(RAW)) {
  for (const row of rows) {
    const day = row[0] as DayCode;
    for (let i = 1; i <= 9; i++) {
      const cell = row[i];
      if (!cell) continue;
      const m = (cell as string).match(/^(S[1-7])\s*-\s*(.+)$/);
      if (!m) continue;
      const className = m[1] as ClassId;
      const subject = m[2].trim();
      const p = i as PeriodNum;
      SCHEDULE[day][p].push({ teacher: code, className, subject });
    }
  }
}

export { SCHEDULE };

// ---------- Derived helpers ----------

export function getTeacherSchedule(code: string): Record<DayCode, Record<PeriodNum, Slot | null>> {
  const out = {} as Record<DayCode, Record<PeriodNum, Slot | null>>;
  for (const d of DAYS) {
    out[d] = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null };
    for (const p of PERIODS) {
      const slot = SCHEDULE[d][p].find((s) => s.teacher === code) || null;
      out[d][p] = slot;
    }
  }
  return out;
}

export function getClassSchedule(cls: ClassId): Record<DayCode, Record<PeriodNum, Slot | null>> {
  const out = {} as Record<DayCode, Record<PeriodNum, Slot | null>>;
  for (const d of DAYS) {
    out[d] = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null };
    for (const p of PERIODS) {
      const slot = SCHEDULE[d][p].find((s) => s.className === cls) || null;
      out[d][p] = slot;
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
  workloadPercent: number; // vs max teacher
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
      if (s) {
        n++;
        total++;
        classes.add(s.className);
        subjects.add(s.subject);
      }
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

// Current day mapping (JS getDay: 0=Sun..6=Sat). College runs Sat-Thu (off: Fri).
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
