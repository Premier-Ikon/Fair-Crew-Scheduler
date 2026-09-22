"use client";

import { ChevronLeft, ChevronRight, Lock, Sparkles, Upload } from "lucide-react";
import { boardHeader, weekDates, weekRangeLabel } from "@/shared/dates";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useOps } from "@/lib/ops-context";

export function WeekToolbar({
  onRecommend,
}: {
  onRecommend?: () => void;
}) {
  const { weekStart, shiftWeek, week, publishWeek, warnings, dirty } = useOps();
  const { isAdmin } = useAuth();
  const dates = weekDates(weekStart);
  const errors = warnings.filter((item) => item.severity === "error").length;

  return (
    <div className="no-print mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
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
        <div className="hidden text-[11px] uppercase tracking-wider text-muted sm:block">
          {dates.map(boardHeader).join("  ·  ")}
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase",
          dirty
            ? "bg-deployed text-amber-900"
            : week.status === "published"
              ? "bg-ok text-emerald-900"
              : "bg-slate-200 text-slate-700",
        )}
      >
        {dirty ? "unsaved" : week.status}
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
      {isAdmin ? (
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          {onRecommend ? (
            <button
              type="button"
              onClick={onRecommend}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#c45c26] px-3 py-2 text-sm font-bold text-white hover:bg-[#a94c1e] sm:min-h-0 sm:flex-none"
            >
              <Sparkles size={15} />
              Recommend
            </button>
          ) : null}
          <button
            type="button"
            onClick={publishWeek}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-navy-800 bg-navy-800 px-3 py-2 text-sm font-bold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:flex-none"
          >
            {week.status === "published" ? <Lock size={15} /> : <Upload size={15} />}
            {week.status === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      ) : (
        <div className="ml-auto text-[12px] font-semibold text-muted">Your week</div>
      )}
    </div>
  );
}
