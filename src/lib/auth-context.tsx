"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  confirmPasswordReset,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  verifyPasswordResetCode,
  type User,
} from "firebase/auth";
import { accessRequest } from "./backend";
import { getAuthClient } from "./firebase";

export type AccessPerson = {
  email: string;
  role: "admin" | "member";
  status: "invited" | "active";
  lastInviteSentAt: string | null;
};

type AuthContextValue = {
  ready: boolean;
  user: User | null;
  email: string | null;
  isAdmin: boolean;
  onboardingDone: boolean | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  verifyResetCode: (code: string) => Promise<string>;
  completeReset: (code: string, password: string) => Promise<void>;
  listAccess: () => Promise<AccessPerson[]>;
  sendAccess: (email: string) => Promise<void>;
  revokeAccess: (email: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = getAuthClient();
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (next) {
        const token = await next.getIdTokenResult(true);
        setIsAdmin(token.claims.admin === true);
        try {
          const profile = await accessRequest<{ onboardingDone?: boolean }>(
            "manageAccess?action=me",
            await next.getIdToken(),
          );
          setOnboardingDone(Boolean(profile.onboardingDone));
        } catch {
          setOnboardingDone(false);
        }
      } else {
        setIsAdmin(false);
        setOnboardingDone(null);
      }
      setReady(true);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getAuthClient();
    if (!auth) throw new Error("Firebase Auth is not configured.");
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const token = await cred.user.getIdTokenResult(true);
    if (token.claims.access !== true) {
      await firebaseSignOut(auth);
      throw new Error("This email does not have FairCrew access yet.");
    }
    setIsAdmin(token.claims.admin === true);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getAuthClient();
    if (auth) await firebaseSignOut(auth);
  }, []);

  const sendReset = useCallback(async (email: string) => {
    await accessRequest<{ ok: boolean }>("manageAccess", null, {
      method: "POST",
      body: JSON.stringify({ action: "reset", email: email.trim().toLowerCase() }),
    });
  }, []);

  const verifyResetCode = useCallback(async (code: string) => {
    const auth = getAuthClient();
    if (!auth) throw new Error("Firebase Auth is not configured.");
    return verifyPasswordResetCode(auth, code);
  }, []);

  const completeReset = useCallback(async (code: string, password: string) => {
    const auth = getAuthClient();
    if (!auth) throw new Error("Firebase Auth is not configured.");
    await confirmPasswordReset(auth, code, password);
  }, []);

  const authJson = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const auth = getAuthClient();
    const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
    return accessRequest<T>(path, token, init);
  }, []);

  const listAccess = useCallback(
    () => authJson<AccessPerson[]>("manageAccess?action=list"),
    [authJson],
  );

  const sendAccess = useCallback(
    async (email: string) => {
      await authJson<{ ok: boolean }>("manageAccess", {
        method: "POST",
        body: JSON.stringify({ action: "invite", email }),
      });
    },
    [authJson],
  );

  const revokeAccess = useCallback(
    (email: string) =>
      authJson<{ ok: boolean }>("manageAccess", {
        method: "POST",
        body: JSON.stringify({ action: "revoke", email }),
      }).then(() => undefined),
    [authJson],
  );

  const completeOnboarding = useCallback(async () => {
    await authJson<{ ok: boolean }>("manageAccess", {
      method: "POST",
      body: JSON.stringify({ action: "onboarding" }),
    });
    setOnboardingDone(true);
  }, [authJson]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      email: user?.email ?? null,
      isAdmin,
      onboardingDone,
      signIn,
      signOut,
      sendReset,
      verifyResetCode,
      completeReset,
      listAccess,
      sendAccess,
      revokeAccess,
      completeOnboarding,
    }),
    [
      ready,
      user,
      isAdmin,
      onboardingDone,
      signIn,
      signOut,
      sendReset,
      verifyResetCode,
      completeReset,
      listAccess,
      sendAccess,
      revokeAccess,
      completeOnboarding,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
