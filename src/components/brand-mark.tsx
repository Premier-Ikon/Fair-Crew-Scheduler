import { cn } from "@/lib/cn";

export function BrandMark({
  size = "md",
  tone = "onDark",
  compact = false,
}: {
  size?: "sm" | "md" | "lg";
  tone?: "onDark" | "onLight";
  compact?: boolean;
}) {
  const box =
    size === "sm" ? "h-9 w-9 text-sm" : size === "lg" ? "h-14 w-14 text-xl" : "h-11 w-11 text-base";
  const onDark = tone === "onDark";

  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-[#c45c26] font-black tracking-tight text-white",
          box,
        )}
      >
        FC
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            "text-sm font-black uppercase tracking-[0.18em]",
            onDark ? "text-white" : "text-navy-900",
          )}
        >
          FairCrew
        </div>
        {compact ? null : (
          <div className={cn("hidden text-[11px] sm:block", onDark ? "text-white/65" : "text-muted")}>
            Fair line assignments for small flight ops
          </div>
        )}
      </div>
    </div>
  );
}
