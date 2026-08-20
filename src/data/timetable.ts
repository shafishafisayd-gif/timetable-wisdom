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
  /** Display subject. Equals SUBJECT_UNSPECIFIED when the PDF names no subject. */
  subject: string;
  /** True only when the finalized PDF explicitly writes a subject in the cell. */
  subjectSpecified: boolean;
  /** True when a temporary (single-day) override changed this slot. */
  temporary?: boolean;
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

// ---------------------------------------------------------------------------
// CANONICAL DATA — extracted programmatically from
// "TIME TABLE 2026 - 27 FINAL.pdf" (day x class x period grid, cell fill
// colours verified against the teacher legend).
//
// A cell may contain:
//   * teacher + subject          -> assigned period, subject specified
//   * teacher only               -> assigned period, SUBJECT NOT SPECIFIED
//   * BREAK                      -> the class's own break slot
//   * a special activity         -> e.g. SSLC / Samajam Prep / School Subject
//   * nothing                    -> genuinely free
// ---------------------------------------------------------------------------

export const SUBJECT_UNSPECIFIED = "Subject Not Specified";

type RawCell = [DayCode, ClassId, PeriodNum, string, string | null];

const CELLS: RawCell[] = [
  ["SAT","S1",2,"SW","Insha'"],
  ["SAT","S1",3,"AF","Nahvu (Avamil)"],
  ["SAT","S1",4,"KF","Tharbiya"],
  ["SAT","S1",5,"SF","Thareekh"],
  ["SAT","S1",6,"HU","Fiqh"],
  ["SAT","S1",7,"AJR","Swarf"],
  ["SAT","S1",8,"SW","Thilava & Hifz"],
  ["SAT","S1",9,"HW","Khath & Imla"],
  ["SAT","S2",2,"AF","Thasavvuf"],
  ["SAT","S2",3,"AJR","Nahvu"],
  ["SAT","S2",4,"NF","Insha'"],
  ["SAT","S2",5,"KF","Swarf"],
  ["SAT","S2",6,"AJR","Nahvu"],
  ["SAT","S2",7,"AF","Fiqh"],
  ["SAT","S2",8,"SSH","Urdu"],
  ["SAT","S2",9,"SW","Adab"],
  ["SAT","S3",0,"HU","Urdu"],
  ["SAT","S3",2,"NF","Insha'"],
  ["SAT","S3",3,"KF","Nahvu"],
  ["SAT","S3",4,"AJR","Balaga"],
  ["SAT","S3",5,"SSH","Fiqh"],
  ["SAT","S3",6,"AF","Hadees"],
  ["SAT","S3",7,"KF","Nahvu"],
  ["SAT","S3",8,"SH","Thareekh"],
  ["SAT","S3",9,"NF",null],
  ["SAT","S4",1,"SSH","Insha'"],
  ["SAT","S4",2,"AJR","Fiqh"],
  ["SAT","S4",3,"HU","Nahvu"],
  ["SAT","S4",4,"SW","Politics"],
  ["SAT","S4",5,"SH","Hadees"],
  ["SAT","S4",6,"KF","Urdu"],
  ["SAT","S4",7,"HW","English"],
  ["SAT","S4",8,"SF","Arabic"],
  ["SAT","S4",9,"KF","Sociology"],
  ["SAT","S5",1,"AJR","Thafseer"],
  ["SAT","S5",2,"HU","Fiqh"],
  ["SAT","S5",3,"SW","Insha'"],
  ["SAT","S5",4,"SH","History"],
  ["SAT","S5",5,"HW","Hadees"],
  ["SAT","S5",6,"SSH","Manthiq"],
  ["SAT","S5",7,"NF","English"],
  ["SAT","S5",8,"ZU","Nahvu"],
  ["SAT","S5",9,"AF","Adab"],
  ["SAT","S6",1,"SW","Thafseer"],
  ["SAT","S6",2,"SSH","Manthiq"],
  ["SAT","S6",3,"NF","Balaga"],
  ["SAT","S6",4,"ZU","Nahvu"],
  ["SAT","S6",5,"HU","Fiqh"],
  ["SAT","S6",6,"SF","Hadees"],
  ["SAT","S6",7,"SH","AEC"],
  ["SAT","S6",8,"HU",null],
  ["SAT","S6",9,"ZU",null],
  ["SAT","S7",1,"HU","Thafseer"],
  ["SAT","S7",2,"ZU","Fiqh"],
  ["SAT","S7",3,"SSH","Thakhassus"],
  ["SAT","S7",4,"HW","Thasavvuf"],
  ["SAT","S7",5,"ZU","Usoolul Fiqh"],
  ["SAT","S7",6,"SN","Politics"],
  ["SAT","S7",7,"SN","Politics"],
  ["SAT","S7",8,"NF",null],
  ["SAT","S7",9,"AJR",null],
  ["SUN","S1",0,"KF","Nahvu (Nahvul Vaadih)"],
  ["SUN","S1",1,"AJR","Swarf"],
  ["SUN","S1",3,"SSH","Urdu"],
  ["SUN","S1",4,"SW","Insha'"],
  ["SUN","S1",5,"NF","Aqeeda"],
  ["SUN","S1",6,"SW","Thilava & Hifz"],
  ["SUN","S1",7,"AF","Adab"],
  ["SUN","S2",0,"AF","Thasavvuf"],
  ["SUN","S2",2,"SW","Thareekh"],
  ["SUN","S2",3,"AJR","Nahvu"],
  ["SUN","S2",4,"NF","Insha'"],
  ["SUN","S2",5,"SF","Thilava & Hifz"],
  ["SUN","S2",6,"AF","Fiqh"],
  ["SUN","S2",7,"SSH","Urdu"],
  ["SUN","S3",0,"SSH","Fiqh"],
  ["SUN","S3",2,"KF","Nahvu"],
  ["SUN","S3",3,"AF","Hadees"],
  ["SUN","S3",4,"AJR","Balaga"],
  ["SUN","S3",5,"SH","Thareekh"],
  ["SUN","S3",6,"KF","Nahvu"],
  ["SUN","S3",7,"HU","Urdu"],
  ["SUN","S3",8,"NF","Insha'"],
  ["SUN","S4",1,"HU","Nahvu"],
  ["SUN","S4",2,"AF","Economics"],
  ["SUN","S4",3,"SW","Adab"],
  ["SUN","S4",4,"SSH","IT"],
  ["SUN","S4",5,"HW","English"],
  ["SUN","S4",6,"SH","Hadees"],
  ["SUN","S4",7,"AJR","Fiqh"],
  ["SUN","S4",8,"ZU","Thasavvuf"],
  ["SUN","S5",1,"ZU","Nahvu"],
  ["SUN","S5",2,"AJR","Thafseer"],
  ["SUN","S5",3,"HU","Fiqh"],
  ["SUN","S5",4,"AF","Economics"],
  ["SUN","S5",5,"KF","Sociology"],
  ["SUN","S5",6,"SF","Arabic"],
  ["SUN","S5",7,"SW","Politics"],
  ["SUN","S5",8,"SSH","IT"],
  ["SUN","S6",1,"SW","Thafseer"],
  ["SUN","S6",2,"ZU","Nahvu"],
  ["SUN","S6",3,"NF","Balaga"],
  ["SUN","S6",4,"KF","MDC"],
  ["SUN","S6",5,"ZU","Thasavvuf"],
  ["SUN","S6",6,"HU","Fiqh"],
  ["SUN","S6",7,"SH","AEC"],
  ["SUN","S6",8,"SF","Hadees"],
  ["SUN","S7",1,"NF","Balaga"],
  ["SUN","S7",2,"HU","Thafseer"],
  ["SUN","S7",3,"ZU","Usoolul Fiqh"],
  ["SUN","S7",4,"SH","AEC"],
  ["SUN","S7",5,"AJR","Manthiq"],
  ["SUN","S7",6,"ZU","Fiqh"],
  ["SUN","S7",7,"KF","Translation"],
  ["SUN","S7",8,"HW","Thasavvuf"],
  ["MON","S1",0,"AF","Nahvu (Avamil)"],
  ["MON","S1",2,"KF","Nahvu (Nahvul Vaadih)"],
  ["MON","S1",3,"SW","Insha'"],
  ["MON","S1",4,"SF","Thareekh"],
  ["MON","S1",5,"SSH",null],
  ["MON","S1",6,"HW",null],
  ["MON","S1",7,"AJR",null],
  ["MON","S1",8,"NF",null],
  ["MON","S1",9,"AF",null],
  ["MON","S2",0,"KF","Swarf"],
  ["MON","S2",2,"AF","Fiqh"],
  ["MON","S2",3,"AJR","Nahvu"],
  ["MON","S2",4,"SW","Adab"],
  ["MON","S2",5,"KF",null],
  ["MON","S2",6,"AJR",null],
  ["MON","S2",7,"AF",null],
  ["MON","S2",8,"SW",null],
  ["MON","S2",9,"NF",null],
  ["MON","S3",0,"SSH","Fiqh"],
  ["MON","S3",2,"NF","Insha'"],
  ["MON","S3",3,"KF","Nahvu"],
  ["MON","S3",4,"AF",null],
  ["MON","S3",5,"AJR",null],
  ["MON","S3",6,"SSH",null],
  ["MON","S3",7,"NF",null],
  ["MON","S3",8,"KF",null],
  ["MON","S4",1,"NF","Balaga"],
  ["MON","S4",2,"SSH","Insha'"],
  ["MON","S4",3,"AF","Economics"],
  ["MON","S4",4,"HW","English"],
  ["MON","S4",5,"SH","History"],
  ["MON","S4",6,"KF","Urdu"],
  ["MON","S4",7,"ZU","Thasavvuf"],
  ["MON","S4",8,"AJR","Fiqh"],
  ["MON","S4",9,"SW","Politics"],
  ["MON","S5",1,"AJR","Thafseer"],
  ["MON","S5",2,"ZU","Nahvu"],
  ["MON","S5",3,"NF","English"],
  ["MON","S5",4,"SH","History"],
  ["MON","S5",5,"HW","Hadees"],
  ["MON","S5",6,"AF","Economics"],
  ["MON","S5",7,"SW","Insha'"],
  ["MON","S5",8,"AF","Adab"],
  ["MON","S5",9,"SSH","IT"],
  ["MON","S6",1,"SW","Thafseer"],
  ["MON","S6",2,"AJR","Adab"],
  ["MON","S6",3,"ZU",null],
  ["MON","S6",4,"SSH","Manthiq"],
  ["MON","S6",5,"ZU","Thasavvuf"],
  ["MON","S6",6,"SF","Hadees"],
  ["MON","S6",7,"HW","Insha'"],
  ["MON","S6",8,"ZU","Nahvu"],
  ["MON","S6",9,"KF","Urdu"],
  ["MON","S7",1,"ZU","Usoolul Fiqh"],
  ["MON","S7",2,"SW","Adab"],
  ["MON","S7",3,"SSH",null],
  ["MON","S7",4,"KF",null],
  ["MON","S7",5,"SF","Hadees"],
  ["MON","S7",6,"NF","Balaga"],
  ["MON","S7",7,"KF","Urdu"],
  ["MON","S7",8,"SSH","Thakhassus"],
  ["MON","S7",9,"AJR","Manthiq"],
  ["TUE","S1",0,"KF","Nahvu (Nahvul Vaadih)"],
  ["TUE","S1",2,"AF","Adab"],
  ["TUE","S1",3,"SW","Insha'"],
  ["TUE","S1",4,"SSH","Urdu"],
  ["TUE","S1",5,"AF",null],
  ["TUE","S1",6,"NF",null],
  ["TUE","S1",7,"SF",null],
  ["TUE","S1",8,"KF",null],
  ["TUE","S1",9,"SW",null],
  ["TUE","S2",0,"AJR","Nahvu"],
  ["TUE","S2",2,"SW","Thareekh"],
  ["TUE","S2",3,"NF","Insha'"],
  ["TUE","S2",4,"AF","Fiqh"],
  ["TUE","S2",5,"AJR",null],
  ["TUE","S2",6,"SF",null],
  ["TUE","S2",7,"NF",null],
  ["TUE","S2",8,"SW",null],
  ["TUE","S2",9,"KF",null],
  ["TUE","S3",0,"SSH","Fiqh"],
  ["TUE","S3",2,"KF","Nahvu"],
  ["TUE","S3",3,"AF","Hadees"],
  ["TUE","S3",4,"SH","Thareekh"],
  ["TUE","S3",5,"NF",null],
  ["TUE","S3",6,"KF",null],
  ["TUE","S3",7,"HU",null],
  ["TUE","S3",8,"AF",null],
  ["TUE","S4",1,"NF","Balaga"],
  ["TUE","S4",2,"SSH","Insha'"],
  ["TUE","S4",3,"KF","Sociology"],
  ["TUE","S4",4,"HU","Nahvu"],
  ["TUE","S4",5,"SH","History"],
  ["TUE","S4",6,"SW","Adab"],
  ["TUE","S4",7,"AJR","Fiqh"],
  ["TUE","S4",8,"ZU","Thasavvuf"],
  ["TUE","S4",9,"AF","Economics"],
  ["TUE","S5",1,"ZU","Nahvu"],
  ["TUE","S5",2,"AJR","Thafseer"],
  ["TUE","S5",3,"AF","Economics"],
  ["TUE","S5",4,"KF","Urdu"],
  ["TUE","S5",5,"HU","Fiqh"],
  ["TUE","S5",6,"AF","Adab"],
  ["TUE","S5",7,"KF","Sociology"],
  ["TUE","S5",8,"SSH","Manthiq"],
  ["TUE","S5",9,"NF","English"],
  ["TUE","S6",1,"SW","Thafseer"],
  ["TUE","S6",2,"NF","Balaga"],
  ["TUE","S6",3,"ZU",null],
  ["TUE","S6",4,"NF","Translation"],
  ["TUE","S6",5,"SF","Hadees"],
  ["TUE","S6",6,"AJR","Adab"],
  ["TUE","S6",7,"ZU","Nahvu"],
  ["TUE","S6",8,"HU","Fiqh"],
  ["TUE","S6",9,"SSH","Manthiq"],
  ["TUE","S7",1,"AJR","Manthiq"],
  ["TUE","S7",2,"ZU","Usoolul Fiqh"],
  ["TUE","S7",3,"SSH",null],
  ["TUE","S7",4,"AJR",null],
  ["TUE","S7",5,"ZU","Fiqh"],
  ["TUE","S7",6,"HU","Thafseer"],
  ["TUE","S7",7,"SW","Adab"],
  ["TUE","S7",8,"SF","Hadees"],
  ["TUE","S7",9,"HU","Thafseer"],
  ["WED","S1",0,"HU","Fiqh"],
  ["WED","S1",1,"KF","Nahvu (Nahvul Vaadih)"],
  ["WED","S1",3,"AJR","Swarf"],
  ["WED","S1",4,"AF","Adab"],
  ["WED","S1",5,"SSH",null],
  ["WED","S1",6,"NF",null],
  ["WED","S1",7,"SW",null],
  ["WED","S1",8,"KF",null],
  ["WED","S1",9,"AF",null],
  ["WED","S2",0,"KF","Swarf"],
  ["WED","S2",1,"NF","Insha'"],
  ["WED","S2",2,"AF","Thasavvuf"],
  ["WED","S2",4,"AJR","Nahvu"],
  ["WED","S2",5,"AF",null],
  ["WED","S2",6,"SW",null],
  ["WED","S2",7,"SF",null],
  ["WED","S2",8,"AJR",null],
  ["WED","S2",9,"KF",null],
  ["WED","S3",0,"SSH","Fiqh"],
  ["WED","S3",2,"AJR","Balaga"],
  ["WED","S3",3,"KF","Nahvu"],
  ["WED","S3",4,"SH","Thareekh"],
  ["WED","S3",5,"NF",null],
  ["WED","S3",6,"HU",null],
  ["WED","S3",7,"AF",null],
  ["WED","S3",8,"NF",null],
  ["WED","S4",1,"HU","Nahvu"],
  ["WED","S4",2,"NF","Balaga"],
  ["WED","S4",3,"SW","Politics"],
  ["WED","S4",4,"HU","Nahvu"],
  ["WED","S4",5,"SH","Hadees"],
  ["WED","S4",6,"AF","Economics"],
  ["WED","S4",7,"HW","English"],
  ["WED","S4",8,"ZU","Thasavvuf"],
  ["WED","S4",9,"AJR","Fiqh"],
  ["WED","S5",1,"AJR","Thafseer"],
  ["WED","S5",2,"SSH","Manthiq"],
  ["WED","S5",3,"AF","Economics"],
  ["WED","S5",4,"NF","English"],
  ["WED","S5",5,"HW","Hadees"],
  ["WED","S5",6,"KF","Urdu"],
  ["WED","S5",7,"ZU","Nahvu"],
  ["WED","S5",8,"HU","Fiqh"],
  ["WED","S5",9,"SW","Politics"],
  ["WED","S6",1,"SW","Thafseer"],
  ["WED","S6",2,"ZU","Nahvu"],
  ["WED","S6",3,"SSH",null],
  ["WED","S6",4,"ZU",null],
  ["WED","S6",5,"SF",null],
  ["WED","S6",6,"HW",null],
  ["WED","S6",7,"NF","Translation"],
  ["WED","S6",8,"SSH","IT"],
  ["WED","S6",9,"HU","Fiqh"],
  ["WED","S7",1,"ZU","Usoolul Fiqh"],
  ["WED","S7",2,"HU","Thafseer"],
  ["WED","S7",3,"NF",null],
  ["WED","S7",4,"SF",null],
  ["WED","S7",5,"ZU","Fiqh"],
  ["WED","S7",6,"SF","Hadees"],
  ["WED","S7",7,"KF","Translation"],
  ["WED","S7",8,"SW","Adab"],
  ["WED","S7",9,"SSH","IT"],
  ["THU","S1",0,"HU","Fiqh"],
  ["THU","S1",2,"AJR","Swarf"],
  ["THU","S1",3,"AF","Nahvu (Avamil)"],
  ["THU","S1",4,"NF","Aqeeda"],
  ["THU","S1",5,"SW",null],
  ["THU","S1",6,"AF",null],
  ["THU","S1",7,"KF",null],
  ["THU","S2",0,"AF","Fiqh"],
  ["THU","S2",2,"KF","Swarf"],
  ["THU","S2",3,"AJR","Nahvu"],
  ["THU","S2",4,"SW","Adab"],
  ["THU","S2",5,"AF",null],
  ["THU","S2",6,"NF",null],
  ["THU","S2",7,"AJR",null],
  ["THU","S3",0,"KF","Nahvu"],
  ["THU","S3",2,"AF","Hadees"],
  ["THU","S3",3,"SSH","Fiqh"],
  ["THU","S3",4,"KF",null],
  ["THU","S3",5,"NF",null],
  ["THU","S3",6,"AJR",null],
  ["THU","S3",7,"HU",null],
  ["THU","S4",1,"HU","Nahvu"],
  ["THU","S4",2,"NF","Balaga"],
  ["THU","S4",3,"SW","Adab"],
  ["THU","S4",4,"HW","English"],
  ["THU","S4",5,"SSH","IT"],
  ["THU","S4",6,"KF","Sociology"],
  ["THU","S4",7,"AF","Economics"],
  ["THU","S4",8,"AJR","Fiqh"],
  ["THU","S4",9,"SH","History"],
  ["THU","S5",1,"AJR","Thafseer"],
  ["THU","S5",2,"ZU","Nahvu"],
  ["THU","S5",3,"NF","English"],
  ["THU","S5",4,"AF","Economics"],
  ["THU","S5",5,"KF","Sociology"],
  ["THU","S5",6,"SW","Politics"],
  ["THU","S5",7,"HW","Hadees"],
  ["THU","S5",8,"SH","History"],
  ["THU","S5",9,"HU","Fiqh"],
  ["THU","S6",1,"SW","Thafseer"],
  ["THU","S6",2,"SSH","Manthiq"],
  ["THU","S6",3,"HU",null],
  ["THU","S6",4,"ZU","Thasavvuf"],
  ["THU","S6",5,"SF","Hadees"],
  ["THU","S6",6,"SSH","IT"],
  ["THU","S6",7,"ZU","Nahvu"],
  ["THU","S6",8,"HU","Fiqh"],
  ["THU","S6",9,"HW","Insha'"],
  ["THU","S7",1,"ZU","Usoolul Fiqh"],
  ["THU","S7",2,"HU","Thafseer"],
  ["THU","S7",3,"KF",null],
  ["THU","S7",4,"SSH","IT"],
  ["THU","S7",5,"ZU","Fiqh"],
  ["THU","S7",6,"SF","Hadees"],
  ["THU","S7",7,"NF","Balaga"],
  ["THU","S7",8,"HW","Thasavvuf"],
  ["THU","S7",9,"AJR","Manthiq"],
];

