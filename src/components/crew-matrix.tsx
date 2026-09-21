"use client";

import { useState } from "react";
import { boardHeader, isWeekend, weekDates } from "@/shared/dates";
import type { DayPlan } from "@/shared/types";
import { cn } from "@/lib/cn";
import { useOps } from "@/lib/ops-context";
import { WeekToolbar } from "./week-toolbar";
import { RecommendPanel } from "./recommend-panel";

export function CrewMatrix() {
  const { week, pilots, aircraft, addTimeOff, removeTimeOff, timeOffOn, fairness } =
    useOps();
  const dates = weekDates(week.startDate);
  const [recommendOpen, setRecommendOpen] = useState(false);

  return (
    <div>
      <WeekToolbar onRecommend={() => setRecommendOpen(true)} />
      <div className="overflow-hidden rounded-lg border border-[#9aafc7] bg-white shadow-sm">
        <table className="board-table">
          <thead>
            <tr>
              <th>Crew</th>
              {dates.map((date) => (
                <th key={date}>{boardHeader(date)}</th>
              ))}
              <th>Work</th>
            </tr>
          </thead>
          <tbody>
            {pilots
              .filter((pilot) => pilot.active)
              .map((pilot) => {
                const stats = fairness.find((row) => row.pilotId === pilot.id);
                return (
                  <tr key={pilot.id}>
                    <th className="bg-white px-2.5 py-2 text-left">
                      <div className="flex items-center gap-2 text-xs font-bold text-navy-900">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: pilot.color }} />
                        {pilot.name}
                      </div>
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                        {Object.entries(pilot.quals)
                          .filter(([, role]) => role)
                          .map(([id, role]) => `${id} ${role}`)
                          .join(" · ")}
                      </div>
                    </th>
                    {dates.map((date) => {
                      const day = week.days[date];
                      const off = timeOffOn(pilot.id, date);
                      const label = day ? assignmentLabel(pilot.id, day, aircraft) : "";
                      const weekend = isWeekend(date);
                      return (
                        <td
                          key={date}
                          className={cn(
                            "p-1.5 text-center text-[12px] font-semibold",
                            off ? "bg-note" : label ? "bg-white" : weekend ? "bg-off" : "bg-slate-50",
                          )}
                        >
                          <button
                            type="button"
                            className="min-h-[44px] w-full"
                            onClick={() => {
                              if (off) removeTimeOff(off.id);
                              else if (!label) {
                                addTimeOff({
                                  id: `${pilot.id}-${date}`,
                                  pilotId: pilot.id,
                                  date,
                                  type: "pto",
                                  note: "PTO",
                                });
                              }
                            }}
                            title={label ? "Edit on the Line board" : off ? "Clear leave" : "Mark PTO"}
                          >
                            {off ? (
                              <span className="text-rose-800">{off.type.toUpperCase()}</span>
                            ) : (
                              label || (weekend ? "" : "Off")
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="bg-paper text-center font-mono text-sm font-bold">
                      {stats?.totalWorkDays ?? 0}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-muted">
        This is the view that makes unfair weeks obvious — scan the Work column. Click an empty
        weekday to mark PTO; click PTO to clear it. Crew names on flying days are edited on Line.
      </p>
      <RecommendPanel open={recommendOpen} onClose={() => setRecommendOpen(false)} />
    </div>
  );
}

function assignmentLabel(
  pilotId: string,
  day: DayPlan,
  aircraft: { id: string; name: string }[],
): string {
  for (const item of aircraft) {
    const assignment = day.aircraft[item.id];
    if (!assignment) continue;
    if (assignment.picId === pilotId) return `${item.name} PIC`;
    if (assignment.sicId === pilotId) return `${item.name} SIC`;
  }
  if (day.dutyOfficerId === pilotId) return "Duty";
  if (day.offSiteCrewIds.includes(pilotId)) return "Off-site";
  return "";
}
