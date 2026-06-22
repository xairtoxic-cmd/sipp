"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Chrome";
import { PrimaryButton } from "@/components/UI";

// Landing page for the password-reset / recovery link. Supabase parses the
// recovery token from the URL into a temporary session; here we set a new password.
export default function Reset() {
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase?.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    }) || { data: { subscription: { unsubscribe() {} } } };
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (pw.length < 6) return setMsg("Password must be at least 6 characters.");
    if (pw !== pw2) return setMsg("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    setDone(true);
    setMsg("Password updated. Taking you in…");
    setTimeout(() => { window.location.href = "/"; }, 1200);
  }

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col justify-center px-6 py-10">
      <div className="app-bg" />
      <div className="text-center">
        <Logo size="text-5xl" />
        <h1 className="mt-4 serif text-3xl text-espresso">Set a new password</h1>
      </div>

      <div className="mt-8 rounded-xl3 border border-line bg-card p-5 shadow-soft">
        {!ready ? (
          <p className="text-center text-sm text-brown/70">
            Open this page from the password-reset link in your email. If you got here by mistake,{" "}
            <a href="/" className="font-medium text-gold">go back</a>.
          </p>
        ) : (
          <form onSubmit={submit}>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="New password"
              autoFocus
              className="mb-3 w-full rounded-full border border-line bg-ivory px-4 py-3 text-sm focus:border-gold focus:outline-none"
            />
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-full border border-line bg-ivory px-4 py-3 text-sm focus:border-gold focus:outline-none"
            />
            <PrimaryButton type="submit" className="mt-4 w-full !py-3.5" disabled={busy || done}>
              {busy ? "Updating…" : "Update password"}
            </PrimaryButton>
          </form>
        )}
        {msg && <p className={`mt-3 text-center text-sm ${done ? "text-gold" : "text-red-700/80"}`}>{msg}</p>}
      </div>
    </main>
  );
}