const CLASS_BREAK_CELLS: [DayCode, ClassId, PeriodNum][] = [
  ["SAT","S1",0],

  ["SAT","S2",0],
  ["SAT","S3",1],
  ["SAT","S4",0],
  ["SAT","S5",0],
  ["SAT","S6",0],
  ["SAT","S7",0],
  ["SUN","S1",2],
  ["SUN","S2",1],
  ["SUN","S3",1],
  ["SUN","S4",0],
  ["SUN","S5",0],
  ["SUN","S6",0],
  ["SUN","S7",0],
  ["MON","S1",1],
  ["MON","S2",1],
  ["MON","S3",1],
  ["MON","S4",0],
  ["MON","S5",0],
  ["MON","S6",0],
  ["MON","S7",0],
  ["TUE","S1",1],
  ["TUE","S2",1],
  ["TUE","S3",1],
  ["TUE","S4",0],
  ["TUE","S5",0],
  ["TUE","S6",0],
  ["TUE","S7",0],
  ["WED","S1",2],
  ["WED","S2",3],
  ["WED","S3",1],
  ["WED","S4",0],
  ["WED","S5",0],
  ["WED","S6",0],
  ["WED","S7",0],
  ["THU","S1",1],
  ["THU","S2",1],
  ["THU","S3",1],
  ["THU","S4",0],
  ["THU","S5",0],
  ["THU","S6",0],
  ["THU","S7",0],
];

