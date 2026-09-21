"use client";

import { useEffect, useState } from "react";
import { useAuth, type AccessPerson } from "@/lib/auth-context";

export function AccessManager() {
  const { listAccess, sendAccess, revokeAccess, isAdmin } = useAuth();
  const [people, setPeople] = useState<AccessPerson[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const next = await listAccess();
    setPeople(next);
  }

  useEffect(() => {
    refresh().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load access.");
    });
  }, []);

  async function onSend(target = email) {
    const trimmed = target.trim().toLowerCase();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendAccess(trimmed);
      setEmail("");
      setNotice(`Account information sent to ${trimmed}. They’ll set a password from that email.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send access.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(target: string) {
    if (!confirm(`Remove ${target} from FairCrew?`)) return;
    setBusy(true);
    setError(null);
    try {
      await revokeAccess(target);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-black text-navy-900">Who can open FairCrew</h2>
        <p className="mt-1 text-sm text-muted">
          Add a partner by email and send account information. They get a FairCrew message to set
          their password, then they can sign in and invite the next person the same way.
        </p>
      </div>
      <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row">
        <input
          type="email"
          className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
          placeholder="partner@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void onSend();
          }}
        />
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={() => void onSend()}
          className="rounded-md bg-[#c45c26] px-3 py-2 text-sm font-black text-white disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send account information"}
        </button>
      </div>
      {notice ? <p className="px-5 pt-3 text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p className="px-5 pt-3 text-sm text-rose-800">{error}</p> : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-navy-800 text-white">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Email</th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Status</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {people.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-muted" colSpan={3}>
                No partners yet. Send the first invite when you are ready.
              </td>
            </tr>
          ) : (
            people.map((person) => (
              <tr key={person.email} className="border-t border-line">
                <td className="px-3 py-2 font-semibold">{person.email}</td>
                <td className="px-3 py-2 text-muted">
                  {person.status === "active" ? "Signed in" : "Invite sent"}
                  {person.lastInviteSentAt
                    ? ` · ${new Date(person.lastInviteSentAt).toLocaleDateString()}`
                    : ""}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    className="mr-3 text-xs font-bold text-navy-800"
                    onClick={() => void onSend(person.email)}
                  >
                    Send again
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="text-xs font-bold text-rose-800"
                      onClick={() => void onRevoke(person.email)}
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
