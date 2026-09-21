export type SeatRole = "PIC" | "SIC";
export type DayStatus = "flying" | "mx" | "deployed" | "none";
export type TimeOffType = "pto" | "med" | "training" | "unavailable";
export type WeekStatus = "draft" | "published";

export interface Pilot {
  id: string;
  name: string;
  color: string;
  quals: Record<string, SeatRole | null>;
  active: boolean;
}

export interface Aircraft {
  id: string;
  name: string;
  tailNumber: string;
  color: string;
  active: boolean;
}

export interface DayAircraftAssignment {
  status: DayStatus;
  picId: string | null;
  sicId: string | null;
  note: string;
  locked?: boolean;
}

export interface DayPlan {
  date: string;
  aircraft: Record<string, DayAircraftAssignment>;
  dutyOfficerId: string | null;
  dutyOfficerLocked?: boolean;
  offSiteCrewIds: string[];
  notes: string;
}

export interface WeekPlan {
  id: string;
  startDate: string;
  status: WeekStatus;
  days: Record<string, DayPlan>;
  updatedAt: string;
}

export interface TimeOff {
  id: string;
  pilotId: string;
  date: string;
  type: TimeOffType;
  note: string;
}

export interface WorkCounts {
  fly: number;
  pic: number;
  sic: number;
  duty: number;
  deployed: number;
  total: number;
}

export interface FairnessStat {
  pilotId: string;
  name: string;
  color: string;
  flyDays: number;
  picSeats: number;
  sicSeats: number;
  dutyDays: number;
  deployedDays: number;
  offDays: number;
  ptoDays: number;
  totalWorkDays: number;
  consecutiveMax: number;
}

export interface ScheduleWarning {
  date: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface AssignmentReason {
  date: string;
  slot: string;
  pilotId: string;
  reason: string;
}

export interface GenerateOptions {
  preserveLocked?: boolean;
  weekendsOff?: boolean;
  lookbackCounts?: Record<string, WorkCounts>;
}

export interface GenerateInput {
  weekStart: string;
  weekCount?: number;
  pilots: Pilot[];
  aircraft: Aircraft[];
  weeks: Record<string, WeekPlan>;
  timeOff: TimeOff[];
  options?: GenerateOptions;
}

export interface GenerateResult {
  weeks: Record<string, WeekPlan>;
  fairness: FairnessStat[];
  warnings: ScheduleWarning[];
  reasons: AssignmentReason[];
  score: {
    minWork: number;
    maxWork: number;
    spread: number;
  };
}