const ACTIVITY_CELLS: [DayCode, ClassId, PeriodNum, string][] = [
  ["SAT","S1",1,"Class Samajam"],

  ["SAT","S2",1,"Class Samajam"],
  ["SUN","S1",8,"Samajam Prep"],
  ["SUN","S1",9,"Samajam Prep"],
  ["SUN","S2",8,"Samajam Prep"],
  ["SUN","S2",9,"Samajam Prep"],
  ["SUN","S3",9,"Samajam Prep"],
  ["SUN","S4",9,"Samajam Prep"],
  ["SUN","S5",9,"Samajam Prep"],
  ["SUN","S6",9,"Samajam Prep"],
  ["SUN","S7",9,"Samajam Prep"],
  ["MON","S3",9,"SSLC"],
  ["TUE","S3",9,"SSLC"],
  ["WED","S3",9,"SSLC"],
  ["THU","S1",8,"School Subject"],
  ["THU","S1",9,"School Subject"],
  ["THU","S2",8,"School Subject"],
  ["THU","S2",9,"School Subject"],
  ["THU","S3",8,"SSLC"],
  ["THU","S3",9,"SSLC"],
];

for (const [day, className, p, teacher, subject] of CELLS) {
  SCHEDULE[day][p].push({
    teacher,
    className,
    subject: subject ?? SUBJECT_UNSPECIFIED,
    subjectSpecified: subject !== null,
  });
}

