"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/cn";
import type { GenerateResult } from "@/shared/types";

export function RecommendPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { generate, applyGenerate, generating } = useOps();
  const [weekCount, setWeekCount] = useState(1);
  const [preserveLocked, setPreserveLocked] = useState(true);
  const [result, setResult] = useState<GenerateResult | null>(null);

  if (!open) return null;

  async function run() {
    const next = await generate(weekCount, preserveLocked);
    setResult(next);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <button className="h-full flex-1" onClick={onClose} aria-label="Close" />
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-navy-900">Recommend lineup</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Builds PIC / SIC pairs from qualifications, then rotates flying, right seat, and
              duty so work days stay within one of each other. Same idea as airline rostering,
              sized for a 7-pilot shop.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-muted">
          Horizon
          <select
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink"
            value={weekCount}
            onChange={(event) => setWeekCount(Number(event.target.value))}
          >
            <option value={1}>This week</option>
            <option value={2}>Next 2 weeks</option>
            <option value={4}>Next 4 weeks</option>
          </select>
        </label>

        <label className="mb-5 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={preserveLocked}
            onChange={(event) => setPreserveLocked(event.target.checked)}
          />
          Keep locked cells
        </label>

        <button
          type="button"
          onClick={() => void run()}
          disabled={generating}
          className="w-full rounded-md bg-[#c45c26] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {generating ? "Building…" : "Build recommendation"}
        </button>

        {result ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-md bg-paper p-3 text-sm">
              <div className="font-bold text-navy-900">
                Work days {result.score.minWork}–{result.score.maxWork}
                <span className="ml-2 text-muted">spread {result.score.spread}</span>
              </div>
              <p className="mt-1 text-[12px] text-muted">
                A spread of 0 or 1 is as even as the flying line allows. 3-ship weekdays use
                everyone; 2-ship days are where days off get rotated.
              </p>
            </div>

            {result.warnings.length > 0 ? (
              <div className="space-y-1">
                {result.warnings.slice(0, 8).map((warning) => (
                  <div
                    key={`${warning.date}-${warning.message}`}
                    className={cn(
                      "rounded-md px-3 py-2 text-[12px]",
                      warning.severity === "error" ? "bg-mx text-red-900" : "bg-deployed text-amber-900",
                    )}
                  >
                    {warning.date}: {warning.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-ok px-3 py-2 text-[12px] text-emerald-900">
                No qualification or double-book conflicts.
              </div>
            )}

            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-wide text-muted">
                Why these names
              </div>
              <ul className="space-y-2 text-[12px] leading-relaxed text-ink">
                {result.reasons.slice(0, 8).map((reason, index) => (
                  <li key={`${reason.date}-${reason.slot}-${index}`}>
                    <span className="font-bold">{reason.slot}</span> · {reason.reason}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                applyGenerate(result);
                onClose();
              }}
              className="w-full rounded-md bg-navy-800 px-3 py-2.5 text-sm font-bold text-white"
            >
              Preview as draft
            </button>
            <p className="text-center text-[11px] text-muted">
              Does not save. Use Save draft or Discard on the board.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
