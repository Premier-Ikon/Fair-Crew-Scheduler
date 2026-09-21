import type {
  Aircraft,
  AssignmentReason,
  DayAircraftAssignment,
  DayPlan,
  FairnessStat,
  GenerateInput,
  GenerateResult,
  Pilot,
  ScheduleWarning,
  TimeOff,
  WeekPlan,
  WorkCounts,
} from "./types";
import { addDays, isWeekend, mondayOf, weekDates } from "./dates";
import { emptyWeek } from "./seed";
import { canPic, canRightSeat, isOff, validateWeek } from "./validate";

type CountsMap = Record<string, WorkCounts>;

const EMPTY_COUNTS = (): WorkCounts => ({
  fly: 0,
  pic: 0,
  sic: 0,
  duty: 0,
  deployed: 0,
  total: 0,
});

function cloneDay(day: DayPlan): DayPlan {
  return {
    ...day,
    offSiteCrewIds: [...day.offSiteCrewIds],
    aircraft: Object.fromEntries(
      Object.entries(day.aircraft).map(([id, assignment]) => [
        id,
        { ...assignment },
      ]),
    ),
  };
}

function cloneWeek(week: WeekPlan): WeekPlan {
  return {
    ...week,
    days: Object.fromEntries(
      Object.entries(week.days).map(([date, day]) => [date, cloneDay(day)]),
    ),
    updatedAt: new Date().toISOString(),
  };
}

function ensureCounts(counts: CountsMap, pilots: Pilot[]): CountsMap {
  const next = { ...counts };
  for (const pilot of pilots) {
    next[pilot.id] = { ...(next[pilot.id] ?? EMPTY_COUNTS()) };
  }
  return next;
}

function addAssignmentToCounts(
  counts: CountsMap,
  day: DayPlan,
  aircraft: Aircraft[],
) {
  const credited = new Set<string>();
  const credit = (pilotId: string | null, field: keyof WorkCounts) => {
    if (!pilotId || !counts[pilotId]) return;
    counts[pilotId][field] += 1;
    if (!credited.has(pilotId)) {
      counts[pilotId].total += 1;
      credited.add(pilotId);
    }
  };

  for (const ac of aircraft) {
    const assignment = day.aircraft[ac.id];
    if (!assignment) continue;
    if (assignment.status === "flying") {
      credit(assignment.picId, "pic");
      credit(assignment.sicId, "sic");
      if (assignment.picId && counts[assignment.picId]) counts[assignment.picId].fly += 1;
      if (assignment.sicId && counts[assignment.sicId]) counts[assignment.sicId].fly += 1;
    }
    if (assignment.status === "deployed") {
      credit(assignment.picId, "deployed");
      credit(assignment.sicId, "deployed");
    }
  }
  credit(day.dutyOfficerId, "duty");
  for (const id of day.offSiteCrewIds) credit(id, "deployed");
}

function subtractAssignmentFromCounts(
  counts: CountsMap,
  day: DayPlan,
  aircraft: Aircraft[],
) {
  const negative: CountsMap = {};
  for (const id of Object.keys(counts)) negative[id] = EMPTY_COUNTS();
  addAssignmentToCounts(negative, day, aircraft);
  for (const id of Object.keys(counts)) {
    const a = counts[id];
    const b = negative[id];
    a.fly -= b.fly;
    a.pic -= b.pic;
    a.sic -= b.sic;
    a.duty -= b.duty;
    a.deployed -= b.deployed;
    a.total -= b.total;
  }
}

function flyingAircraft(day: DayPlan, aircraft: Aircraft[]): Aircraft[] {
  return aircraft.filter(
    (ac) => ac.active && day.aircraft[ac.id]?.status === "flying",
  );
}

function occupied(day: DayPlan): Set<string> {
  const ids = new Set<string>();
  for (const assignment of Object.values(day.aircraft)) {
    if (assignment.picId) ids.add(assignment.picId);
    if (assignment.sicId) ids.add(assignment.sicId);
  }
  if (day.dutyOfficerId) ids.add(day.dutyOfficerId);
  for (const id of day.offSiteCrewIds) ids.add(id);
  return ids;
}

function availablePilots(
  pilots: Pilot[],
  date: string,
  timeOff: TimeOff[],
  used: Set<string>,
): Pilot[] {
  return pilots.filter(
    (pilot) =>
      pilot.active && !used.has(pilot.id) && !isOff(pilot.id, date, timeOff),
  );
}

