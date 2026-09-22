"use client";

import type { Pilot } from "@/shared/types";
import { cn } from "@/lib/cn";

export function PilotChip({
  pilot,
  role,
  compact = false,
  mine = false,
}: {
  pilot?: Pilot | null;
  role?: string;
  compact?: boolean;
  mine?: boolean;
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
      <span className={cn("font-semibold", mine ? "text-[#c45c26]" : "text-ink")}>{pilot.name}</span>
      {role ? <span className="text-[10px] font-bold uppercase text-muted">{role}</span> : null}
      {mine ? (
        <span className="rounded-full bg-[#c45c26] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
          You
        </span>
      ) : null}
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
