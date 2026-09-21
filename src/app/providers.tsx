"use client";

import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { OpsProvider } from "@/lib/ops-context";
import { AppShell } from "@/components/app-shell";
import { LoginScreen } from "@/components/login-screen";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthShell>{children}</AuthShell>
    </AuthProvider>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, user } = useAuth();
  const publicAuth = pathname.startsWith("/auth/");

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-navy-950 text-sm text-white/70">
        Loading FairCrew…
      </div>
    );
  }

  if (publicAuth) {
    return <>{children}</>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <OpsProvider>
      <AppShell>{children}</AppShell>
    </OpsProvider>
  );
}
