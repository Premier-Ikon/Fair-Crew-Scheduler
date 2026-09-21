"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthField, AuthFrame, authInputClass, authPrimaryClass } from "./auth-frame";

export function AuthActionScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { verifyResetCode, completeReset, signIn } = useAuth();
  const mode = params.get("mode");
  const code = params.get("oobCode") ?? "";
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || (mode && mode !== "resetPassword")) return;
    verifyResetCode(code)
      .then(setEmail)
      .catch(() =>
        setError("This link is expired or already used. Ask an operator to send account information again."),
      );
  }, [code, mode, verifyResetCode]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await completeReset(code, password);
      if (email) await signIn(email, password);
      router.replace("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Set your password"
      subtitle={
        email
          ? `Choose a password for ${email}. You’ll land on the line board after this.`
          : "Checking your invite link…"
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField label="New password">
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClass}
          />
        </AuthField>
        <AuthField label="Confirm password">
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={authInputClass}
          />
        </AuthField>
        {error ? <p className="text-sm font-semibold text-rose-800">{error}</p> : null}
        <button type="submit" disabled={busy || !email} className={authPrimaryClass}>
          {busy ? "Saving…" : "Save password and open FairCrew"}
        </button>
      </form>
    </AuthFrame>
  );
}