const emptyByClass = <T,>(v: () => T) =>
  Object.fromEntries(CLASSES.map((c) => [c, v()])) as Record<ClassId, T>;

export const CLASS_BREAKS: Record<DayCode, Record<ClassId, PeriodNum | null>> =
  Object.fromEntries(DAYS.map((d) => [d, emptyByClass<PeriodNum | null>(() => null)])) as Record<
    DayCode,
    Record<ClassId, PeriodNum | null>
  >;
for (const [d, c, p] of CLASS_BREAK_CELLS) CLASS_BREAKS[d][c] = p;

export const CLASS_ACTIVITIES: Record<DayCode, Record<ClassId, Partial<Record<PeriodNum, string>>>> =
  Object.fromEntries(
    DAYS.map((d) => [d, emptyByClass<Partial<Record<PeriodNum, string>>>(() => ({}))]),
  ) as Record<DayCode, Record<ClassId, Partial<Record<PeriodNum, string>>>>;
for (const [d, c, p, label] of ACTIVITY_CELLS) CLASS_ACTIVITIES[d][c][p] = label;

export type ClassCell =
  | { kind: "slot"; slot: Slot }
  | { kind: "break" }
  | { kind: "activity"; label: string }
  | { kind: "free" };

// ---------------------------------------------------------------------------
// TEMPORARY OVERRIDE LAYER
// Permanent timetable (SCHEDULE) is NEVER mutated. Overrides are held in a
// small in-memory registry, scoped to a single calendar date, and applied on
// read for that date only. Expired automatically when the date changes.
// ---------------------------------------------------------------------------

