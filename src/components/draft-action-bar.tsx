"use client";

import { Check, RotateCcw } from "lucide-react";
import { useOps } from "@/lib/ops-context";

export function DraftActionBar() {
  const { draftPending, savingDraft, saveDraft, discardDraft } = useOps();

  if (!draftPending) return null;

  return (
    <div className="no-print sticky top-3 z-40 mb-4">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-white px-4 py-3 shadow-[0_12px_40px_rgba(18,39,66,0.18)]">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-navy-900">Unsaved recommendation</div>
          <p className="text-[12px] leading-snug text-muted">
            This is a draft preview only. Save it to keep the lineup, or discard to put the last
            saved board back. Publish is available after you save.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={discardDraft}
            disabled={savingDraft}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw size={15} />
            Discard
          </button>
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={savingDraft}
            className="inline-flex items-center gap-2 rounded-md bg-navy-800 px-3 py-2 text-sm font-bold text-white hover:bg-navy-700 disabled:opacity-60"
          >
            <Check size={15} />
            {savingDraft ? "Saving…" : "Save draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
