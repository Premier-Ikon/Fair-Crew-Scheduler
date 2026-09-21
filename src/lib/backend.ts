import type { Aircraft, GenerateInput, GenerateResult, Pilot, TimeOff, WeekPlan } from "@/shared/types";
import { getAuthClient } from "./firebase";

type OpsSnapshot = {
  pilots: Pilot[];
  aircraft: Aircraft[];
  weeks: Record<string, WeekPlan>;
  timeOff: TimeOff[];
};

const BASE = (process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL ?? "").replace(/\/$/, "");

export function cloudBackendEnabled(): boolean {
  return BASE.length > 0;
}

export function functionUrl(name: string): string {
  return `${BASE}/${name}`;
}

async function bearerToken(): Promise<string | null> {
  const auth = getAuthClient();
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}

async function authHeaders(token?: string | null): Promise<HeadersInit> {
  const resolved = token === undefined ? await bearerToken() : token;
  return {
    "Content-Type": "application/json",
    ...(resolved ? { Authorization: `Bearer ${resolved}` } : {}),
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : text || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return parsed as T;
}

export async function generateOnBackend(input: GenerateInput): Promise<GenerateResult> {
  const response = await fetch(functionUrl("generateScheduleFn"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  return readJson<GenerateResult>(response);
}

export async function loadOpsFromBackend(): Promise<OpsSnapshot | null> {
  const response = await fetch(functionUrl("loadOps"), {
    headers: await authHeaders(),
  });
  return readJson<OpsSnapshot | null>(response);
}

export async function saveOpsToBackend(snapshot: OpsSnapshot): Promise<void> {
  await readJson<{ ok: boolean }>(
    await fetch(functionUrl("saveOps"), {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(snapshot),
    }),
  );
}

export async function accessRequest<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(functionUrl(path.split("?")[0]) + (path.includes("?") ? `?${path.split("?")[1]}` : ""), {
    method: init?.method ?? "GET",
    headers: await authHeaders(token),
    body: init?.body,
  });
  return readJson<T>(response);
}