export function localDateKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let TEMP_DATE = "";
let TEMP_MAP = new Map<string, string>();
let tempVersion = 0;
const tempListeners = new Set<() => void>();

export function setTempOverrides(
  date: string,
  entries: { class_id: string; period: number; subject: string }[],
) {
  TEMP_DATE = date;
  TEMP_MAP = new Map(entries.map((e) => [`${e.class_id}|${e.period}`, e.subject]));
  tempVersion++;
  tempListeners.forEach((l) => l());
}

export function subscribeTempOverrides(l: () => void) {
  tempListeners.add(l);
  return () => tempListeners.delete(l);
}
export function getTempVersion() {
  return tempVersion;
}
export function hasActiveTempOverrides(now: Date = new Date()) {
  return TEMP_DATE === localDateKey(now) && TEMP_MAP.size > 0;
}
export function activeTempCount(now: Date = new Date()) {
  return hasActiveTempOverrides(now) ? TEMP_MAP.size : 0;
}

/** Override subject for a day+class+period, but only when that day is today. */
function tempSubjectFor(day: DayCode, cls: ClassId, p: PeriodNum): string | null {
  if (!TEMP_MAP.size) return null;
  const now = new Date();
  if (TEMP_DATE !== localDateKey(now)) return null;
  if (jsDayToCode(now.getDay()) !== day) return null;
  return TEMP_MAP.get(`${cls}|${p}`) ?? null;
}

