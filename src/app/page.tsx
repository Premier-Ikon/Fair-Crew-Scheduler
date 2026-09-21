"use client";

import { useState } from "react";
import { FairnessPanel } from "@/components/fairness-panel";
import { RecommendPanel } from "@/components/recommend-panel";
import { ScheduleBoard } from "@/components/schedule-board";
import { WeekToolbar } from "@/components/week-toolbar";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/cn";

export default function LinePage() {
  const [recommendOpen, setRecommendOpen] = useState(false);
  const { warnings, week } = useOps();
  const filled = Object.values(week.days).some(
    (day) => day.dutyOfficerId || Object.values(day.aircraft).some((item) => item.picId),
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <WeekToolbar onRecommend={() => setRecommendOpen(true)} />
        {!filled ? (
          <div className="no-print mb-3 rounded-md border border-amber-300 bg-deployed px-3 py-2 text-sm text-amber-950">
            This week is an empty board — same starting point as a blank spreadsheet. Click
            Recommend to get a legal, even lineup, then edit any cell.
          </div>
        ) : null}
        <ScheduleBoard />
        {warnings.length > 0 ? (
          <div className="mt-3 space-y-1">
            {warnings.map((warning) => (
              <div
                key={`${warning.date}-${warning.message}`}
                className={cn(
                  "rounded-md px-3 py-2 text-[12px]",
                  warning.severity === "error"
                    ? "bg-mx text-red-900"
                    : warning.severity === "warning"
                      ? "bg-deployed text-amber-950"
                      : "bg-paper text-muted",
                )}
              >
                {warning.date}: {warning.message}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <FairnessPanel />
      <RecommendPanel open={recommendOpen} onClose={() => setRecommendOpen(false)} />
    </div>
  );
}
