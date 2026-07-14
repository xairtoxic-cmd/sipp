"use client";

// Password reset landing page. The recovery email links here; Supabase puts a
// short-lived session in the URL (detectSessionInUrl handles it), the user sets
// a new password, and we sign the browser out so no session lingers.

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState("checking"); // checking | ready | done | invalid
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) { setPhase("invalid"); return; }
    let settled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) { settled = true; setPhase("ready"); }
    });
    (async () => {
      // PKCE-style links carry ?code=; implicit links carry #access_token (handled
      // automatically by detectSessionInUrl before this runs).
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) { try { await supabase.auth.exchangeCodeForSession(code); } catch {} }
      // Give detectSessionInUrl a moment, then check once.
      setTimeout(async () => {
        if (settled) return;
        const { data } = await supabase.auth.getSession();
        settled = true;
        setPhase(data?.session ? "ready" : "invalid");
      }, 1200);
    })();
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message || "Couldn't update your password — try again."); return; }
    await supabase.auth.signOut().catch(() => {});
    setPhase("done");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F7F0E6", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#FFFDF8", border: "1px solid #E6D8C5", borderRadius: 24, padding: "36px 28px", textAlign: "center", fontFamily: "Inter, system-ui, sans-serif", color: "#2B2118" }}>
        <div style={{ fontFamily: "Cormorant, Georgia, serif", fontSize: 40, fontWeight: 700, marginBottom: 6 }}>sipp</div>

        {phase === "checking" && <p style={{ color: "#7A6A5F" }}>Checking your link…</p>}

        {phase === "invalid" && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "12px 0 8px" }}>This link has expired</h1>
            <p style={{ color: "#7A6A5F", fontSize: 15, lineHeight: 1.5 }}>
              Reset links only work once and expire after a short while. Open the Sipp app and tap
              &ldquo;Forgot password?&rdquo; to get a fresh one.
            </p>
          </>
        )}

        {phase === "ready" && (
          <form onSubmit={submit}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "12px 0 16px" }}>Choose a new password</h1>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="New password" autoFocus
              style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: "1px solid #E6D8C5", background: "#F7F0E6", fontSize: 15, marginBottom: 10, outline: "none", boxSizing: "border-box" }}
            />
            <input
              type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: "1px solid #E6D8C5", background: "#F7F0E6", fontSize: 15, marginBottom: 14, outline: "none", boxSizing: "border-box" }}
            />
            {error ? <p style={{ color: "#B86A5C", fontSize: 14, marginBottom: 12 }}>{error}</p> : null}
            <button
              type="submit" disabled={busy}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 999, border: "none", background: "#D8AF68", color: "#F7F0E6", fontSize: 16, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.6 : 1 }}
            >
              {busy ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}

        {phase === "done" && (
          <>
            <div style={{ fontSize: 40, margin: "8px 0" }}>✓</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Password updated</h1>
            <p style={{ color: "#7A6A5F", fontSize: 15, lineHeight: 1.5 }}>
              Open the Sipp app and log in with your new password.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
