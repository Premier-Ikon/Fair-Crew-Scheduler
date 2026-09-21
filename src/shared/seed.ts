import type {
  Aircraft,
  DayAircraftAssignment,
  DayPlan,
  Pilot,
  TimeOff,
  WeekPlan,
} from "./types";
import { addDays, mondayOf, todayIso, weekDates, isWeekend } from "./dates";

export const SEED_PILOTS: Pilot[] = [
  {
    id: "paul",
    name: "Paul",
    color: "#1d4ed8",
    quals: { bou: "PIC", casa: null, otter: "PIC", n238: "PIC" },
    active: true,
  },
  {
    id: "jerb",
    name: "Jerb",
    color: "#0f766e",
    quals: { bou: "PIC", casa: "PIC", otter: "PIC", n238: "PIC" },
    active: true,
  },
  {
    id: "jordan",
    name: "Jordan",
    color: "#7c3aed",
    quals: { bou: "SIC", casa: "PIC", otter: "PIC", n238: "PIC" },
    active: true,
  },
  {
    id: "dustin",
    name: "Dustin",
    color: "#c2410c",
    quals: { bou: null, casa: "PIC", otter: "SIC", n238: "SIC" },
    active: true,
  },
  {
    id: "amanda",
    name: "Amanda",
    color: "#be185d",
    quals: { bou: "SIC", casa: "SIC", otter: null, n238: null },
    active: true,
  },
  {
    id: "chris",
    name: "Chris",
    color: "#3f6212",
    quals: { bou: "SIC", casa: "SIC", otter: null, n238: null },
    active: true,
  },
  {
    id: "matt",
    name: "Matt",
    color: "#0369a1",
    quals: { bou: "SIC", casa: null, otter: "SIC", n238: "SIC" },
    active: true,
  },
];

export const SEED_AIRCRAFT: Aircraft[] = [
  {
    id: "bou",
    name: "Bou",
    tailNumber: "N368SS",
    color: "#1e3a5f",
    active: true,
  },
  {
    id: "n238",
    name: "238",
    tailNumber: "N238PT",
    color: "#7c2d12",
    active: true,
  },
  {
    id: "otter",
    name: "Otter",
    tailNumber: "N502FS",
    color: "#115e59",
    active: true,
  },
  {
    id: "casa",
    name: "Casa",
    tailNumber: "N434CA",
    color: "#9a3412",
    active: true,
  },
];

export function emptyAssignment(status: DayAircraftAssignment["status"]): DayAircraftAssignment {
  return { status, picId: null, sicId: null, note: "", locked: false };
}

function defaultAssignmentFor(aircraftId: string, date: string): DayAircraftAssignment {
  if (isWeekend(date)) return emptyAssignment("none");
  // N238PT is usually off-station on the real board (Pinal / MX), not a daily local line.
  if (aircraftId === "n238") {
    return { ...emptyAssignment("deployed"), note: "Pinal, AZ" };
  }
  return emptyAssignment("flying");
}

export function emptyDay(date: string, aircraft: Aircraft[]): DayPlan {
  return {
    date,
    aircraft: Object.fromEntries(
      aircraft.map((ac) => [ac.id, defaultAssignmentFor(ac.id, date)]),
    ),
    dutyOfficerId: null,
    dutyOfficerLocked: false,
    offSiteCrewIds: [],
    notes: "",
  };
}

export function emptyWeek(startDate: string, aircraft: Aircraft[] = SEED_AIRCRAFT): WeekPlan {
  const monday = mondayOf(startDate);
  const days = Object.fromEntries(
    weekDates(monday).map((date) => [date, emptyDay(date, aircraft)]),
  );
  return {
    id: monday,
    startDate: monday,
    status: "draft",
    days,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Mirrors the real board: weekdays are line days, weekends are dark.
 * Mixes a 2-ship Monday so the optimizer has days off to rotate —
 * that's the unfairness pattern from the spreadsheet (some 5-day
 * stretches, others sitting).
 */
export function realisticWeek(startDate: string, aircraft: Aircraft[] = SEED_AIRCRAFT): WeekPlan {
  const week = emptyWeek(startDate, aircraft);
  const dates = weekDates(week.startDate);

  dates.forEach((date, index) => {
    const day = week.days[date];
    if (isWeekend(date)) return;

    // First weekday of the sample week: Bou parked, two-ship day.
    if (index === 0 && day.aircraft.bou) {
      day.aircraft.bou.status = "none";
      day.aircraft.bou.note = "No scheduled flights";
    }
  });

  return week;
}

export function seedTimeOff(weekStart: string): TimeOff[] {
  // Light sample leave so the generator has to work around it.
  const thursday = addDays(mondayOf(weekStart), 3);
  return [
    {
      id: "pto-amanda-demo",
      pilotId: "amanda",
      date: thursday,
      type: "pto",
      note: "PTO",
    },
  ];
}

export function demoSeed(anchor = todayIso()) {
  const currentMonday = mondayOf(anchor);
  const weeks: Record<string, WeekPlan> = {};
  for (let i = 0; i < 4; i++) {
    const start = addDays(currentMonday, i * 7);
    weeks[start] = realisticWeek(start);
  }
  return {
    pilots: SEED_PILOTS,
    aircraft: SEED_AIRCRAFT,
    weeks,
    timeOff: seedTimeOff(currentMonday),
  };
}

export function hydrateRoster(loaded: {
  pilots: Pilot[];
  aircraft: Aircraft[];
  weeks: Record<string, WeekPlan>;
  timeOff: TimeOff[];
}) {
  const known = new Map(loaded.aircraft.map((item) => [item.id, item]));
  const aircraft = [
    ...SEED_AIRCRAFT.map((item) => known.get(item.id) ?? item),
    ...loaded.aircraft.filter((item) => !SEED_AIRCRAFT.some((seed) => seed.id === item.id)),
  ];

  const seedById = new Map(SEED_PILOTS.map((pilot) => [pilot.id, pilot]));
  const pilots = loaded.pilots.map((pilot) => {
    const seeded = seedById.get(pilot.id);
    const quals = { ...pilot.quals };
    for (const ac of aircraft) {
      if (!(ac.id in quals)) {
        quals[ac.id] = seeded?.quals[ac.id] ?? null;
      }
    }
    return { ...pilot, quals };
  });

  const weeks = Object.fromEntries(
    Object.entries(loaded.weeks).map(([id, week]) => [
      id,
      {
        ...week,
        days: Object.fromEntries(
          Object.entries(week.days).map(([date, day]) => [
            date,
            {
              ...day,
              aircraft: Object.fromEntries(
                aircraft.map((ac) => [
                  ac.id,
                  day.aircraft[ac.id] ?? defaultAssignmentFor(ac.id, date),
                ]),
              ),
            },
          ]),
        ),
      },
    ]),
  );

  return {
    pilots,
    aircraft,
    weeks,
    timeOff: loaded.timeOff,
  };
}