/**
 * Lower is better. Rolling history is weighted so last month still
 * matters, but this week can catch up. PIC scarcity is handled by
 * assignment order, not this score.
 */
function loadScore(
  pilot: Pilot,
  counts: CountsMap,
  extra: { consecutive: number; sameAircraft: number },
): number {
  const c = counts[pilot.id] ?? EMPTY_COUNTS();
  return (
    c.total * 1000 +
    extra.consecutive * 120 +
    c.fly * 40 +
    c.pic * 8 +
    c.sic * 8 +
    c.duty * 18 +
    extra.sameAircraft * 25
  );
}

function pickBest(
  candidates: Pilot[],
  counts: CountsMap,
  extraFor: (pilot: Pilot) => { consecutive: number; sameAircraft: number },
): Pilot | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const diff = loadScore(a, counts, extraFor(a)) - loadScore(b, counts, extraFor(b));
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  })[0];
}

function workedYesterday(
  weeks: Record<string, WeekPlan>,
  date: string,
  pilotId: string,
  aircraft: Aircraft[],
): boolean {
  const prev = addDays(date, -1);
  const monday = mondayOf(prev);
  const day = weeks[monday]?.days[prev];
  if (!day) return false;
  return occupied(day).has(pilotId);
}

function yesterdayAircraft(
  weeks: Record<string, WeekPlan>,
  date: string,
  pilotId: string,
): string | null {
  const prev = addDays(date, -1);
  const day = weeks[mondayOf(prev)]?.days[prev];
  if (!day) return null;
  for (const [aircraftId, assignment] of Object.entries(day.aircraft)) {
    if (assignment.picId === pilotId || assignment.sicId === pilotId) return aircraftId;
  }
  return null;
}

function consecutiveStreak(
  weeks: Record<string, WeekPlan>,
  date: string,
  pilotId: string,
): number {
  let streak = 0;
  for (let i = 1; i <= 6; i++) {
    const prev = addDays(date, -i);
    const day = weeks[mondayOf(prev)]?.days[prev];
    if (!day || !occupied(day).has(pilotId)) break;
    streak += 1;
  }
  return streak;
}

function clearUnlocked(day: DayPlan, preserveLocked: boolean) {
  for (const assignment of Object.values(day.aircraft)) {
    if (preserveLocked && assignment.locked) continue;
    if (assignment.status === "flying" || assignment.status === "deployed") {
      assignment.picId = null;
      assignment.sicId = null;
    }
  }
  if (!(preserveLocked && day.dutyOfficerLocked)) {
    day.dutyOfficerId = null;
  }
}

