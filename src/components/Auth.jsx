"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { TASTE_CHIPS } from "@/lib/seed";
import { Icon } from "./Icons";
import { Logo } from "./Chrome";
import { CafeImage, PrimaryButton } from "./UI";

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=700&q=70`;

// First-run preference picker.
const ONBOARD_CAFES = [
  { id: "tobys", name: "Toby's Estate", img: img("1442512595331-e89e73853f31") },
  { id: "koncrete", name: "Koncrete", img: img("1497935586351-b67a49e012bf") },
  { id: "espresso-lab", name: "The Espresso Lab", img: img("1559925393-8be0ec4767c8") },
  { id: "orto", name: "Orto", img: img("1498804103079-a6351b050096") },
  { id: "friends-avenue", name: "Friends Avenue", img: img("1481833761820-0509d3217039") },
  { id: "brix", name: "Brix", img: img("1509042239860-f550ce710b93") },
];

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 36.1 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function AuthScreen() {
  const { signInWithGoogle, signUpWithPassword, verifySignupCode, resendSignupCode, signInWithPassword, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState("signup"); // signup | signin
  const [step, setStep] = useState("form"); // form | code
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function forgot() {
    setError("");
    setNote("");
    const res = await sendPasswordReset(email);
    if (res?.error) setError(res.error);
    else setNote("Password reset link sent — check your email.");
  }

  async function google() {
    setError("");
    setBusy(true);
    const res = await signInWithGoogle();
    if (res?.error) {
      setBusy(false);
      setError(res.error);
    }
    // on success the browser redirects to Google
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    if (mode === "signup") {
      const res = await signUpWithPassword({ name, username, email, password });
      setBusy(false);
      if (res?.error) return setError(res.error);
      if (!res.confirmed) setStep("code"); // need the email code; else session is live
    } else {
      const res = await signInWithPassword({ email, password });
      setBusy(false);
      if (res?.error) setError(res.error);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await verifySignupCode({ email, token: code });
    setBusy(false);
    if (res?.error) setError(res.error);
    // on success, AuthProvider picks up the session and the app advances
  }

  async function resend() {
    setError("");
    const res = await resendSignupCode(email);
    if (res?.error) setError(res.error);
  }

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col justify-center px-6 py-10">
      <div className="app-bg" />
      <div className="text-center">
        <Logo size="text-5xl" />
        <p className="mt-3 serif text-2xl text-espresso">
          Cafés by day. <span className="gold-italic">Fine dining by night.</span>
        </p>
        <p className="mt-1 text-sm text-brown/70">Discover, save, rank & share through people with taste.</p>
      </div>

      {step === "code" ? (
        <form onSubmit={verify} className="mt-8 rounded-xl3 border border-line bg-card p-5 shadow-soft">
          <h3 className="serif text-2xl text-espresso">Enter your code</h3>
          <p className="mt-1 text-sm text-brown/70">
            We sent a 6-digit code to <span className="font-medium text-espresso">{email}</span>.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            autoFocus
            className="mt-4 w-full rounded-2xl border border-line bg-ivory px-4 py-3.5 text-center text-2xl tracking-[0.5em] text-espresso placeholder:tracking-[0.3em] placeholder:text-brown/30 focus:border-gold focus:outline-none"
          />
          {error && <p className="mt-2 text-center text-sm text-red-700/80">{error}</p>}
          <PrimaryButton type="submit" className="mt-4 w-full !py-3.5 text-base" disabled={code.length < 6}>
            {busy ? "Verifying…" : "Verify & continue"}
          </PrimaryButton>
          <div className="mt-3 flex items-center justify-between text-xs">
            <button type="button" onClick={() => { setStep("form"); setCode(""); setError(""); }} className="font-medium text-brown/60">
              Use a different email
            </button>
            <button type="button" onClick={resend} className="font-medium text-gold">
              Resend code
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-8 rounded-xl3 border border-line bg-card p-5 shadow-soft">
          <button
            type="button"
            onClick={google}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-line bg-ivory py-3 text-sm font-medium text-espresso shadow-card transition active:scale-[0.99]"
          >
            <GoogleMark /> Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-brown/40">
            <span className="h-px flex-1 bg-line" /> or email <span className="h-px flex-1 bg-line" />
          </div>

          <div className="mb-4 flex rounded-full border border-line bg-ivory p-1">
            {[
              ["signup", "Create account"],
              ["signin", "Sign in"],
            ].map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                  mode === m ? "bg-espresso text-cream shadow-card" : "text-brown"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {mode === "signup" && (
              <>
                <Field icon="user" placeholder="Your name" value={name} onChange={setName} />
                <Field icon="cup" placeholder="Username (e.g. saraeats)" value={username} onChange={setUsername} />
              </>
            )}
            <Field icon="people" placeholder="Email" type="email" value={email} onChange={setEmail} />
            <Field icon="lock" placeholder="Password" type="password" value={password} onChange={setPassword} />

            {mode === "signin" && (
              <div className="mb-1 text-right">
                <button type="button" onClick={forgot} className="text-xs font-medium text-gold">
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="mt-2 text-center text-sm text-red-700/80">{error}</p>}
            {note && <p className="mt-2 text-center text-sm text-gold">{note}</p>}

            <PrimaryButton type="submit" className="mt-4 w-full !py-3.5 text-base">
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </PrimaryButton>
          </form>

          <p className="mt-3 text-center text-xs text-brown/60">
            {mode === "signup" ? "Already on Sipp? " : "New here? "}
            <button
              type="button"
              onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
              className="font-medium text-gold"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-brown/50">Made for café lovers. Built for Dubai.</p>
    </main>
  );
}

function Field({ icon, placeholder, value, onChange, type = "text" }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-full border border-line bg-ivory px-4 py-3">
      <Icon name={icon} size={18} className="text-brown/60" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-espresso placeholder:text-brown/50 focus:outline-none"
      />
    </div>
  );
}

const UAE_CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Al Ain"];
const OTHER_CITIES = ["London", "Toronto", "New York", "Riyadh", "Doha", "Paris"];

export function Onboarding() {
  const { user, updateProfile } = useAuth();
  const [picked, setPicked] = useState([]);
  const [taste, setTaste] = useState([]);
  const [city, setCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [step, setStep] = useState("location"); // location | pick | taste | loading | ready
  const firstName = (user?.name || "there").split(" ")[0];

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleTaste = (t) => setTaste((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(`/api/geo/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const d = await r.json();
          if (d.city) setCity(d.city);
        } catch {}
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  useEffect(() => {
    if (step === "loading") {
      const t = setTimeout(() => setStep("ready"), 1900);
      return () => clearTimeout(t);
    }
    if (step === "ready") {
      const t = setTimeout(() => {
        updateProfile({ tasteTags: taste, prefCafe: picked, city: city || "Dubai" });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === "location") {
    return (
      <main className="relative mx-auto min-h-[100dvh] w-full max-w-[460px] px-6 py-10">
        <div className="app-bg" />
        <div className="text-center">
          <Logo size="text-3xl" />
          <h1 className="mt-6 serif text-4xl leading-tight text-espresso">Where are you?</h1>
          <p className="mt-1 text-sm text-brown/70">We'll show you cafés and dining near you.</p>
        </div>
        <button
          onClick={useMyLocation}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-card py-3 text-sm font-medium text-espresso shadow-card"
        >
          <Icon name="near" size={18} /> {locating ? "Locating…" : "Use my location"}
        </button>
        <p className="mt-5 px-1 text-xs uppercase tracking-wide text-brown/50">UAE</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {UAE_CITIES.map((c) => (
            <button key={c} onClick={() => setCity(c)} className={`rounded-full px-4 py-2 text-sm transition ${city === c ? "bg-espresso text-cream shadow-card" : "border border-line bg-card text-brown"}`}>{c}</button>
          ))}
        </div>
        <p className="mt-4 px-1 text-xs uppercase tracking-wide text-brown/50">Elsewhere</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {OTHER_CITIES.map((c) => (
            <button key={c} onClick={() => setCity(c)} className={`rounded-full px-4 py-2 text-sm transition ${city === c ? "bg-espresso text-cream shadow-card" : "border border-line bg-card text-brown"}`}>{c}</button>
          ))}
        </div>
        {city && !UAE_CITIES.includes(city) && !OTHER_CITIES.includes(city) && (
          <p className="mt-3 text-center text-xs text-gold">Detected: {city}</p>
        )}
        <div className="mt-8">
          <PrimaryButton
            className={`w-full !py-4 text-base ${city ? "" : "pointer-events-none opacity-40"}`}
            onClick={() => city && setStep("pick")}
          >
            {city ? `Continue — ${city}` : "Choose your city"}
          </PrimaryButton>
        </div>
      </main>
    );
  }

  if (step === "taste") {
    return (
      <main className="relative mx-auto min-h-[100dvh] w-full max-w-[460px] px-6 py-10">
        <div className="app-bg" />
        <div className="text-center">
          <Logo size="text-3xl" />
          <h1 className="mt-6 serif text-4xl leading-tight text-espresso">Tell us what you love.</h1>
          <p className="mt-1 text-sm text-brown/70">Personalize your cafés and dining recommendations.</p>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {TASTE_CHIPS.map((t) => {
            const on = taste.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTaste(t)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  on ? "bg-espresso text-cream shadow-card" : "border border-line bg-card text-brown"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="mt-8">
          <PrimaryButton
            className={`w-full !py-4 text-base ${taste.length ? "" : "pointer-events-none opacity-40"}`}
            onClick={() => taste.length && setStep("loading")}
          >
            {taste.length ? `Continue${taste.length > 1 ? ` (${taste.length})` : ""}` : "Pick a few"}
          </PrimaryButton>
        </div>
      </main>
    );
  }

  if (step !== "pick") {
    return (
      <main className="relative mx-auto grid min-h-[100dvh] w-full max-w-[460px] place-items-center px-6">
        <div className="app-bg" />
        <div className="flex flex-col items-center text-center">
          {step === "loading" ? (
            <>
              <span className="relative grid h-16 w-16 place-items-center">
                <span className="absolute inset-0 animate-spin rounded-full border-2 border-line border-t-gold" />
                <Icon name="cup" size={26} className="text-gold" />
              </span>
              <p className="mt-5 serif text-3xl text-espresso">Personalizing your feed…</p>
              <p className="mt-1 text-sm text-brown/70">Finding cafés you'll love.</p>
            </>
          ) : (
            <div className="animate-pop">
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold text-cream shadow-float">
                <Icon name="check" size={36} />
              </span>
              <p className="mt-5 serif text-4xl text-espresso">
                You're ready to <span className="gold-italic">sipp.</span>
              </p>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto min-h-[100dvh] w-full max-w-[460px] px-6 py-10">
      <div className="app-bg" />
      <div className="text-center">
        <Logo size="text-3xl" />
        <h1 className="mt-6 serif text-4xl leading-tight text-espresso">Welcome, {firstName}.</h1>
        <p className="mt-2 serif text-2xl text-espresso">
          Which coffee shops do you <span className="gold-italic">prefer?</span>
        </p>
        <p className="mt-1 text-sm text-brown/70">Pick as many as you like — we'll tune your café map.</p>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3">
        {ONBOARD_CAFES.map((c) => {
          const on = picked.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`group relative overflow-hidden rounded-xl2 border bg-card text-left shadow-card transition active:scale-[0.98] ${
                on ? "border-gold ring-2 ring-gold" : "border-line"
              }`}
            >
              <CafeImage src={c.img} alt={c.name} seed={c.id} query={`${c.name}, Dubai`} rounded="rounded-none" className="h-28 w-full" />
              {on && (
                <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-gold text-cream shadow-card">
                  <Icon name="check" size={16} />
                </span>
              )}
              <div className="flex items-center justify-center px-2 py-3">
                <span className="serif text-lg leading-tight text-espresso">{c.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <PrimaryButton
          className={`w-full !py-4 text-base ${picked.length ? "" : "pointer-events-none opacity-40"}`}
          onClick={() => picked.length && setStep("taste")}
        >
          {picked.length ? `Continue${picked.length > 1 ? ` (${picked.length})` : ""}` : "Select at least one"}
        </PrimaryButton>
      </div>
    </main>
  );
}
