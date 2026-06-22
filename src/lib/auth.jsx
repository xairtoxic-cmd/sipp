"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

const AuthContext = createContext(null);

// Turn an unhelpful Supabase error (empty body / "{}" / network 500) into a readable message.
function authError(error, fallback) {
  const m = (error?.message || "").trim();
  if (!m || m === "{}" || error?.name === "AuthRetryableFetchError") return fallback;
  return m;
}

function mapProfile(row, email) {
  if (!row) return null;
  return {
    id: row.id,
    email,
    name: row.name || "",
    username: row.username || "",
    bio: row.bio || "",
    avatarUrl: row.avatar_url || null,
    tasteTags: row.taste_tags || [],
    prefCafe: row.pref_cafes || [],
    city: row.city || null,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [onlineIds, setOnlineIds] = useState([]); // live presence: user ids online now

  const loadProfile = useCallback(async (sess) => {
    if (!sess?.user) {
      setProfile(null);
      return;
    }
    // Profile is created by a DB trigger; retry briefly in case of race.
    for (let i = 0; i < 4; i++) {
      const { data } = await supabase.from("profiles").select("*").eq("id", sess.user.id).maybeSingle();
      if (data) {
        setProfile(mapProfile(data, sess.user.email));
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setProfile(mapProfile({ id: sess.user.id }, sess.user.email));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setHydrated(true);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setHydrated(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, sess) => {
      setSession(sess);
      await loadProfile(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Live presence: every signed-in client joins a shared channel and broadcasts
  // that it's online. presenceState() then reflects exactly who's online now.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!isSupabaseConfigured || !uid) {
      setOnlineIds([]);
      return;
    }
    const ch = supabase.channel("online-users", { config: { presence: { key: uid } } });
    const sync = () => setOnlineIds(Object.keys(ch.presenceState()));
    ch.on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") ch.track({ user_id: uid, online_at: new Date().toISOString() });
      });
    return () => {
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [session?.user?.id]);

  // Continue with Google (OAuth). Redirects to Google, returns to the app
  // and the session is picked up automatically (detectSessionInUrl).
  async function signInWithGoogle() {
    if (!isSupabaseConfigured) return { error: "Backend not configured." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) return { error: error.message };
    return { ok: true }; // browser redirects to Google from here
  }

  // Email + password signup. Sends a confirmation CODE to the email (two-factor
  // feel). name/username go into metadata so the profile trigger fills them in.
  async function signUpWithPassword({ name, username, email, password }) {
    if (!isSupabaseConfigured) return { error: "Backend not configured." };
    const e = (email || "").trim();
    if (!name?.trim()) return { error: "Please enter your name." };
    const handle = (username || "").trim().replace(/^@+/, "").toLowerCase();
    if (!/^[a-z0-9._]{3,20}$/.test(handle)) return { error: "Username: 3–20 letters, numbers, . or _" };
    if (!/^\S+@\S+\.\S+$/.test(e)) return { error: "Enter a valid email." };
    if ((password || "").length < 6) return { error: "Password must be at least 6 characters." };
    const { data: taken } = await supabase.from("profiles").select("id").eq("username", "@" + handle).maybeSingle();
    if (taken) return { error: "That username is taken." };
    const { data, error } = await supabase.auth.signUp({
      email: e,
      password,
      options: { data: { name: name.trim(), username: "@" + handle } },
    });
    if (error) return { error: authError(error, "Couldn't create your account — the email service may be temporarily unavailable. Please try again shortly.") };
    // confirmed:true → email confirmation is off and we're already signed in.
    return { ok: true, confirmed: !!data.session };
  }

  // Verify the signup confirmation code → creates the session.
  async function verifySignupCode({ email, token }) {
    if (!isSupabaseConfigured) return { error: "Backend not configured." };
    const { error } = await supabase.auth.verifyOtp({ email: (email || "").trim(), token: (token || "").trim(), type: "signup" });
    if (error) return { error: authError(error, "That code didn't work — request a new one and try again.") };
    return { ok: true };
  }

  async function resendSignupCode(email) {
    if (!isSupabaseConfigured) return { error: "Backend not configured." };
    const { error } = await supabase.auth.resend({ type: "signup", email: (email || "").trim() });
    if (error) return { error: error.message };
    return { ok: true };
  }

  // Sign in with email + password (existing, confirmed accounts).
  async function signInWithPassword({ email, password }) {
    if (!isSupabaseConfigured) return { error: "Backend not configured." };
    const { error } = await supabase.auth.signInWithPassword({ email: (email || "").trim(), password });
    if (error) return { error: authError(error, "Couldn't sign in — check your email and password, or try again.") };
    return { ok: true };
  }

  // Forgot password — emails a reset link that lands on /reset to set a new one.
  async function sendPasswordReset(email) {
    if (!isSupabaseConfigured) return { error: "Backend not configured." };
    const e = (email || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) return { error: "Enter your email first." };
    const { error } = await supabase.auth.resetPasswordForEmail(e, {
      redirectTo: typeof window !== "undefined" ? window.location.origin + "/reset" : undefined,
    });
    if (error) return { error: error.message };
    return { ok: true };
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  async function updateProfile(patch) {
    if (!session?.user) return;
    const row = {};
    if ("name" in patch) row.name = patch.name;
    if ("bio" in patch) row.bio = patch.bio;
    if ("avatarUrl" in patch) row.avatar_url = patch.avatarUrl;
    if ("tasteTags" in patch) row.taste_tags = patch.tasteTags;
    if ("prefCafe" in patch) row.pref_cafes = patch.prefCafe;
    if ("city" in patch) row.city = patch.city;
    const { data } = await supabase.from("profiles").update(row).eq("id", session.user.id).select("*").maybeSingle();
    if (data) setProfile(mapProfile(data, session.user.email));
  }

  const setPreference = (prefCafe) => updateProfile({ prefCafe });

  const value = {
    hydrated,
    configured: isSupabaseConfigured,
    user: profile,
    isAuthed: !!session,
    needsOnboarding: !!session && (!profile?.prefCafe || profile.prefCafe.length === 0),
    onlineIds,
    signInWithGoogle,
    signUpWithPassword,
    verifySignupCode,
    resendSignupCode,
    signInWithPassword,
    sendPasswordReset,
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
