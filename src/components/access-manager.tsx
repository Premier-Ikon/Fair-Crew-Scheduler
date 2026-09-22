"use client";

import type { AccessPerson } from "@/lib/auth-context";

export function AccessLeftovers({
  people,
  busy,
  onSend,
  onRevoke,
}: {
  people: AccessPerson[];
  busy: boolean;
  onSend: (email: string) => void;
  onRevoke: (email: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-black text-navy-900">Unassigned logins</h2>
        <p className="mt-1 text-sm text-muted">
          These emails can open FairCrew but are not on a pilot row yet. Put the address on the
          matching person above, or remove the login.
        </p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-navy-800 text-white">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Email</th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Status</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.email} className="border-t border-line">
              <td className="px-3 py-2 font-semibold">{person.email}</td>
              <td className="px-3 py-2 text-muted">
                {person.status === "active" ? "Signed in" : "Invite sent"}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  disabled={busy}
                  className="mr-3 text-xs font-bold text-navy-800"
                  onClick={() => onSend(person.email)}
                >
                  Send again
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="text-xs font-bold text-rose-800"
                  onClick={() => onRevoke(person.email)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
