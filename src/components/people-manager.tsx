"use client";

import { useEffect, useMemo, useState } from "react";
import type { Pilot, SeatRole } from "@/shared/types";
import { useAuth, type AccessPerson } from "@/lib/auth-context";
import { useOps } from "@/lib/ops-context";
import { HIDDEN_ADMIN_EMAIL, normalizeEmail } from "@/lib/pilot-access";
import { cn } from "@/lib/cn";
import { AccessLeftovers } from "./access-manager";

const ROLE_CYCLE: Array<SeatRole | null> = [null, "SIC", "PIC"];

export function PeopleManager() {
  const { pilots, aircraft, setQual, upsertPilot, removePilot } = useOps();
  const { listAccess, sendAccess, revokeAccess, isAdmin } = useAuth();
  const [name, setName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [people, setPeople] = useState<AccessPerson[]>([]);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshAccess() {
    const next = await listAccess();
    setPeople(next);
  }

  useEffect(() => {
    refreshAccess().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load access.");
    });
  }, []);

  const accessByEmail = useMemo(
    () => new Map(people.map((person) => [normalizeEmail(person.email), person])),
    [people],
  );

  const linkedEmails = useMemo(
    () =>
      new Set(
        pilots
          .map((pilot) => (pilot.email ? normalizeEmail(pilot.email) : ""))
          .filter(Boolean),
      ),
    [pilots],
  );

  const leftovers = people.filter((person) => !linkedEmails.has(normalizeEmail(person.email)));

  async function assignEmail(pilot: Pilot, rawEmail: string, send: boolean) {
    const email = normalizeEmail(rawEmail);
    if (!email || !email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (email === HIDDEN_ADMIN_EMAIL) {
      setError("That operator account is managed separately.");
      return;
    }
    const taken = pilots.find(
      (other) => other.id !== pilot.id && other.email && normalizeEmail(other.email) === email,
    );
    if (taken) {
      setError(`${email} is already on ${taken.name}.`);
      return;
    }

    setBusyEmail(pilot.id);
    setError(null);
    setNotice(null);
    try {
      const previous = pilot.email ? normalizeEmail(pilot.email) : "";
      if (previous && previous !== email) {
        await revokeAccess(previous);
      }
      upsertPilot({ ...pilot, email });
      if (send) {
        await sendAccess(email);
        setNotice(`Password setup email sent to ${pilot.name} at ${email}.`);
        await refreshAccess();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update access.");
    } finally {
      setBusyEmail(null);
    }
  }

  async function clearEmail(pilot: Pilot) {
    if (!pilot.email) return;
    if (!confirm(`Remove ${pilot.email} from ${pilot.name}? They will not be able to open FairCrew.`)) {
      return;
    }
    setBusyEmail(pilot.id);
    setError(null);
    try {
      await revokeAccess(normalizeEmail(pilot.email));
      upsertPilot({ ...pilot, email: "" });
      await refreshAccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove access.");
    } finally {
      setBusyEmail(null);
    }
  }

  function addPilot() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const email = normalizeEmail(newEmail);
    const pilot: Pilot = {
      id,
      name: trimmed,
      color: "#334155",
      quals: Object.fromEntries(aircraft.map((item) => [item.id, null])),
      active: true,
      ...(email ? { email } : {}),
    };
    upsertPilot(pilot);
    setName("");
    setNewEmail("");
    if (email) void assignEmail(pilot, email, true);
  }

  async function onRemovePilot(pilot: Pilot) {
    if (!confirm(`Remove ${pilot.name} from the roster?`)) return;
    if (pilot.email) {
      try {
        await revokeAccess(normalizeEmail(pilot.email));
      } catch {
        // Roster remove should still happen if revoke fails.
      }
    }
    removePilot(pilot.id);
    void refreshAccess();
  }

  if (!isAdmin) {
    return (
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-black text-navy-900">People</h2>
        <p className="mt-2 text-sm text-muted">
          Only the operator can assign emails and change qualifications. Open Line or Crew to see
          your week.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-black text-navy-900">Pilot accounts</h2>
        <p className="mt-1 text-sm text-muted">
          Put a pilot’s email on their row and send the setup email. They get a FairCrew message
          to choose a password — same idea as a reset — then they can sign in and see their week.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-lg font-black text-navy-900">How seats work</h2>
        <div className="mt-3 grid gap-3 text-sm leading-relaxed text-ink md:grid-cols-3">
          <Rule
            title="PIC · left seat"
            body="Type-rated captain. Can fly left or right. Every flying aircraft needs one."
          />
          <Rule
            title="SIC · right seat only"
            body="Can occupy right seat on that type. Cannot be assigned left seat, even if the line is short."
          />
          <Rule
            title="Duty officer"
            body="One required on every flying day. Any pilot can stand it, and they should not also be on a crew."
          />
        </div>
        <p className="mt-4 text-[12px] text-muted">
          Three tails: Bou (N368SS), Otter (N502FS), Casa (N434CA). Bou only has two PICs.
        </p>
      </section>

      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-800">{error}</p> : null}

      <section className="space-y-3 md:hidden">
        {pilots.map((pilot) => (
          <PilotCard
            key={pilot.id}
            pilot={pilot}
            aircraft={aircraft}
            access={pilot.email ? accessByEmail.get(normalizeEmail(pilot.email)) : undefined}
            busy={busyEmail === pilot.id}
            onQual={(aircraftId, role) => setQual(pilot.id, aircraftId, role)}
            onSend={(email) => void assignEmail(pilot, email, true)}
            onClear={() => void clearEmail(pilot)}
            onRemove={() => void onRemovePilot(pilot)}
          />
        ))}
      </section>

      <section className="hidden overflow-hidden rounded-lg border border-line bg-white md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-navy-800 text-white">
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Pilot</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">
                Email / access
              </th>
              {aircraft.map((item) => (
                <th key={item.id} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">
                  {item.name}
                  <div className="font-mono text-[10px] font-normal text-white/60">{item.tailNumber}</div>
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {pilots.map((pilot) => (
              <PilotRow
                key={pilot.id}
                pilot={pilot}
                aircraft={aircraft}
                access={pilot.email ? accessByEmail.get(normalizeEmail(pilot.email)) : undefined}
                busy={busyEmail === pilot.id}
                onQual={(aircraftId, role) => setQual(pilot.id, aircraftId, role)}
                onSend={(email) => void assignEmail(pilot, email, true)}
                onClear={() => void clearEmail(pilot)}
                onRemove={() => void onRemovePilot(pilot)}
              />
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-line bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-11 flex-1 rounded-md border border-line px-3 py-2 text-base"
            placeholder="Add a pilot"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addPilot();
            }}
          />
          <input
            type="email"
            className="min-h-11 flex-1 rounded-md border border-line px-3 py-2 text-base"
            placeholder="johnsmith@gmail.com"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addPilot();
            }}
          />
          <button
            type="button"
            onClick={addPilot}
            className="min-h-11 rounded-md bg-navy-800 px-3 py-2 text-sm font-bold text-white"
          >
            Add
          </button>
        </div>
      </section>

      {leftovers.length > 0 ? (
        <AccessLeftovers
          people={leftovers}
          busy={Boolean(busyEmail)}
          onSend={(email) => {
            setBusyEmail(email);
            sendAccess(email)
              .then(() => refreshAccess())
              .catch((caught) => {
                setError(caught instanceof Error ? caught.message : "Could not send access.");
              })
              .finally(() => setBusyEmail(null));
          }}
          onRevoke={(email) => {
            setBusyEmail(email);
            revokeAccess(email)
              .then(() => refreshAccess())
              .catch((caught) => {
                setError(caught instanceof Error ? caught.message : "Could not remove access.");
              })
              .finally(() => setBusyEmail(null));
          }}
        />
      ) : null}
    </div>
  );
}

function PilotCard({
  pilot,
  aircraft,
  access,
  busy,
  onQual,
  onSend,
  onClear,
  onRemove,
}: {
  pilot: Pilot;
  aircraft: { id: string; name: string; tailNumber: string }[];
  access?: AccessPerson;
  busy: boolean;
  onQual: (aircraftId: string, role: SeatRole | null) => void;
  onSend: (email: string) => void;
  onClear: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-lg border border-line bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: pilot.color }} />
          {pilot.name}
        </div>
        <button className="text-xs font-bold text-rose-800" onClick={onRemove}>
          Remove
        </button>
      </div>
      <PilotAccessFields
        pilot={pilot}
        access={access}
        busy={busy}
        onSend={onSend}
        onClear={onClear}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {aircraft.map((item) => {
          const role = pilot.quals[item.id] ?? null;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                const index = ROLE_CYCLE.indexOf(role);
                onQual(item.id, ROLE_CYCLE[(index + 1) % ROLE_CYCLE.length]);
              }}
              className={cn(
                "min-h-11 rounded-md px-2.5 py-2 text-left",
                role === "PIC" && "bg-navy-800 text-white",
                role === "SIC" && "bg-sky-100 text-sky-900",
                !role && "bg-off text-muted",
              )}
            >
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">{item.name}</div>
              <div className="text-sm font-black uppercase">{role ?? "—"}</div>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function PilotAccessFields({
  pilot,
  access,
  busy,
  onSend,
  onClear,
}: {
  pilot: Pilot;
  access?: AccessPerson;
  busy: boolean;
  onSend: (email: string) => void;
  onClear: () => void;
}) {
  const [email, setEmail] = useState(pilot.email ?? "");

  useEffect(() => {
    setEmail(pilot.email ?? "");
  }, [pilot.email]);

  const saved = Boolean(pilot.email);
  const status =
    access?.status === "active"
      ? "Signed in"
      : saved
        ? "Invite sent"
        : email.trim()
          ? "Not invited yet"
          : "No login";

  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="email"
        className="min-h-11 w-full rounded-md border border-line px-2.5 py-2 text-base"
        placeholder="johnsmith@gmail.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSend(email);
        }}
      />
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-muted">
          {status}
          {access?.lastInviteSentAt
            ? ` · ${new Date(access.lastInviteSentAt).toLocaleDateString()}`
            : ""}
        </span>
        <button
          type="button"
          disabled={busy || !email.trim()}
          className="min-h-8 font-bold text-[#c45c26] disabled:opacity-50"
          onClick={() => onSend(email)}
        >
          {busy ? "Sending…" : saved ? "Send again" : "Send setup email"}
        </button>
        {saved ? (
          <button
            type="button"
            disabled={busy}
            className="min-h-8 font-bold text-rose-800 disabled:opacity-50"
            onClick={onClear}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PilotRow({
  pilot,
  aircraft,
  access,
  busy,
  onQual,
  onSend,
  onClear,
  onRemove,
}: {
  pilot: Pilot;
  aircraft: { id: string; name: string; tailNumber: string }[];
  access?: AccessPerson;
  busy: boolean;
  onQual: (aircraftId: string, role: SeatRole | null) => void;
  onSend: (email: string) => void;
  onClear: () => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-t border-line align-top">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2 font-bold">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: pilot.color }} />
          {pilot.name}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="min-w-[220px]">
          <PilotAccessFields
            pilot={pilot}
            access={access}
            busy={busy}
            onSend={onSend}
            onClear={onClear}
          />
        </div>
      </td>
      {aircraft.map((item) => {
        const role = pilot.quals[item.id] ?? null;
        return (
          <td key={item.id} className="px-3 py-2">
            <button
              type="button"
              onClick={() => {
                const index = ROLE_CYCLE.indexOf(role);
                onQual(item.id, ROLE_CYCLE[(index + 1) % ROLE_CYCLE.length]);
              }}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-black uppercase",
                role === "PIC" && "bg-navy-800 text-white",
                role === "SIC" && "bg-sky-100 text-sky-900",
                !role && "bg-off text-muted",
              )}
            >
              {role ?? "—"}
            </button>
          </td>
        );
      })}
      <td className="px-3 py-2 text-right">
        <button className="text-xs font-bold text-rose-800" onClick={onRemove}>
          Remove
        </button>
      </td>
    </tr>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md bg-paper p-3">
      <div className="text-xs font-black uppercase tracking-wide text-navy-800">{title}</div>
      <p className="mt-1">{body}</p>
    </div>
  );
}