function applyTemp(day: DayCode, p: PeriodNum, slot: Slot | undefined | null): Slot | null {
  if (!slot) return slot ?? null;
  const sub = tempSubjectFor(day, slot.className, p);
  if (!sub || sub === slot.subject) return slot;
  return { ...slot, subject: sub, subjectSpecified: true, temporary: true };
}

/** Single source of truth for what a class has in a given day+period. */
export function getClassCell(day: DayCode, cls: ClassId, p: PeriodNum): ClassCell {
  const slot = applyTemp(day, p, SCHEDULE[day][p].find((s) => s.className === cls));
  if (slot) return { kind: "slot", slot };
  if (CLASS_BREAKS[day][cls] === p) return { kind: "break" };
  const label = CLASS_ACTIVITIES[day][cls][p];
  if (label) return { kind: "activity", label };
  return { kind: "free" };
}

export { SCHEDULE };

// ---------- Derived helpers ----------

export function getTeacherSchedule(code: string): Record<DayCode, Record<PeriodNum, Slot | null>> {
  const out = {} as Record<DayCode, Record<PeriodNum, Slot | null>>;
  for (const d of DAYS) {
    out[d] = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null };
    for (const p of PERIODS) {
      out[d][p] = applyTemp(d, p, SCHEDULE[d][p].find((s) => s.teacher === code));
    }
  }
  return out;
}

