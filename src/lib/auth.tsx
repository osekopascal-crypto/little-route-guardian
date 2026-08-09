import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "attendant" | "parent";

export type Profile = {
  id: string;
  school_id: string;
  full_name: string;
  phone: string | null;
  role: AppRole;
  avatar_url: string | null;
  status: "active" | "inactive";
};

export type School = {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive";
};

export type AccountState =
  | "loading"
  | "unauthenticated"
  | "ready"
  | "incomplete" // signed in but no usable profile
  | "error";

type AuthContextValue = {
  state: AccountState;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  school: School | null;
  errorMessage: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  reload: () => void;
};

const ROLES: AppRole[] = ["admin", "attendant", "parent"];

export const roleHome: Record<AppRole, "/admin" | "/attendant" | "/parent"> = {
  admin: "/admin",
  attendant: "/attendant",
  parent: "/parent",
};

export const roleLabel: Record<AppRole, string> = {
  admin: "School Admin",
  attendant: "Bus Attendant",
  parent: "Parent",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [state, setState] = useState<AccountState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setSchool(null);
        setState("unauthenticated");
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setState("unauthenticated");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setState("loading");
    setErrorMessage(null);

    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, school_id, full_name, phone, role, avatar_url, status")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        // Developer detail stays in the console; users see friendly copy.
        console.error("[auth] profile load failed", error);
        setErrorMessage("We couldn't load your account. Please try again.");
        setState("error");
        return;
      }

      const p = data as Profile | null;
      if (!p || !ROLES.includes(p.role) || p.status !== "active") {
        setProfile(p ?? null);
        setSchool(null);
        setState("incomplete");
        return;
      }

      const { data: schoolRow } = await supabase
        .from("schools")
        .select("id, name, code, status")
        .eq("id", p.school_id)
        .maybeSingle();

      if (cancelled) return;
      setProfile(p);
      setSchool((schoolRow as School | null) ?? null);
      setState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [session, nonce]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { error: null };
    console.error("[auth] sign in failed", error);
    if (error.message.toLowerCase().includes("invalid")) {
      return { error: "That email or password doesn't match our records." };
    }
    if (error.status === 0 || error.message.toLowerCase().includes("fetch")) {
      return { error: "We couldn't reach the server. Check your connection and try again." };
    }
    return { error: "We couldn't sign you in right now. Please try again." };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSchool(null);
    setSession(null);
    setState("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: session?.user ?? null,
      session,
      profile,
      school,
      errorMessage,
      signIn,
      signOut,
      reload: () => setNonce((n) => n + 1),
    }),
    [state, session, profile, school, errorMessage, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName: string | undefined | null) {
  if (!fullName) return "there";
  return fullName.trim().split(/\s+/)[0] ?? "there";
}