function assignDay(
  day: DayPlan,
  pilots: Pilot[],
  aircraft: Aircraft[],
  timeOff: TimeOff[],
  counts: CountsMap,
  weeks: Record<string, WeekPlan>,
  reasons: AssignmentReason[],
  warnings: ScheduleWarning[],
  preserveLocked: boolean,
) {
  clearUnlocked(day, preserveLocked);

  const flying = flyingAircraft(day, aircraft);
  if (flying.length === 0) {
    if (!isWeekend(day.date) && Object.values(day.aircraft).every((a) => a.status === "none")) {
      return;
    }
    return;
  }

  const used = occupied(day);

  const extraFor = (pilot: Pilot, aircraftId?: string) => ({
    consecutive: consecutiveStreak(weeks, day.date, pilot.id),
    sameAircraft:
      aircraftId && yesterdayAircraft(weeks, day.date, pilot.id) === aircraftId ? 1 : 0,
  });

  // Lock in already-assigned people so the generator cannot double-book them.
  for (const id of used) {
    const pilot = pilots.find((p) => p.id === id);
    if (pilot) {
      reasons.push({
        date: day.date,
        slot: "locked",
        pilotId: id,
        reason: "Kept because the cell is locked.",
      });
    }
  }

  // Left seat first, scarcest type first. Bou only has two PICs.
  const picSlots = flying
    .filter((ac) => !day.aircraft[ac.id].picId)
    .sort((a, b) => {
      const aN = pilots.filter((p) => canPic(p, a.id) && !isOff(p.id, day.date, timeOff)).length;
      const bN = pilots.filter((p) => canPic(p, b.id) && !isOff(p.id, day.date, timeOff)).length;
      return aN - bN;
    });

  for (const ac of picSlots) {
    const pool = availablePilots(pilots, day.date, timeOff, used).filter((p) =>
      canPic(p, ac.id),
    );
    const pick = pickBest(pool, counts, (p) => extraFor(p, ac.id));
    if (!pick) {
      warnings.push({
        date: day.date,
        severity: "error",
        message: `No remaining PIC for ${ac.name}.`,
      });
      continue;
    }
    day.aircraft[ac.id].picId = pick.id;
    used.add(pick.id);
    reasons.push({
      date: day.date,
      slot: `${ac.name} PIC`,
      pilotId: pick.id,
      reason: `${pick.name} is PIC-qualified on ${ac.name} and currently has the lightest legal load for left seat.`,
    });
  }

  // Right seat: prefer people who cannot PIC this type so captains stay available
  // as duty / other seats across the week, and SICs actually get flying days.
  const sicSlots = flying.filter((ac) => !day.aircraft[ac.id].sicId);
  for (const ac of sicSlots) {
    const pool = availablePilots(pilots, day.date, timeOff, used).filter((p) =>
      canRightSeat(p, ac.id),
    );
    const ranked = [...pool].sort((a, b) => {
      const aSicOnly = a.quals[ac.id] === "SIC" ? 1 : 0;
      const bSicOnly = b.quals[ac.id] === "SIC" ? 1 : 0;
      if (aSicOnly !== bSicOnly) return bSicOnly - aSicOnly;
      return (
        loadScore(a, counts, extraFor(a, ac.id)) -
        loadScore(b, counts, extraFor(b, ac.id))
      );
    });
    const pick = ranked[0];
    if (!pick) {
      warnings.push({
        date: day.date,
        severity: "warning",
        message: `No remaining SIC for ${ac.name}.`,
      });
      continue;
    }
    day.aircraft[ac.id].sicId = pick.id;
    used.add(pick.id);
    const sicOnly = pick.quals[ac.id] === "SIC";
    reasons.push({
      date: day.date,
      slot: `${ac.name} SIC`,
      pilotId: pick.id,
      reason: sicOnly
        ? `${pick.name} is SIC-only on ${ac.name}, so they take right seat instead of burning a PIC.`
        : `${pick.name} can occupy right seat on ${ac.name} and had the lightest remaining load.`,
    });
  }

  if (!day.dutyOfficerId) {
    const pool = availablePilots(pilots, day.date, timeOff, used);
    let pick = pickBest(pool, counts, (p) => extraFor(p));
    if (!pick) {
      // Duty is required. If the line is short, pull a right-seat so the desk is filled.
      const stealFrom = flying.find((ac) => {
        const assignment = day.aircraft[ac.id];
        return assignment.sicId && !assignment.locked;
      });
      if (stealFrom) {
        const stolenId = day.aircraft[stealFrom.id].sicId;
        day.aircraft[stealFrom.id].sicId = null;
        if (stolenId) used.delete(stolenId);
        pick = pilots.find((pilot) => pilot.id === stolenId) ?? null;
        if (pick) {
          warnings.push({
            date: day.date,
            severity: "warning",
            message: `${stealFrom.name} right seat left open so ${pick.name} can stand duty. Short-staffed — consider parking a ship.`,
          });
        }
      }
    }
    if (!pick) {
      warnings.push({
        date: day.date,
        severity: "error",
        message:
          "Could not staff a duty officer. On a 3-ship day you need 7 people; leave or MX may require parking an aircraft.",
      });
    } else {
      day.dutyOfficerId = pick.id;
      used.add(pick.id);
      reasons.push({
        date: day.date,
        slot: "Duty officer",
        pilotId: pick.id,
        reason: `${pick.name} was the lightest remaining pilot and any qualified crewmember can stand duty.`,
      });
    }
  }

  addAssignmentToCounts(counts, day, aircraft);
}

function workSpread(counts: CountsMap, pilots: Pilot[]): number {
  const totals = pilots.filter((p) => p.active).map((p) => counts[p.id]?.total ?? 0);
  if (totals.length === 0) return 0;
  return Math.max(...totals) - Math.min(...totals);
}

type SlotKind = "pic" | "sic" | "duty";

function slotsForPilot(day: DayPlan, aircraft: Aircraft[], pilotId: string) {
  const slots: { kind: SlotKind; aircraftId?: string }[] = [];
  for (const ac of aircraft) {
    const assignment = day.aircraft[ac.id];
    if (!assignment) continue;
    if (assignment.picId === pilotId) slots.push({ kind: "pic", aircraftId: ac.id });
    if (assignment.sicId === pilotId) slots.push({ kind: "sic", aircraftId: ac.id });
  }
  if (day.dutyOfficerId === pilotId) slots.push({ kind: "duty" });
  return slots;
}

