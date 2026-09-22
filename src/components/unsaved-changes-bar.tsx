"use client";

import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/cn";

export function UnsavedChangesBar() {
  const { dirty, shaking, saving, saveChanges, discardChanges } = useOps();
  const { isAdmin } = useAuth();

  if (!isAdmin || !dirty) return null;

  return (
    <div
      className={cn(
        "unsaved-bar is-centered no-print fixed inset-x-3 z-50 sm:inset-x-auto sm:left-1/2 sm:w-[min(560px,calc(100%-1.5rem))] sm:-translate-x-1/2",
        "top-[calc(4.15rem+env(safe-area-inset-top))]",
        shaking && "is-shaking",
      )}
    >
      <div className="flex items-center gap-3 rounded-xl border border-[#ead9c8] bg-white px-3 py-2.5 shadow-[0_16px_40px_rgba(18,39,66,0.22)]">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-navy-900">Unsaved changes</div>
          <p className="hidden text-[11px] leading-snug text-muted sm:block">
            Save to keep this, or discard to go back.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={discardChanges}
          className="rounded-md px-2.5 py-2 text-sm font-bold text-ink hover:bg-slate-50 disabled:opacity-60"
        >
          Discard
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveChanges()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-[#c45c26] px-3 py-2 text-sm font-black text-white hover:bg-[#b35020] disabled:opacity-60"
        >
          <Check size={15} />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
