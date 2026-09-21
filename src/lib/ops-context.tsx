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
  resetToSeed: () => void;
  generate: (weekCount: number, preserveLocked: boolean) => Promise<GenerateResult | null>;
  applyGenerate: (result: GenerateResult) => void;
  draftPending: boolean;
  savingDraft: boolean;
  saveDraft: () => Promise<void>;
  discardDraft: () => void;
};

const OpsContext = createContext<OpsContextValue | null>(null);

function ensureWeek(
  weeks: Record<string, WeekPlan>,
  start: string,
  aircraft: Aircraft[],
): WeekPlan {
  return weeks[start] ?? emptyWeek(start, aircraft);
}

function cloneWeeks(weeks: Record<string, WeekPlan>): Record<string, WeekPlan> {
  return structuredClone(weeks);
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
  const [draftPending, setDraftPending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const skipSave = useRef(true);
  const lastSavedWeeks = useRef<Record<string, WeekPlan>>(cloneWeeks(seed.weeks));

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
        lastSavedWeeks.current = cloneWeeks(hydrated.weeks);
      } else {
        lastSavedWeeks.current = cloneWeeks(seed.weeks);
      }
      setReady(true);
      skipSave.current = false;
    })();
    return () => {
      cancelled = true;
    };
  }, [seed]);

  useEffect(() => {
    if (!ready || skipSave.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (draftPending) {
        void saveSnapshot({
          pilots,
          aircraft,
          weeks: lastSavedWeeks.current,
          timeOff,
        });
        return;
      }
      lastSavedWeeks.current = cloneWeeks(weeks);
      void saveSnapshot({ pilots, aircraft, weeks, timeOff });
    }, 400);
  }, [ready, pilots, aircraft, weeks, timeOff, draftPending]);

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
      setWeeks((current) => ({
        ...current,
        [next.id]: { ...next, updatedAt: new Date().toISOString() },
      }));
    },
    [],
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
    setPilots((current) => {
      const index = current.findIndex((item) => item.id === pilot.id);
      if (index === -1) return [...current, pilot];
      const next = [...current];
      next[index] = pilot;
      return next;
    });
  }, []);

  const removePilot = useCallback((pilotId: string) => {
    setPilots((current) => current.filter((pilot) => pilot.id !== pilotId));
    setTimeOff((current) => current.filter((item) => item.pilotId !== pilotId));
  }, []);

  const setQual = useCallback((pilotId: string, aircraftId: string, role: SeatRole | null) => {
    setPilots((current) =>
      current.map((pilot) =>
        pilot.id === pilotId
          ? { ...pilot, quals: { ...pilot.quals, [aircraftId]: role } }
          : pilot,
      ),
    );
  }, []);

  const upsertAircraft = useCallback((item: Aircraft) => {
    setAircraft((current) => {
      const index = current.findIndex((row) => row.id === item.id);
      if (index === -1) return [...current, item];
      const next = [...current];
      next[index] = item;
      return next;
    });
  }, []);

  const addTimeOff = useCallback((item: TimeOff) => {
    setTimeOff((current) => {
      const without = current.filter(
        (row) => !(row.pilotId === item.pilotId && row.date === item.date),
      );
      return [...without, item];
    });
  }, []);

  const removeTimeOff = useCallback((id: string) => {
    setTimeOff((current) => current.filter((item) => item.id !== id));
  }, []);

  const timeOffOn = useCallback(
    (pilotId: string, date: string) =>
      timeOff.find((item) => item.pilotId === pilotId && item.date === date),
    [timeOff],
  );

  const publishWeek = useCallback(() => {
    if (draftPending) {
      setNotice("Save the recommendation first, then publish.");
      return;
    }
    writeWeek({ ...week, status: week.status === "published" ? "draft" : "published" });
    setNotice(week.status === "published" ? "Reverted to draft." : "Week published.");
  }, [draftPending, week, writeWeek]);

  const resetToSeed = useCallback(() => {
    const next = demoSeed(todayIso());
    setPilots(next.pilots);
    setAircraft(next.aircraft);
    setWeeks(next.weeks);
    setTimeOff(next.timeOff);
    lastSavedWeeks.current = cloneWeeks(next.weeks);
    setDraftPending(false);
    setWeekStart(mondayOf(todayIso()));
    setNotice("Restored demo roster and empty boards.");
  }, []);

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
    setWeeks((current) => ({ ...current, ...drafted }));
    setDraftPending(true);
    setNotice(
      `Previewing recommendation (${result.score.minWork}–${result.score.maxWork} work days). Save it to keep it, or discard to revert.`,
    );
  }, []);

  const saveDraft = useCallback(async () => {
    setSavingDraft(true);
    try {
      lastSavedWeeks.current = cloneWeeks(weeks);
      await saveSnapshot({ pilots, aircraft, weeks, timeOff });
      setDraftPending(false);
      setNotice("Draft saved. Publish when the line is ready.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save draft.");
    } finally {
      setSavingDraft(false);
    }
  }, [pilots, aircraft, weeks, timeOff]);

  const discardDraft = useCallback(() => {
    setWeeks(cloneWeeks(lastSavedWeeks.current));
    setDraftPending(false);
    setNotice("Recommendation discarded. Board restored to the last saved lineup.");
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
    resetToSeed,
    generate,
    applyGenerate,
    draftPending,
    savingDraft,
    saveDraft,
    discardDraft,
  };

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps(): OpsContextValue {
  const value = useContext(OpsContext);
  if (!value) throw new Error("useOps must be used inside OpsProvider");
  return value;
}