export function getClassSchedule(cls: ClassId): Record<DayCode, Record<PeriodNum, Slot | null>> {
  const out = {} as Record<DayCode, Record<PeriodNum, Slot | null>>;
  for (const d of DAYS) {
    out[d] = { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null };
    for (const p of PERIODS) {
      out[d][p] = applyTemp(d, p, SCHEDULE[d][p].find((s) => s.className === cls));
    }
  }
  return out;
}

export interface TeacherStats {
  /** All assigned cells, including teacher-only (subject not specified) cells. */
  totalWeeklyPeriods: number;
  /** Assigned cells where the PDF specifies a subject. */
  subjectSpecifiedPeriods: number;
  /** Assigned cells where the PDF gives only the teacher. */
  subjectUnspecifiedPeriods: number;
  /** Periods per subject — only explicitly written subjects. */
  subjectBreakdown: { subject: string; periods: number }[];
  totalClasses: number;
  classesAssigned: ClassId[];
  subjects: string[];
  periodsByDay: Record<DayCode, number>;
  workloadPercent: number;
}

export function getTeacherStats(code: string): TeacherStats {
  const sched = getTeacherSchedule(code);
  let total = 0;
  let specified = 0;
  const classes = new Set<ClassId>();
  const subjects = new Set<string>();
  const perSubject = new Map<string, number>();
  const byDay = {} as Record<DayCode, number>;
  for (const d of DAYS) {
    let n = 0;
    for (const p of PERIODS) {
      const s = sched[d][p];
      if (s) {
        n++;
        total++;
        classes.add(s.className);
        if (s.subjectSpecified) {
          specified++;
          subjects.add(s.subject);
          perSubject.set(s.subject, (perSubject.get(s.subject) ?? 0) + 1);
        }
      }
    }
    byDay[d] = n;
  }
  return {
    totalWeeklyPeriods: total,
    subjectSpecifiedPeriods: specified,
    subjectUnspecifiedPeriods: total - specified,
    subjectBreakdown: Array.from(perSubject, ([subject, periods]) => ({ subject, periods })).sort(
      (a, b) => b.periods - a.periods || a.subject.localeCompare(b.subject),
    ),
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
      const slot = applyTemp(day, p.period, SCHEDULE[day][p.period].find((s) => s.teacher === code));
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
      const slot = applyTemp(day, p.period, SCHEDULE[day][p.period].find((s) => s.teacher === code));
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
