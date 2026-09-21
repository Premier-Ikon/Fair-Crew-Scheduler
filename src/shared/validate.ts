import type {
  Aircraft,
  DayPlan,
  Pilot,
  SeatRole,
  ScheduleWarning,
  TimeOff,
} from "./types";

export function canPic(pilot: Pilot, aircraftId: string): boolean {
  return pilot.active && pilot.quals[aircraftId] === "PIC";
}

export function canRightSeat(pilot: Pilot, aircraftId: string): boolean {
  const role = pilot.quals[aircraftId];
  return pilot.active && (role === "PIC" || role === "SIC");
}

export function seatRole(pilot: Pilot, aircraftId: string): SeatRole | null {
  return pilot.quals[aircraftId] ?? null;
}

export function isOff(pilotId: string, date: string, timeOff: TimeOff[]): TimeOff | undefined {
  return timeOff.find((item) => item.pilotId === pilotId && item.date === date);
}

export function occupiedIds(day: DayPlan): Set<string> {
  const ids = new Set<string>();
  for (const assignment of Object.values(day.aircraft)) {
    if (assignment.picId) ids.add(assignment.picId);
    if (assignment.sicId) ids.add(assignment.sicId);
  }
  if (day.dutyOfficerId) ids.add(day.dutyOfficerId);
  for (const id of day.offSiteCrewIds) ids.add(id);
  return ids;
}

export function validateDay(
  day: DayPlan,
  pilots: Pilot[],
  aircraft: Aircraft[],
  timeOff: TimeOff[],
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const byId = new Map(pilots.map((pilot) => [pilot.id, pilot]));
  const seen = new Map<string, string[]>();
  const flying = aircraft.filter(
    (ac) => ac.active && day.aircraft[ac.id]?.status === "flying",
  );

  const mark = (pilotId: string, slot: string) => {
    const list = seen.get(pilotId) ?? [];
    list.push(slot);
    seen.set(pilotId, list);
  };

  for (const ac of flying) {
    const assignment = day.aircraft[ac.id];
    if (!assignment.picId) {
      warnings.push({
        date: day.date,
        severity: "error",
        message: `${ac.name} is flying with no PIC (left seat).`,
      });
    } else {
      const pic = byId.get(assignment.picId);
      if (!pic) {
        warnings.push({
          date: day.date,
          severity: "error",
          message: `${ac.name} PIC is not on the roster.`,
        });
      } else if (!canPic(pic, ac.id)) {
        warnings.push({
          date: day.date,
          severity: "error",
          message: `${pic.name} cannot fly ${ac.name} left seat (PIC only).`,
        });
      }
      if (assignment.picId) mark(assignment.picId, `${ac.name} PIC`);
    }

    if (!assignment.sicId) {
      warnings.push({
        date: day.date,
        severity: "warning",
        message: `${ac.name} is flying with no SIC (right seat).`,
      });
    } else {
      const sic = byId.get(assignment.sicId);
      if (!sic) {
        warnings.push({
          date: day.date,
          severity: "error",
          message: `${ac.name} SIC is not on the roster.`,
        });
      } else if (!canRightSeat(sic, ac.id)) {
        warnings.push({
          date: day.date,
          severity: "error",
          message: `${sic.name} is not qualified on ${ac.name}.`,
        });
      }
      if (assignment.sicId) mark(assignment.sicId, `${ac.name} SIC`);
    }
  }

  if (flying.length > 0 && !day.dutyOfficerId) {
    warnings.push({
      date: day.date,
      severity: "error",
      message: "Duty officer is required on a flying day.",
    });
  }

  if (day.dutyOfficerId) {
    if (!byId.get(day.dutyOfficerId)) {
      warnings.push({
        date: day.date,
        severity: "error",
        message: "Duty officer is not on the roster.",
      });
    }
    mark(day.dutyOfficerId, "Duty officer");
  }

  for (const [pilotId, slots] of seen) {
    const off = isOff(pilotId, day.date, timeOff);
    const pilot = byId.get(pilotId);
    const name = pilot?.name ?? pilotId;
    if (off) {
      warnings.push({
        date: day.date,
        severity: "error",
        message: `${name} is assigned (${slots.join(", ")}) while on ${off.type.toUpperCase()}.`,
      });
    }
    if (slots.length > 1) {
      warnings.push({
        date: day.date,
        severity: "error",
        message: `${name} is double-booked: ${slots.join(" + ")}.`,
      });
    }
  }

  return warnings;
}

export function validateWeek(
  days: DayPlan[],
  pilots: Pilot[],
  aircraft: Aircraft[],
  timeOff: TimeOff[],
): ScheduleWarning[] {
  return days.flatMap((day) => validateDay(day, pilots, aircraft, timeOff));
}
