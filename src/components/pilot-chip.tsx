"use client";

import type { Pilot } from "@/shared/types";
import { cn } from "@/lib/cn";

export function PilotChip({
  pilot,
  role,
  compact = false,
}: {
  pilot?: Pilot | null;
  role?: string;
  compact?: boolean;
}) {
  if (!pilot) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", compact && "leading-tight")}>
      <span
        className="mt-px h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: pilot.color }}
      />
      <span className="font-semibold text-ink">{pilot.name}</span>
      {role ? <span className="text-[10px] font-bold uppercase text-muted">{role}</span> : null}
    </span>
  );
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
