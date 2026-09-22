"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { addDays, mondayOf, todayIso, weekDates } from "@/shared/dates";
import { demoSeed, emptyWeek, hydrateRoster } from "@/shared/seed";
import { computeFairness, lookbackCounts } from "@/shared/scheduler";
import { validateWeek } from "@/shared/validate";
import type {
  Aircraft,
  DayAircraftAssignment,
  DayPlan,
  FairnessStat,
  GenerateResult,
  Pilot,
  SeatRole,
  TimeOff,
  WeekPlan,
} from "@/shared/types";
import { cloudBackendEnabled, generateOnBackend } from "./backend";
import { loadSnapshot, persistenceMode, saveSnapshot } from "./storage";

type OpsContextValue = {
  ready: boolean;
  persistence: "cloud" | "firestore" | "local";
  pilots: Pilot[];
  aircraft: Aircraft[];
  weeks: Record<string, WeekPlan>;
  timeOff: TimeOff[];
  weekStart: string;
  week: WeekPlan;
  fairness: FairnessStat[];
  warnings: ReturnType<typeof validateWeek>;
  notice: string | null;
  generating: boolean;
  setWeekStart: (iso: string) => void;
  shiftWeek: (weeks: number) => void;
  updateDay: (date: string, patch: Partial<DayPlan>) => void;
  updateAssignment: (
    date: string,
    aircraftId: string,
    patch: Partial<DayAircraftAssignment>,
  ) => void;
  setDutyOfficer: (date: string, pilotId: string | null) => void;
  upsertPilot: (pilot: Pilot) => void;
  removePilot: (pilotId: string) => void;
  setQual: (pilotId: string, aircraftId: string, role: SeatRole | null) => void;
  upsertAircraft: (aircraft: Aircraft) => void;
  addTimeOff: (item: TimeOff) => void;
  removeTimeOff: (id: string) => void;
  timeOffOn: (pilotId: string, date: string) => TimeOff | undefined;
  publishWeek: () => void;
  generate: (weekCount: number, preserveLocked: boolean) => Promise<GenerateResult | null>;
  applyGenerate: (result: GenerateResult) => void;
  dirty: boolean;
  shaking: boolean;
  saving: boolean;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
  warnUnsaved: () => void;
};

const OpsContext = createContext<OpsContextValue | null>(null);

function ensureWeek(
  weeks: Record<string, WeekPlan>,
  start: string,
  aircraft: Aircraft[],
): WeekPlan {
  return weeks[start] ?? emptyWeek(start, aircraft);
}

type Snapshot = {
  pilots: Pilot[];
  aircraft: Aircraft[];
  weeks: Record<string, WeekPlan>;
  timeOff: TimeOff[];
};

function cloneSnapshot(snapshot: Snapshot): Snapshot {
  return structuredClone(snapshot);
}

