"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const STEPS = {
  shared: [
    {
      kicker: "Welcome",
      title: "This is the weekly assignment board.",
      body: "FairCrew is PIC, SIC, and duty officer on one sheet — the same lineup you already know, with fairer weeks.",
    },
    {
      kicker: "Line",
      title: "Tails across the week.",
      body: "Line is the board. Each cell is a ship for that day. When you have a seat or duty, that cell is marked so you can find your week fast.",
    },
    {
      kicker: "Crew",
      title: "Your name × each day.",
      body: "Crew is the person view. Your row sits at the top after you sign in. Scan across the week to see PIC, SIC, duty, off-site, or off.",
    },
  ],
  admin: {
    kicker: "People",
    title: "Access lives on the pilot.",
    body: "Put someone’s email on their row and FairCrew emails them a password setup link — same style as a reset. That is how they open the board.",
  },
  member: {
    kicker: "Your week",
    title: "You are on the roster.",
    body: "An operator put your email on your name. That is why you got the setup email. You can look at the line; they build and publish it.",
  },
};

export function OnboardingTour() {
  const { onboardingDone, completeOnboarding, isAdmin } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const steps = [...STEPS.shared, isAdmin ? STEPS.admin : STEPS.member];
  const current = steps[step];
  const last = step === steps.length - 1;

  if (onboardingDone !== false) return null;

  async function finish() {
    setBusy(true);
    try {
      await completeOnboarding();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b1a2e]/55 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-[0_24px_80px_rgba(11,26,46,0.35)] sm:rounded-2xl">
        <div className="bg-navy-950 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#c45c26] text-sm font-black">
              FC
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e08a4f]">
                {current.kicker}
              </div>
              <div className="text-sm font-semibold text-white/70">
                Step {step + 1} of {steps.length}
              </div>
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-black leading-tight tracking-tight">{current.title}</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-ink">{current.body}</p>
          <div className="mt-5 flex items-center gap-1.5">
            {steps.map((item, index) => (
              <span
                key={item.kicker}
                className={`h-1.5 rounded-full transition-all ${
                  index === step ? "w-6 bg-[#c45c26]" : "w-1.5 bg-line"
                }`}
              />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish()}
              className="text-sm font-bold text-muted hover:text-navy-900 disabled:opacity-50"
            >
              Skip
            </button>
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((currentStep) => currentStep - 1)}
                  className="rounded-md border border-line px-3 py-2 text-sm font-bold text-ink hover:bg-slate-50"
                >
                  Back
                </button>
              ) : null}
              {last ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void finish()}
                  className="rounded-md bg-[#c45c26] px-3 py-2 text-sm font-black text-white hover:bg-[#b35020] disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Got it"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((currentStep) => currentStep + 1)}
                  className="rounded-md bg-navy-800 px-3 py-2 text-sm font-black text-white hover:bg-navy-700"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
