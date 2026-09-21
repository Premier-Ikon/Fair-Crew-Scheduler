import { cn } from "@/lib/cn";

export function BrandMark({
  size = "md",
  tone = "onDark",
}: {
  size?: "sm" | "md" | "lg";
  tone?: "onDark" | "onLight";
}) {
  const box =
    size === "sm" ? "h-9 w-9 text-sm" : size === "lg" ? "h-14 w-14 text-xl" : "h-11 w-11 text-base";
  const onDark = tone === "onDark";

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-[#c45c26] font-black tracking-tight text-white",
          box,
        )}
      >
        FC
      </div>
      <div>
        <div
          className={cn(
            "text-sm font-black uppercase tracking-[0.18em]",
            onDark ? "text-white" : "text-navy-900",
          )}
        >
          FairCrew
        </div>
        <div className={cn("text-[11px]", onDark ? "text-white/65" : "text-muted")}>
          Fair line assignments for small flight ops
        </div>
      </div>
    </div>
  );
}
