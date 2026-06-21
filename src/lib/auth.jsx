"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const ACCOUNTS_KEY = "sipp_accounts_v1";
const SESSION_KEY = "sipp_session_v1";

// NOTE: this is a local/demo auth (accounts stored in the browser). When Supabase
// is wired up, swap these functions for supabase.auth calls — the UI stays the same.

function loadAccounts() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [session, setSession] = useState(null); // email
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAccounts(loadAccounts());
    setSession(window.localStorage.getItem(SESSION_KEY) || null);
    setHydrated(true);
  }, []);

  function persist(next) {
    setAccounts(next);
    try {
      window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
    } catch {}
  }
  function setSess(email) {
    setSession(email);
    try {
      if (email) window.localStorage.setItem(SESSION_KEY, email);
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  const user = useMemo(
    () => accounts.find((a) => a.email === session) || null,
    [accounts, session]
  );

  function signUp({ name, username, email, password }) {
    email = email.trim().toLowerCase();
    const handle = (username || "").trim().replace(/^@+/, "").toLowerCase();
    if (!name.trim()) return { error: "Please enter your name." };
    if (!/^[a-z0-9._]{3,20}$/.test(handle))
      return { error: "Username: 3–20 letters, numbers, . or _" };
    if (accounts.some((a) => (a.username || "").toLowerCase() === "@" + handle))
      return { error: "That username is taken." };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
    if (password.length < 4) return { error: "Password must be at least 4 characters." };
    if (accounts.some((a) => a.email === email)) return { error: "An account with that email already exists." };
    const acct = { name: name.trim(), username: "@" + handle, email, password, prefCafe: null, createdAt: Date.now() };
    persist([...accounts, acct]);
    setSess(email);
    return { ok: true };
  }

  function signIn({ email, password }) {
    email = email.trim().toLowerCase();
    const acct = accounts.find((a) => a.email === email);
    if (!acct) return { error: "No account found for that email." };
    if (acct.password !== password) return { error: "Incorrect password." };
    setSess(email);
    return { ok: true };
  }

  function signOut() {
    setSess(null);
  }

  function setPreference(prefCafe) {
    if (!user) return;
    persist(accounts.map((a) => (a.email === user.email ? { ...a, prefCafe } : a)));
  }

  function updateProfile(patch) {
    if (!user) return;
    persist(accounts.map((a) => (a.email === user.email ? { ...a, ...patch } : a)));
  }

  const prefDone = (p) => (Array.isArray(p) ? p.length > 0 : !!p);

  const value = {
    hydrated,
    user,
    isAuthed: !!user,
    needsOnboarding: !!user && !prefDone(user.prefCafe),
    signUp,
    signIn,
    signOut,
    setPreference,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
