"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Cloud, HardDrive, Users, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth-context";
import { useOps } from "@/lib/ops-context";
import { DraftActionBar } from "./draft-action-bar";
import { BrandMark } from "./brand-mark";

const NAV = [
  { href: "/", label: "Line", icon: LayoutGrid },
  { href: "/crew", label: "Crew", icon: CalendarDays },
  { href: "/people", label: "People", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { persistence, notice, ready } = useOps();
  const { email, signOut } = useAuth();

  return (
    <div className="min-h-full bg-paper text-ink">
      <header className="no-print bg-navy-900 text-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-4 py-3">
          <BrandMark size="sm" />
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
          <div className="ml-auto flex items-center gap-3 text-[11px] text-white/75">
            <span className="hidden items-center gap-2 sm:flex">
              {persistence === "local" ? <HardDrive size={14} /> : <Cloud size={14} />}
              {persistence === "cloud"
                ? "Cloud Functions + Firestore"
                : persistence === "firestore"
                  ? "Firestore"
                  : "Saved on this browser"}
            </span>
            {email ? <span className="hidden font-semibold text-white/90 md:inline">{email}</span> : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md px-2 py-1 font-bold text-white/80 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-4 py-4">
        {ready ? (
          <>
            <DraftActionBar />
            {children}
          </>
        ) : (
          <LoadingState />
        )}
      </div>
      {notice ? (
        <div className="no-print fixed bottom-4 right-4 max-w-sm rounded-md bg-navy-900 px-4 py-3 text-sm text-white shadow-lg">
          {notice}
        </div>
      ) : null}
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
