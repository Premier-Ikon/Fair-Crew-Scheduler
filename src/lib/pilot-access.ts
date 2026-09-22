import type { Pilot } from "@/shared/types";

export const HIDDEN_ADMIN_EMAIL = "info@necti.io";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function pilotForEmail(pilots: Pilot[], email: string | null | undefined): Pilot | null {
  if (!email) return null;
  const needle = normalizeEmail(email);
  return pilots.find((pilot) => pilot.email && normalizeEmail(pilot.email) === needle) ?? null;
}