export function OpsProvider({ children }: { children: React.ReactNode }) {
  const seed = useMemo(() => demoSeed(todayIso()), []);
  const [ready, setReady] = useState(false);
  const [pilots, setPilots] = useState<Pilot[]>(seed.pilots);
  const [aircraft, setAircraft] = useState<Aircraft[]>(seed.aircraft);
  const [weeks, setWeeks] = useState<Record<string, WeekPlan>>(seed.weeks);
  const [timeOff, setTimeOff] = useState<TimeOff[]>(seed.timeOff);
  const [weekStart, setWeekStart] = useState(mondayOf(todayIso()));
  const [notice, setNotice] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shaking, setShaking] = useState(false);
  const lastSaved = useRef<Snapshot>(
    cloneSnapshot({
      pilots: seed.pilots,
      aircraft: seed.aircraft,
      weeks: seed.weeks,
      timeOff: seed.timeOff,
    }),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadSnapshot().catch((error) => {
        console.error("Could not load roster from Cloud Functions", error);
        return null;
      });
      if (cancelled) return;
      if (loaded?.pilots?.length) {
        const hydrated = hydrateRoster({
          pilots: loaded.pilots,
          aircraft: loaded.aircraft.length ? loaded.aircraft : seed.aircraft,
          weeks: Object.keys(loaded.weeks).length ? loaded.weeks : seed.weeks,
          timeOff: loaded.timeOff ?? [],
        });
        setPilots(hydrated.pilots);
        setAircraft(hydrated.aircraft);
        setWeeks(hydrated.weeks);
        setTimeOff(hydrated.timeOff);
        lastSaved.current = cloneSnapshot(hydrated);
      } else {
        const starting = {
          pilots: seed.pilots,
          aircraft: seed.aircraft,
          weeks: seed.weeks,
          timeOff: seed.timeOff,
        };
        lastSaved.current = cloneSnapshot(starting);
        await saveSnapshot(starting).catch((error) => {
          console.error("Could not save starting roster", error);
        });
      }
      setDirty(false);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [seed]);

  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  const warnUnsaved = useCallback(() => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 450);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const week = useMemo(
    () => ensureWeek(weeks, weekStart, aircraft),
    [weeks, weekStart, aircraft],
  );

  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

  const fairness = useMemo(
    () => computeFairness(pilots, aircraft, { ...weeks, [week.id]: week }, timeOff, dates),
    [pilots, aircraft, weeks, week, timeOff, dates],
  );

  const warnings = useMemo(
    () => validateWeek(dates.map((date) => week.days[date]).filter(Boolean), pilots, aircraft, timeOff),
    [dates, week, pilots, aircraft, timeOff],
  );

  const writeWeek = useCallback(
    (next: WeekPlan) => {
      markDirty();
      setWeeks((current) => ({
        ...current,
        [next.id]: { ...next, updatedAt: new Date().toISOString() },
      }));
    },
    [markDirty],
  );

  const updateDay = useCallback(
    (date: string, patch: Partial<DayPlan>) => {
      const current = ensureWeek(weeks, mondayOf(date), aircraft);
      const day = current.days[date];
      if (!day) return;
      writeWeek({
        ...current,
        days: { ...current.days, [date]: { ...day, ...patch } },
      });
    },
    [weeks, aircraft, writeWeek],
  );

  const updateAssignment = useCallback(
    (date: string, aircraftId: string, patch: Partial<DayAircraftAssignment>) => {
      const current = ensureWeek(weeks, mondayOf(date), aircraft);
      const day = current.days[date];
      if (!day) return;
      writeWeek({
        ...current,
        days: {
          ...current.days,
          [date]: {
            ...day,
            aircraft: {
              ...day.aircraft,
              [aircraftId]: { ...day.aircraft[aircraftId], ...patch },
            },
          },
        },
      });
    },
    [weeks, aircraft, writeWeek],
  );

  const setDutyOfficer = useCallback(
    (date: string, pilotId: string | null) => {
      updateDay(date, { dutyOfficerId: pilotId });
    },
    [updateDay],
  );

  const upsertPilot = useCallback((pilot: Pilot) => {
    markDirty();
    setPilots((current) => {
      const index = current.findIndex((item) => item.id === pilot.id);
      if (index === -1) return [...current, pilot];
      const next = [...current];
      next[index] = pilot;
      return next;
    });
  }, [markDirty]);

  const removePilot = useCallback((pilotId: string) => {
    markDirty();
    setPilots((current) => current.filter((pilot) => pilot.id !== pilotId));
    setTimeOff((current) => current.filter((item) => item.pilotId !== pilotId));
  }, [markDirty]);

  const setQual = useCallback((pilotId: string, aircraftId: string, role: SeatRole | null) => {
    markDirty();
    setPilots((current) =>
      current.map((pilot) =>
        pilot.id === pilotId
          ? { ...pilot, quals: { ...pilot.quals, [aircraftId]: role } }
          : pilot,
      ),
    );
  }, [markDirty]);

  const upsertAircraft = useCallback((item: Aircraft) => {
    markDirty();
    setAircraft((current) => {
      const index = current.findIndex((row) => row.id === item.id);
      if (index === -1) return [...current, item];
      const next = [...current];
      next[index] = item;
      return next;
    });
  }, [markDirty]);

  const addTimeOff = useCallback((item: TimeOff) => {
    markDirty();
    setTimeOff((current) => {
      const without = current.filter(
        (row) => !(row.pilotId === item.pilotId && row.date === item.date),
      );
      return [...without, item];
    });
  }, []);

  const removeTimeOff = useCallback((id: string) => {
    markDirty();
    setTimeOff((current) => current.filter((item) => item.id !== id));
  }, [markDirty]);

  const timeOffOn = useCallback(
    (pilotId: string, date: string) =>
      timeOff.find((item) => item.pilotId === pilotId && item.date === date),
    [timeOff],
  );

  const publishWeek = useCallback(() => {
    writeWeek({ ...week, status: week.status === "published" ? "draft" : "published" });
    setNotice(
      week.status === "published"
        ? "Reverted to draft. Save to keep it."
        : "Marked published. Save to keep it.",
    );
  }, [week, writeWeek]);

  const generate = useCallback(
    async (weekCount: number, preserveLocked: boolean) => {
      setGenerating(true);
      try {
        const payload = {
          weekStart,
          weekCount,
          pilots,
          aircraft,
          weeks,
          timeOff,
          options: {
            preserveLocked,
            weekendsOff: true,
            lookbackCounts: lookbackCounts(pilots, aircraft, weeks, weekStart, 3),
          },
        };
        if (cloudBackendEnabled()) {
          return await generateOnBackend(payload);
        }
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Generate failed");
        }
        return (await response.json()) as GenerateResult;
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not generate a lineup.");
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [weekStart, pilots, aircraft, weeks, timeOff],
  );

  const applyGenerate = useCallback((result: GenerateResult) => {
    const drafted = Object.fromEntries(
      Object.entries(result.weeks).map(([id, next]) => [
        id,
        { ...next, status: "draft" as const },
      ]),
    );
    markDirty();
    setWeeks((current) => ({ ...current, ...drafted }));
    setNotice(
      `Previewing recommendation (${result.score.minWork}–${result.score.maxWork} work days).`,
    );
  }, [markDirty]);

  const saveChanges = useCallback(async () => {
    setSaving(true);
    try {
      const snapshot = { pilots, aircraft, weeks, timeOff };
      await saveSnapshot(snapshot);
      lastSaved.current = cloneSnapshot(snapshot);
      setDirty(false);
      setNotice("Saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }, [pilots, aircraft, weeks, timeOff]);

  const discardChanges = useCallback(() => {
    const saved = cloneSnapshot(lastSaved.current);
    setPilots(saved.pilots);
    setAircraft(saved.aircraft);
    setWeeks(saved.weeks);
    setTimeOff(saved.timeOff);
    setDirty(false);
    setNotice("Changes discarded.");
  }, []);

  const value: OpsContextValue = {
    ready,
    persistence: persistenceMode(),
    pilots,
    aircraft,
    weeks,
    timeOff,
    weekStart,
    week,
    fairness,
    warnings,
    notice,
    generating,
    setWeekStart,
    shiftWeek: (count) => setWeekStart((current) => addDays(current, count * 7)),
    updateDay,
    updateAssignment,
    setDutyOfficer,
    upsertPilot,
    removePilot,
    setQual,
    upsertAircraft,
    addTimeOff,
    removeTimeOff,
    timeOffOn,
    publishWeek,
    generate,
    applyGenerate,
    dirty,
    shaking,
    saving,
    saveChanges,
    discardChanges,
    warnUnsaved,
  };

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps(): OpsContextValue {
  const value = useContext(OpsContext);
  if (!value) throw new Error("useOps must be used inside OpsProvider");
  return value;
}
