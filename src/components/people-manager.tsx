"use client";

import { useState } from "react";
import type { SeatRole } from "@/shared/types";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/cn";
import { AccessManager } from "./access-manager";

const ROLE_CYCLE: Array<SeatRole | null> = [null, "SIC", "PIC"];

export function PeopleManager() {
  const { pilots, aircraft, setQual, upsertPilot, removePilot, resetToSeed } = useOps();
  const [name, setName] = useState("");

  function addPilot() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    upsertPilot({
      id,
      name: trimmed,
      color: "#334155",
      quals: Object.fromEntries(aircraft.map((item) => [item.id, null])),
      active: true,
    });
    setName("");
  }

  return (
    <div className="space-y-6">
      <AccessManager />
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-black text-navy-900">How seats work</h2>
        <div className="mt-3 grid gap-3 text-sm leading-relaxed text-ink md:grid-cols-3">
          <Rule
            title="PIC · left seat"
            body="Type-rated captain. Can fly left or right. Every flying aircraft needs one."
          />
          <Rule
            title="SIC · right seat only"
            body="Can occupy right seat on that type. Cannot be assigned left seat, even if the line is short."
          />
          <Rule
            title="Duty officer"
            body="One required on every flying day. Any pilot can stand it, and they should not also be on a crew."
          />
        </div>
        <p className="mt-4 text-[12px] text-muted">
          Four tails: Bou (N368SS), 238 (N238PT), Otter (N502FS), Casa (N434CA). Bou only has
          two PICs. 238 is usually deployed (Pinal / MX), not a daily local line.
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-800 text-white">
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Pilot</th>
              {aircraft.map((item) => (
                <th key={item.id} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">
                  {item.name}
                  <div className="font-mono text-[10px] font-normal text-white/60">{item.tailNumber}</div>
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {pilots.map((pilot) => (
              <tr key={pilot.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: pilot.color }} />
                    {pilot.name}
                  </div>
                </td>
                {aircraft.map((item) => {
                  const role = pilot.quals[item.id] ?? null;
                  return (
                    <td key={item.id} className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          const index = ROLE_CYCLE.indexOf(role);
                          setQual(pilot.id, item.id, ROLE_CYCLE[(index + 1) % ROLE_CYCLE.length]);
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-black uppercase",
                          role === "PIC" && "bg-navy-800 text-white",
                          role === "SIC" && "bg-sky-100 text-sky-900",
                          !role && "bg-off text-muted",
                        )}
                      >
                        {role ?? "—"}
                      </button>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  <button
                    className="text-xs font-bold text-rose-800"
                    onClick={() => removePilot(pilot.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 border-t border-line p-3">
          <input
            className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
            placeholder="Add a pilot"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addPilot();
            }}
          />
          <button
            type="button"
            onClick={addPilot}
            className="rounded-md bg-navy-800 px-3 py-2 text-sm font-bold text-white"
          >
            Add
          </button>
          <button
            type="button"
            onClick={resetToSeed}
            className="rounded-md border border-line px-3 py-2 text-sm font-semibold"
          >
            Reset demo
          </button>
        </div>
      </section>
    </div>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md bg-paper p-3">
      <div className="text-xs font-black uppercase tracking-wide text-navy-800">{title}</div>
      <p className="mt-1">{body}</p>
    </div>
  );
}