function canFillSlot(pilot: Pilot, slot: { kind: SlotKind; aircraftId?: string }): boolean {
  if (slot.kind === "duty") return true;
  if (!slot.aircraftId) return false;
  if (slot.kind === "pic") return canPic(pilot, slot.aircraftId);
  return canRightSeat(pilot, slot.aircraftId);
}

function moveSlot(
  day: DayPlan,
  slot: { kind: SlotKind; aircraftId?: string },
  fromId: string,
  toId: string,
) {
  if (slot.kind === "duty") {
    if (day.dutyOfficerId === fromId) day.dutyOfficerId = toId;
    return;
  }
  if (!slot.aircraftId) return;
  const assignment = day.aircraft[slot.aircraftId];
  if (slot.kind === "pic" && assignment.picId === fromId) assignment.picId = toId;
  if (slot.kind === "sic" && assignment.sicId === fromId) assignment.sicId = toId;
}

function slotLocked(day: DayPlan, slot: { kind: SlotKind; aircraftId?: string }): boolean {
  if (slot.kind === "duty") return Boolean(day.dutyOfficerLocked);
  if (!slot.aircraftId) return false;
  return Boolean(day.aircraft[slot.aircraftId]?.locked);
}

/**
 * Repair pass: if one person is 2+ days ahead of another, move a legal
 * assignment. This is the "nobody works 5 while someone works 2" rule.
 */
function rebalance(
  weeks: Record<string, WeekPlan>,
  orderedDates: string[],
  pilots: Pilot[],
  aircraft: Aircraft[],
  timeOff: TimeOff[],
  counts: CountsMap,
) {
  const active = pilots.filter((p) => p.active);
  for (let pass = 0; pass < 40; pass++) {
    const ranked = [...active].sort(
      (a, b) => (counts[b.id]?.total ?? 0) - (counts[a.id]?.total ?? 0),
    );
    const heavy = ranked[0];
    const light = ranked[ranked.length - 1];
    if (!heavy || !light) break;
    const spread = (counts[heavy.id]?.total ?? 0) - (counts[light.id]?.total ?? 0);
    if (spread <= 1) break;

    let moved = false;
    for (const date of orderedDates) {
      const monday = mondayOf(date);
      const day = weeks[monday]?.days[date];
      if (!day) continue;
      if (isOff(light.id, date, timeOff)) continue;
      const heavySlots = slotsForPilot(day, aircraft, heavy.id);
      if (heavySlots.length === 0) continue;
      if (occupied(day).has(light.id)) continue;

      const movable = heavySlots.find(
        (slot) => !slotLocked(day, slot) && canFillSlot(light, slot),
      );
      if (!movable) continue;

      subtractAssignmentFromCounts(counts, day, aircraft);
      moveSlot(day, movable, heavy.id, light.id);
      addAssignmentToCounts(counts, day, aircraft);
      moved = true;
      break;
    }
    if (!moved) break;
  }
}

function fairnessFromCounts(
  pilots: Pilot[],
  counts: CountsMap,
  weeks: Record<string, WeekPlan>,
  timeOff: TimeOff[],
  dates: string[],
): FairnessStat[] {
  return pilots.map((pilot) => {
    let consecutive = 0;
    let consecutiveMax = 0;
    let offDays = 0;
    let ptoDays = 0;
    for (const date of dates) {
      const day = weeks[mondayOf(date)]?.days[date];
      const working = day ? occupied(day).has(pilot.id) : false;
      if (isOff(pilot.id, date, timeOff)) ptoDays += 1;
      if (working) {
        consecutive += 1;
        consecutiveMax = Math.max(consecutiveMax, consecutive);
      } else {
        if (!isWeekend(date)) offDays += 1;
        consecutive = 0;
      }
    }
    const c = counts[pilot.id] ?? EMPTY_COUNTS();
    return {
      pilotId: pilot.id,
      name: pilot.name,
      color: pilot.color,
      flyDays: c.fly,
      picSeats: c.pic,
      sicSeats: c.sic,
      dutyDays: c.duty,
      deployedDays: c.deployed,
      offDays,
      ptoDays,
      totalWorkDays: c.total,
      consecutiveMax,
    };
  });
}

export function emptyAssignment(status: DayAircraftAssignment["status"]): DayAircraftAssignment {
  return { status, picId: null, sicId: null, note: "", locked: false };
}

