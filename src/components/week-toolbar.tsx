"use client";

import { ChevronLeft, ChevronRight, Lock, Sparkles, Upload } from "lucide-react";
import { boardHeader, weekDates, weekRangeLabel } from "@/shared/dates";
import { cn } from "@/lib/cn";
import { useOps } from "@/lib/ops-context";

export function WeekToolbar({
  onRecommend,
}: {
  onRecommend?: () => void;
}) {
  const { weekStart, shiftWeek, week, publishWeek, warnings, draftPending } = useOps();
  const dates = weekDates(weekStart);
  const errors = warnings.filter((item) => item.severity === "error").length;

  return (
    <div className="no-print mb-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          className="rounded-md border border-line bg-white p-1.5 hover:bg-slate-50"
          aria-label="Previous week"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          className="rounded-md border border-line bg-white p-1.5 hover:bg-slate-50"
          aria-label="Next week"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div>
        <div className="text-lg font-black tracking-tight text-navy-900">
          {weekRangeLabel(weekStart)}
        </div>
        <div className="text-[11px] uppercase tracking-wider text-muted">
          {dates.map(boardHeader).join("  ·  ")}
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase",
          draftPending
            ? "bg-deployed text-amber-900"
            : week.status === "published"
              ? "bg-ok text-emerald-900"
              : "bg-slate-200 text-slate-700",
        )}
      >
        {draftPending ? "unsaved draft" : week.status}
      </span>
      {errors > 0 ? (
        <span className="rounded-full bg-mx px-2.5 py-1 text-[11px] font-bold uppercase text-red-800">
          {errors} conflict{errors === 1 ? "" : "s"}
        </span>
      ) : (
        <span className="rounded-full bg-ok px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-800">
          Legal
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        {onRecommend ? (
          <button
            type="button"
            onClick={onRecommend}
            className="inline-flex items-center gap-2 rounded-md bg-[#c45c26] px-3 py-2 text-sm font-bold text-white hover:bg-[#a94c1e]"
          >
            <Sparkles size={15} />
            Recommend
          </button>
        ) : null}
        <button
          type="button"
          onClick={publishWeek}
          disabled={draftPending}
          title={draftPending ? "Save the recommendation first" : undefined}
          className="inline-flex items-center gap-2 rounded-md border border-navy-800 bg-navy-800 px-3 py-2 text-sm font-bold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {week.status === "published" ? <Lock size={15} /> : <Upload size={15} />}
          {week.status === "published" ? "Unpublish" : "Publish"}
        </button>
      </div>
    </div>
  );
}
