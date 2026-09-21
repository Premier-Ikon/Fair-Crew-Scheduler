import {
  collection,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import type { Aircraft, Pilot, TimeOff, WeekPlan } from "@/shared/types";
import { getDb, firebaseEnabled } from "./firebase";
import {
  cloudBackendEnabled,
  loadOpsFromBackend,
  saveOpsToBackend,
} from "./backend";

const LOCAL_KEY = "faircrew-ops-v1";

export type OpsSnapshot = {
  pilots: Pilot[];
  aircraft: Aircraft[];
  weeks: Record<string, WeekPlan>;
  timeOff: TimeOff[];
};

function canUseLocal(): boolean {
  return typeof window !== "undefined";
}

export function persistenceMode(): "cloud" | "firestore" | "local" {
  if (cloudBackendEnabled()) return "cloud";
  return firebaseEnabled ? "firestore" : "local";
}

export async function loadSnapshot(): Promise<OpsSnapshot | null> {
  if (cloudBackendEnabled()) {
    return loadOpsFromBackend();
  }
  if (firebaseEnabled) {
    const db = getDb();
    if (!db) return null;
    const [pilotsSnap, aircraftSnap, weeksSnap, timeOffSnap] = await Promise.all([
      getDocs(collection(db, "pilots")),
      getDocs(collection(db, "aircraft")),
      getDocs(collection(db, "weeks")),
      getDocs(collection(db, "timeOff")),
    ]);
    if (pilotsSnap.empty && aircraftSnap.empty) return null;
    return {
      pilots: pilotsSnap.docs.map((item) => item.data() as Pilot),
      aircraft: aircraftSnap.docs.map((item) => item.data() as Aircraft),
      weeks: Object.fromEntries(
        weeksSnap.docs.map((item) => [item.id, item.data() as WeekPlan]),
      ),
      timeOff: timeOffSnap.docs.map((item) => item.data() as TimeOff),
    };
  }

  if (!canUseLocal()) return null;
  const raw = window.localStorage.getItem(LOCAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OpsSnapshot;
  } catch {
    return null;
  }
}

export async function saveSnapshot(snapshot: OpsSnapshot): Promise<void> {
  if (cloudBackendEnabled()) {
    await saveOpsToBackend(snapshot);
    return;
  }
  if (firebaseEnabled) {
    const db = getDb();
    if (!db) return;
    const batch = writeBatch(db);
    for (const pilot of snapshot.pilots) {
      batch.set(doc(db, "pilots", pilot.id), pilot);
    }
    for (const aircraft of snapshot.aircraft) {
      batch.set(doc(db, "aircraft", aircraft.id), aircraft);
    }
    for (const week of Object.values(snapshot.weeks)) {
      batch.set(doc(db, "weeks", week.id), week);
    }
    for (const item of snapshot.timeOff) {
      batch.set(doc(db, "timeOff", item.id), item);
    }
    await batch.commit();
    return;
  }

  if (!canUseLocal()) return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot));
}