export function generateSchedule(input: GenerateInput): GenerateResult {
  const pilots = input.pilots.filter((p) => p.active);
  const aircraft = input.aircraft.filter((a) => a.active);
  const weekCount = Math.max(1, input.weekCount ?? 1);
  const preserveLocked = input.options?.preserveLocked ?? true;
  const warnings: ScheduleWarning[] = [];
  const reasons: AssignmentReason[] = [];

  const weeks: Record<string, WeekPlan> = {};
  for (const [id, week] of Object.entries(input.weeks)) {
    weeks[id] = cloneWeek(week);
  }

  const starts: string[] = [];
  let cursor = mondayOf(input.weekStart);
  for (let i = 0; i < weekCount; i++) {
    starts.push(cursor);
    if (!weeks[cursor]) weeks[cursor] = emptyWeek(cursor, aircraft);
    else weeks[cursor] = cloneWeek(weeks[cursor]);
    cursor = addDays(cursor, 7);
  }

  const orderedDates = starts.flatMap((start) => weekDates(start));
  let counts = ensureCounts(input.options?.lookbackCounts ?? {}, pilots);

  for (const date of orderedDates) {
    const week = weeks[mondayOf(date)];
    const day = week.days[date];
    if (!day) continue;

    if (input.options?.weekendsOff && isWeekend(date)) {
      for (const ac of aircraft) {
        if (!day.aircraft[ac.id]) {
          day.aircraft[ac.id] = emptyAssignment("none");
        } else if (!day.aircraft[ac.id].locked) {
          day.aircraft[ac.id].status = "none";
          day.aircraft[ac.id].picId = null;
          day.aircraft[ac.id].sicId = null;
        }
      }
      if (!day.dutyOfficerLocked) day.dutyOfficerId = null;
      continue;
    }

    assignDay(
      day,
      pilots,
      aircraft,
      input.timeOff,
      counts,
      weeks,
      reasons,
      warnings,
      preserveLocked,
    );
  }

  rebalance(weeks, orderedDates, pilots, aircraft, input.timeOff, counts);

  const generatedWeeks: Record<string, WeekPlan> = {};
  for (const start of starts) {
    generatedWeeks[start] = {
      ...weeks[start],
      status: "draft",
      updatedAt: new Date().toISOString(),
    };
    warnings.push(
      ...validateWeek(
        weekDates(start).map((date) => generatedWeeks[start].days[date]),
        pilots,
        aircraft,
        input.timeOff,
      ).filter((warning) => warning.severity === "error"),
    );
  }

  const fairness = computeFairness(
    input.pilots,
    aircraft,
    generatedWeeks,
    input.timeOff,
    orderedDates,
  );

  const totals = fairness
    .filter((stat) => pilots.some((pilot) => pilot.id === stat.pilotId))
    .map((stat) => stat.totalWorkDays);
  const minWork = totals.length ? Math.min(...totals) : 0;
  const maxWork = totals.length ? Math.max(...totals) : 0;

  return {
    weeks: generatedWeeks,
    fairness,
    warnings: dedupeWarnings(warnings),
    reasons,
    score: {
      minWork,
      maxWork,
      spread: maxWork - minWork,
    },
  };
}

function dedupeWarnings(warnings: ScheduleWarning[]): ScheduleWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.date}:${warning.severity}:${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function computeFairness(
  pilots: Pilot[],
  aircraft: Aircraft[],
  weeks: Record<string, WeekPlan>,
  timeOff: TimeOff[],
  dates: string[],
): FairnessStat[] {
  const counts = ensureCounts({}, pilots);
  for (const date of dates) {
    const day = weeks[mondayOf(date)]?.days[date];
    if (day) addAssignmentToCounts(counts, day, aircraft);
  }
  return fairnessFromCounts(pilots, counts, weeks, timeOff, dates).sort(
    (a, b) => b.totalWorkDays - a.totalWorkDays,
  );
}

export function lookbackCounts(
  pilots: Pilot[],
  aircraft: Aircraft[],
  weeks: Record<string, WeekPlan>,
  beforeMonday: string,
  lookbackWeeks = 3,
): CountsMap {
  const counts = ensureCounts({}, pilots);
  for (let i = 1; i <= lookbackWeeks; i++) {
    const start = addDays(beforeMonday, -7 * i);
    const week = weeks[start];
    if (!week) continue;
    for (const date of weekDates(start)) {
      const day = week.days[date];
      if (day) addAssignmentToCounts(counts, day, aircraft);
    }
  }
  return counts;
}

export { workSpread };
