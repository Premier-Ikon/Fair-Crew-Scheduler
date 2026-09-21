"use client";

import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/cn";

export function FairnessPanel() {
  const { fairness, pilots } = useOps();
  const active = fairness.filter((row) => pilots.find((pilot) => pilot.id === row.pilotId)?.active);
  const max = Math.max(1, ...active.map((row) => row.totalWorkDays));
  const totals = active.map((row) => row.totalWorkDays);
  const spread = totals.length ? Math.max(...totals) - Math.min(...totals) : 0;

  return (
    <aside className="no-print rounded-lg border border-line bg-white p-4">
      <div className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-navy-800">
        Workload this week
      </div>
      <p className="mb-4 text-[12px] leading-relaxed text-muted">
        Fair means the busiest and lightest pilots differ by at most one day. Spread now:{" "}
        <span className="font-bold text-ink">{spread}</span>
      </p>
      <div className="space-y-3">
        {active.map((row) => (
          <div key={row.pilotId}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                {row.name}
              </span>
              <span className="font-mono text-[11px] text-muted">{row.totalWorkDays}d</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-off">
              <span
                className="bg-navy-800"
                style={{ width: `${(row.picSeats / max) * 100}%` }}
                title="PIC"
              />
              <span
                className="bg-[#2b6cb0]"
                style={{ width: `${(row.sicSeats / max) * 100}%` }}
                title="SIC"
              />
              <span
                className="bg-[#c45c26]"
                style={{ width: `${(row.dutyDays / max) * 100}%` }}
                title="Duty"
              />
            </div>
            <div className="mt-1 flex gap-2 text-[10px] uppercase tracking-wide text-muted">
              <span>PIC {row.picSeats}</span>
              <span>SIC {row.sicSeats}</span>
              <span>DO {row.dutyDays}</span>
              <span>Off {row.offDays}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-3 text-[10px] uppercase tracking-wide text-muted">
        <Legend className="bg-navy-800" label="PIC" />
        <Legend className="bg-[#2b6cb0]" label="SIC" />
        <Legend className="bg-[#c45c26]" label="Duty" />
      </div>
    </aside>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded-sm", className)} />
      {label}
    </span>
  );
}
