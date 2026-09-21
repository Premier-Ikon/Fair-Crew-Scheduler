"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AuthField, AuthFrame, authInputClass, authPrimaryClass } from "./auth-frame";

export function LoginScreen() {
  const { signIn, sendReset } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "reset") {
        await sendReset(email);
        setNotice("Check your inbox for a FairCrew link to set a new password.");
        setMode("signin");
      } else {
        await signIn(email, password);
      }
    } catch (caught) {
      setError(humanAuthError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title={mode === "reset" ? "Reset your password" : "Sign in"}
      subtitle={
        mode === "reset"
          ? "We’ll email a FairCrew link so you can choose a new password and come back here."
          : "Invite-only. Use the password you set from the account email."
      }
      footer={
        <button
          type="button"
          className="font-semibold text-navy-800 hover:text-navy-950"
          onClick={() => {
            setMode(mode === "reset" ? "signin" : "reset");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "reset" ? "Back to sign in" : "Forgot password"}
        </button>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField label="Email">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClass}
            placeholder="name@email.com"
          />
        </AuthField>
        {mode === "signin" ? (
          <AuthField label="Password">
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={authInputClass}
            />
          </AuthField>
        ) : null}
        {error ? <p className="text-sm font-semibold text-rose-800">{error}</p> : null}
        {notice ? <p className="text-sm font-semibold text-emerald-800">{notice}</p> : null}
        <button type="submit" disabled={busy} className={authPrimaryClass}>
          {busy ? "Working…" : mode === "reset" ? "Send reset link" : "Sign in to the line"}
        </button>
      </form>
    </AuthFrame>
  );
}

function humanAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Email or password is not right.";
  }
  if (code.includes("too-many-requests")) return "Too many tries. Wait a minute and try again.";
  if (code.includes("invalid-email")) return "That email does not look valid.";
  return error instanceof Error ? error.message : "Could not sign in.";
}
