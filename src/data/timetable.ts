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

// IMPORTANT: There are TWO independent first periods in the official PDF:
//   Period 0  → P1       (5:50 AM – 6:35 AM)   [only SUN..THU have this]
//   Period 1  → P1-(2)   (7:00 AM – 7:40 AM)   [only SAT/SUN/MON have this]
// They must NEVER be merged. Counting rule: both count as separate periods.
export type PeriodNum = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const PERIODS: PeriodNum[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const PERIOD_LABELS: Record<PeriodNum, string> = {
  0: "P1",
  1: "P1-(2)",
  2: "P2",
  3: "P3",
  4: "P4",
  5: "P5",
  6: "P6",
  7: "P7",
  8: "P8",
  9: "P9",
};

export interface PeriodTime {
  period: PeriodNum;
  label: string;
  start: string; // HH:MM 24h
  end: string;
  startMin: number;
  endMin: number;
}

const t = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export const PERIOD_TIMES: PeriodTime[] = [
  { period: 0, label: "P1",     start: "05:50", end: "06:35", startMin: t("05:50"), endMin: t("06:35") },
  { period: 1, label: "P1-(2)", start: "07:00", end: "07:40", startMin: t("07:00"), endMin: t("07:40") },
  { period: 2, label: "P2",     start: "07:40", end: "08:20", startMin: t("07:40"), endMin: t("08:20") },
  { period: 3, label: "P3",     start: "08:20", end: "09:00", startMin: t("08:20"), endMin: t("09:00") },
  { period: 4, label: "P4",     start: "09:40", end: "10:20", startMin: t("09:40"), endMin: t("10:20") },
  { period: 5, label: "P5",     start: "10:20", end: "11:00", startMin: t("10:20"), endMin: t("11:00") },
  { period: 6, label: "P6",     start: "11:15", end: "12:00", startMin: t("11:15"), endMin: t("12:00") },
  { period: 7, label: "P7",     start: "12:00", end: "12:45", startMin: t("12:00"), endMin: t("12:45") },
  { period: 8, label: "P8",     start: "14:15", end: "15:00", startMin: t("14:15"), endMin: t("15:00") },
  { period: 9, label: "P9",     start: "15:00", end: "15:45", startMin: t("15:00"), endMin: t("15:45") },
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

// Ordered timetable columns (periods + breaks) for rendering.
export type ColumnEntry =
  | { type: "period"; period: PeriodTime }
  | { type: "break"; brk: BreakSlot };

export const TIMETABLE_COLUMNS: ColumnEntry[] = [
  { type: "period", period: PERIOD_TIMES[0] }, // P1 early
  { type: "break",  brk: BREAKS[0] },          // Get Fresh
  { type: "period", period: PERIOD_TIMES[1] }, // P1-(2)
  { type: "period", period: PERIOD_TIMES[2] },
  { type: "period", period: PERIOD_TIMES[3] },
  { type: "break",  brk: BREAKS[1] },          // Breakfast
  { type: "period", period: PERIOD_TIMES[4] },
  { type: "period", period: PERIOD_TIMES[5] },
  { type: "break",  brk: BREAKS[2] },          // Interval
  { type: "period", period: PERIOD_TIMES[6] },
  { type: "period", period: PERIOD_TIMES[7] },
  { type: "break",  brk: BREAKS[3] },          // Prayer & Lunch
  { type: "period", period: PERIOD_TIMES[8] },
  { type: "period", period: PERIOD_TIMES[9] },
];

export interface Teacher {
  code: string;
  shortName: string;
  fullName: string;
  position: string;
  color: string; // EXACT colour from the official PDF legend
  colorSoft: string; // soft bg derived from color
  syllabusPdf?: string;
}

// Colours below are read directly from the official timetable PDF legend
// (Page 3 of NEW TT 3.pdf). Do not redesign or replace them.
// Colours read directly from PDF fill data (RGB → hex, verified programmatically).
export const TEACHERS: Teacher[] = [
  { code: "HU",  shortName: "HU",  fullName: "Hassan Hudawi",          position: "Usthad", color: "#548235", colorSoft: "#E3EDD7", syllabusPdf: "/syllabus/HU.pdf"  },
  { code: "ZU",  shortName: "ZU",  fullName: "Muhammed Zaini",         position: "Usthad", color: "#FFFF00", colorSoft: "#FFFFCC", syllabusPdf: "/syllabus/ZU.pdf"  },
  { code: "HW",  shortName: "HW",  fullName: "Haneefa Wafy",           position: "Usthad", color: "#7030A0", colorSoft: "#E2D4ED", syllabusPdf: "/syllabus/HW.pdf"  },
  { code: "SF",  shortName: "SF",  fullName: "Shafeeq Faizy",          position: "Usthad", color: "#2345D7", colorSoft: "#D4DBF7", syllabusPdf: "/syllabus/SF.pdf"  },
  { code: "SH",  shortName: "SH",  fullName: "Swalih Hudawi",          position: "Usthad", color: "#92D050", colorSoft: "#E4F2D2", syllabusPdf: "/syllabus/SH.pdf"  },
  { code: "SW",  shortName: "SW",  fullName: "Sufaid Wafy",            position: "Usthad", color: "#833C0C", colorSoft: "#E8D5C4", syllabusPdf: "/syllabus/SW.pdf"  },
  { code: "SSH", shortName: "SSH", fullName: "Sayyid Shafi Hudawi",    position: "Usthad", color: "#00B0F0", colorSoft: "#CCEFFB", syllabusPdf: "/syllabus/SSH.pdf" },
  { code: "AJR", shortName: "AJR", fullName: "Azhar Jamal Rahmani",    position: "Usthad", color: "#ED7D31", colorSoft: "#FBE0CD", syllabusPdf: "/syllabus/AJR.pdf" },
  { code: "KF",  shortName: "KF",  fullName: "Kamil Faizy",            position: "Usthad", color: "#FF0000", colorSoft: "#FFCCCC", syllabusPdf: "/syllabus/KF.pdf"  },
  { code: "AF",  shortName: "AF",  fullName: "Ajsal Faizy",            position: "Usthad", color: "#B4C6E7", colorSoft: "#E1E8F5", syllabusPdf: "/syllabus/AF.pdf"  },
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
  teacher: string;
  className: ClassId;
  subject: string;
}

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

// Row format: [day, p0, p1, p2, p3, p4, p5, p6, p7, p8, p9]
// p0 = P1 (5:50–6:35) — only SUN..THU
// p1 = P1-(2) (7:00–7:40) — only SAT/SUN/MON
type Row = [DayCode, ...(string | null)[]];

const RAW: Record<string, Row[]> = {
  HU: [
    ["SAT", null, "S7 - Thafseer", "S4 - Nahvu", "S5 - Fiqh", "S6 - Fiqh", null, "S1 - Fiqh", null, "S3 - Urdu", null],
    ["SUN", null, "S4 - Nahvu", "S7 - Thafseer", "S5 - Fiqh", "S6 - Fiqh", null, "S4 - Nahvu", "S3 - Urdu", null, null],
    ["MON", null, null, null, null, null, null, null, null, null, null],
    ["TUE", null, null, null, null, "S4 - Nahvu", "S5 - Fiqh", "S7 - Thafseer", "S6 - Fiqh", null, "S7 - Thafseer"],
    ["WED", null, "S4 - Nahvu", "S6 - Fiqh", "S5 - Fiqh", "S1 - Fiqh", null, null, null, null, "S7 - Thafseer"],
    ["THU", "S1 - Fiqh", "S4 - Nahvu", "S6 - Fiqh", null, null, null, null, "S7 - Thafseer", "S5 - Fiqh", "S4 - Nahvu"],
  ],
  ZU: [
    ["SAT", null, null, "S5 - Nahvu", "S6 - Nahvu", null, "S7 - Usoolul Fiqh", null, "S7 - Fiqh", "S6 - Thasavvuf", null],
    ["SUN", null, "S7 - Usoolul Fiqh", "S5 - Nahvu", "S6 - Nahvu", null, "S7 - Fiqh", "S6 - Thasavvuf", null, "S4 - Thasavvuf", null],
    ["MON", null, "S7 - Usoolul Fiqh", "S5 - Nahvu", null, null, null, null, "S4 - Thasavvuf", "S6 - Nahvu", null],
    ["TUE", null, "S7 - Usoolul Fiqh", "S5 - Nahvu", null, null, "S7 - Fiqh", "S6 - Nahvu", null, "S4 - Thasavvuf", null],
    ["WED", null, "S7 - Usoolul Fiqh", "S5 - Nahvu", null, null, "S7 - Fiqh", "S6 - Nahvu", null, "S4 - Thasavvuf", null],
    ["THU", null, "S7 - Usoolul Fiqh", "S5 - Nahvu", null, "S6 - Thasavvuf", "S7 - Fiqh", "S6 - Nahvu", null, null, null],
  ],
  HW: [
    ["SAT", null, null, null, null, "S4 - English", "S5 - Hadees", null, null, null, null],
    ["SUN", null, null, null, null, "S4 - English", null, null, "S1 - Khath", "S7 - Thasavvuf", "S5 - Hadees"],
    ["MON", null, null, null, null, "S4 - English", "S5 - Hadees", "S6 - Insha'", null, null, null],
    ["TUE", null, null, null, null, null, null, null, null, null, null],
    ["WED", null, null, null, null, "S4 - English", "S5 - Hadees", null, null, "S7 - Thasavvuf", null],
    ["THU", null, null, null, null, "S4 - English", null, "S7 - Thasavvuf", null, "S6 - Insha'", "S5 - Hadees"],
  ],
  SF: [
    ["SAT", null, null, null, null, "S1 - Thareekh", "S6 - Hadees", "S7 - Hadees", null, "S4 - Arabic", null],
    ["SUN", null, null, null, null, "S7 - Hadees", "S2 - Thilava", null, null, "S5 - Arabic", null],
    ["MON", null, null, null, null, "S1 - Thareekh", "S6 - Hadees", "S7 - Hadees", null, null, null],
    ["TUE", null, null, null, null, null, "S6 - Hadees", null, null, "S7 - MDC", null],
    ["WED", null, null, null, null, null, "S6 - Hadees", "S7 - Hadees", null, null, null],
    ["THU", null, null, null, null, null, "S6 - Hadees", null, null, "S7 - Life", null],
  ],
  SH: [
    ["SAT", null, null, null, null, "S5 - History", "S4 - Hadees", null, "S6 - AEC", null, "S3 - Thareekh"],
    ["SUN", null, null, null, null, "S3 - Thareekh", "S4 - History", "S7 - AEC", "S6 - AEC", null, null],
    ["MON", null, null, null, null, "S5 - History", "S4 - Hadees", null, null, null, null],
    ["TUE", null, null, null, null, "S3 - Thareekh", "S4 - History", null, null, null, null],
    ["WED", null, null, null, null, "S5 - History", "S4 - Hadees", null, null, null, null],
    ["THU", null, null, null, null, "S3 - Thareekh", "S4 - History", null, null, null, null],
  ],
  SW: [
    ["SAT", null, "S6 - Thafseer", "S7 - Adab", "S4 - Politics", null, "S1 - Insha'", "S5 - Insha'", "S2 - Adab", null, null],
    ["SUN", null, "S6 - Thafseer", "S2 - Thareekh", "S4 - Adab", null, null, "S1 - Insha'", "S5 - Politics", "S1 - Thilava", null],
    ["MON", null, "S6 - Thafseer", "S7 - Adab", "S1 - Insha'", "S2 - Adab", null, null, "S5 - Insha'", null, "S4 - Politics"],
    ["TUE", null, "S6 - Thafseer", "S2 - Thareekh", "S4 - Adab", "S1 - Thilava", null, null, null, null, "S5 - Politics"],
    ["WED", null, "S6 - Thafseer", null, "S1 - Insha'", null, null, null, "S7 - Adab", null, "S4 - Politics"],
    ["THU", null, "S6 - Thafseer", null, "S4 - Adab", "S2 - Adab", null, "S5 - Politics", null, null, null],
  ],
  SSH: [
    ["SAT", null, "S4 - Insha'", "S3 - Fiqh", null, null, null, "S6 - IT", "S5 - Manthiq", "S2 - Urdu", null],
    ["SUN", "S3 - Fiqh", null, null, "S1 - Urdu", null, "S6 - Manthiq", "S5 - IT", "S2 - Urdu", null, "S4 - IT"],
    ["MON", "S3 - Fiqh", null, "S4 - Insha'", null, null, null, null, "S6 - Manthiq", "S7 - Thakhassus", "S5 - IT"],
    ["TUE", "S3 - Fiqh", null, "S1 - Urdu", null, null, null, "S4 - IT", "S7 - IT", "S6 - IT", null],
    ["WED", "S3 - Fiqh", null, "S7 - IT", null, null, null, "S5 - Manthiq", "S6 - Manthiq", null, null],
    ["THU", null, null, "S7 - Thakhassus", "S3 - Fiqh", null, "S5 - Manthiq", "S4 - Insha'", "S6 - Manthiq", null, null],
  ],
  AJR: [
    ["SAT", null, "S5 - Thafseer", "S2 - Nahvu", "S7 - Manthiq", "S3 - Balaga", null, "S4 - Fiqh", "S1 - Swarf", null, null],
    ["SUN", null, "S5 - Thafseer", "S1 - Swarf", "S2 - Nahvu", null, "S3 - Balaga", "S2 - Nahvu", "S4 - Fiqh", null, null],
    ["MON", null, "S5 - Thafseer", "S6 - Adab", "S2 - Nahvu", null, null, null, null, "S4 - Fiqh", "S7 - Manthiq"],
    ["TUE", null, "S5 - Thafseer", "S7 - Manthiq", "S1 - Swarf", "S2 - Nahvu", null, null, "S4 - Fiqh", null, null],
    ["WED", null, "S5 - Thafseer", "S3 - Balaga", "S2 - Nahvu", null, null, null, "S4 - Fiqh", null, "S6 - Adab"],
    ["THU", null, "S5 - Thafseer", "S1 - Swarf", "S2 - Nahvu", null, null, null, null, "S4 - Fiqh", "S7 - Manthiq"],
  ],
  KF: [
    ["SAT", null, null, null, "S3 - Nahvu", "S7 - Translation", "S2 - Swarf", "S3 - Nahvu", "S4 - Sociology", null, "S4 - Urdu"],
    ["SUN", "S1 - Nahvu (Nahvul Valih)", null, "S3 - Nahvu", null, "S5 - Sociology", null, "S3 - Nahvu", "S7 - Translation", "S6 - Urdu", null],
    ["MON", "S2 - Swarf", null, "S1 - Nahvu (Nahvul Valih)", "S3 - Nahvu", null, null, "S4 - Urdu", "S7 - Urdu", null, "S6 - MDC"],
    ["TUE", "S1 - Nahvu (Nahvul Valih)", null, "S4 - Sociology", "S3 - Nahvu", "S5 - Urdu", null, null, "S5 - Sociology", null, null],
    ["WED", "S2 - Swarf", null, "S1 - Nahvu (Nahvul Valih)", "S3 - Nahvu", null, null, "S4 - Sociology", null, null, "S5 - Urdu"],
    ["THU", "S3 - Nahvu", null, "S2 - Swarf", null, "S1 - Tharbiya", null, null, "S5 - Sociology", null, null],
  ],
  AF: [
    ["SAT", null, null, "S1 - Nahvu (Avamil)", "S2 - Thasavvuf", null, null, "S2 - Fiqh", "S3 - Hadees", "S1 - Adab", "S5 - Adab"],
    ["SUN", "S2 - Thasavvuf", null, "S4 - Economics", "S3 - Hadees", "S1 - Adab", "S5 - Economics", null, null, "S2 - Fiqh", null],
    ["MON", "S1 - Nahvu (Avamil)", null, "S2 - Fiqh", "S4 - Economics", null, null, "S5 - Economics", null, "S5 - Adab", null],
    ["TUE", "S2 - Fiqh", null, "S3 - Hadees", "S5 - Economics", null, null, "S5 - Adab", null, null, "S4 - Economics"],
    ["WED", "S1 - Adab", null, "S2 - Thasavvuf", "S4 - Economics", null, null, null, null, "S5 - Economics", null],
    ["THU", "S2 - Fiqh", null, "S3 - Hadees", "S1 - Nahvu (Avamil)", "S5 - Economics", null, null, "S4 - Economics", null, null],
  ],
  NF: [
    ["SAT", null, null, "S6 - Balaga", "S1 - Aqeeda", "S2 - Insha'", "S3 - Insha'", null, null, "S5 - English", null],
    ["SUN", null, null, "S6 - Balaga", "S7 - Balaga", "S2 - Insha'", "S1 - Aqeeda", null, null, "S3 - Insha'", null],
    ["MON", null, "S4 - Balaga", "S3 - Insha'", "S5 - English", null, "S7 - Balaga", null, null, null, null],
    ["TUE", null, "S4 - Balaga", "S6 - Balaga", "S2 - Insha'", null, null, null, null, "S5 - English", "S6 - Translation"],
    ["WED", null, null, "S4 - Balaga", null, "S2 - Insha'", null, null, "S5 - English", "S6 - Translation", null],
    ["THU", null, null, "S4 - Balaga", "S5 - English", "S7 - Balaga", null, null, null, null, null],
  ],
  // SN: shared minor classes. S7 - Minor politics on SAT spans P8+P9.
  // On SUN & THU S6 - Minor is at P9 (last period).
  SN: [
    ["SAT", null, null, null, null, null, null, null, null, "S7 - Minor politics", "S7 - Minor politics"],
    ["SAT", null, null, null, null, null, null, null, null, null,                    "S6 - Minor"],
    ["SUN", null, null, null, null, null, null, null, null, null,                    "S6 - Minor"],
    ["SUN", null, null, null, null, null, null, null, null, null,                    "S7 - Minor politics"],
    ["THU", null, null, null, null, null, null, null, null, null,                    "S6 - Minor"],
  ],
};

// Populate SCHEDULE
for (const [code, rows] of Object.entries(RAW)) {
  for (const row of rows) {
    const day = row[0] as DayCode;
    for (let i = 0; i <= 9; i++) {
      const cell = row[i + 1];
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

export function jsDayToCode(d: number): DayCode | null {
  switch (d) {
    case 6: return "SAT";
    case 0: return "SUN";
    case 1: return "MON";
    case 2: return "TUE";
    case 3: return "WED";
    case 4: return "THU";
    case 5: return null;
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
