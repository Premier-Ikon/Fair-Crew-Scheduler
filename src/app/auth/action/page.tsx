"use client";

import { Suspense } from "react";
import { AuthActionScreen } from "@/components/auth-action-screen";

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-navy-950 text-sm text-white/70">
          Opening your FairCrew link…
        </div>
      }
    >
      <AuthActionScreen />
    </Suspense>
  );
}
