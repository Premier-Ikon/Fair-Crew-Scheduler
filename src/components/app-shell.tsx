"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useOps } from "@/lib/ops-context";
import { UnsavedChangesBar } from "./unsaved-changes-bar";
import { BrandMark } from "./brand-mark";
import { OnboardingTour } from "./onboarding-tour";

const NAV = [
  { href: "/", label: "Line", icon: LayoutGrid },
  { href: "/crew", label: "Crew", icon: CalendarDays },
  { href: "/people", label: "People", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { notice, ready, pilots, dirty, warnUnsaved } = useOps();
  const { email, signOut, isAdmin } = useAuth();
  const viewer = pilots.find(
    (pilot) => email && pilot.email && pilot.email.toLowerCase() === email.toLowerCase(),
  );
  const nav = isAdmin ? NAV : NAV.filter((item) => item.href !== "/people");

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function guardNav(event: React.MouseEvent, href: string) {
    if (!dirty || pathname === href) return;
    event.preventDefault();
    warnUnsaved();
  }

  return (
    <div className="min-h-full bg-paper text-ink">
      <header className="no-print sticky top-0 z-30 bg-navy-900 text-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-3 py-2.5 sm:gap-6 sm:px-4 sm:py-3">
          <BrandMark size="sm" compact />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(event) => guardNav(event, item.href)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold",
                    active ? "bg-white/15" : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-white/75 sm:gap-3">
            {viewer ? (
              <span className="max-w-[40vw] truncate font-semibold text-white/90 sm:max-w-none">
                {viewer.name}
                <span className="hidden font-medium text-white/60 sm:inline"> · your week</span>
              </span>
            ) : email ? (
              <span className="hidden max-w-[36vw] truncate font-semibold text-white/90 sm:inline">
                {email}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (dirty) {
                  warnUnsaved();
                  return;
                }
                void signOut();
              }}
              className="rounded-md px-2 py-2 font-bold text-white/80 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div
        className={cn(
          "mx-auto max-w-[1440px] px-3 py-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 md:pb-4",
          dirty && "pt-20",
        )}
      >
        {ready ? (
          <>
            <UnsavedChangesBar />
            {children}
          </>
        ) : (
          <LoadingState />
        )}
      </div>
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-navy-900 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className={cn("grid", nav.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => guardNav(event, item.href)}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-bold",
                  active ? "text-white" : "text-white/55",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {notice ? (
        <div className="no-print fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 max-w-sm rounded-md bg-navy-900 px-4 py-3 text-sm text-white shadow-lg md:bottom-4 md:left-auto md:right-4">
          {notice}
        </div>
      ) : null}
      <OnboardingTour />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-line bg-white p-8 text-sm text-muted">
      Loading roster…
    </div>
  );
}
