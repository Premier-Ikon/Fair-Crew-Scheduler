import { BrandMark } from "./brand-mark";

const RULES = [
  { title: "PIC", body: "Left seat. One captain on every flying tail." },
  { title: "SIC", body: "Right seat only. Never assigned left." },
  { title: "Duty", body: "One officer on the ground. Not also on a crew." },
];

export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh bg-paper lg:grid-cols-[1.15fr_1fr]">
      <aside className="auth-hero relative flex flex-col justify-between overflow-hidden bg-navy-950 px-6 py-5 text-white sm:px-8 lg:min-h-svh lg:px-14 lg:py-12">
        <BrandMark size="lg" />
        <div className="relative z-10 hidden max-w-xl lg:block">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#e08a4f]">
            Weekly assignment board
          </p>
          <h2 className="mt-3 text-4xl font-black leading-[1.1] tracking-tight xl:text-5xl">
            Fair weeks.
            <br />
            Same board.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            PIC, SIC, and duty officer on one board. Invite-only, so only the people you add can
            open it.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {RULES.map((rule) => (
              <div
                key={rule.title}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#e08a4f]">
                  {rule.title}
                </div>
                <p className="mt-1.5 text-[12px] leading-snug text-white/75">{rule.body}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 hidden text-[11px] text-white/45 lg:block">
          FairCrew · small-ops crew scheduler
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 lg:min-h-svh lg:px-14">
        <div className="w-full max-w-[400px]">
          <h1 className="text-2xl font-black tracking-tight text-navy-900">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-navy-800">
        {label}
      </span>
      {children}
    </label>
  );
}

export const authInputClass =
  "mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-[#c45c26]/30 transition focus:border-navy-700 focus:ring-4";

export const authPrimaryClass =
  "w-full rounded-md bg-[#c45c26] px-3 py-2.5 text-sm font-black text-white transition hover:bg-[#b35020] disabled:cursor-not-allowed disabled:opacity-55";
