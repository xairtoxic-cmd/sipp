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

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signup"); // signup | signin
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    setError("");
    const res = mode === "signup" ? signUp({ name, username, email, password }) : signIn({ email, password });
    if (res?.error) setError(res.error);
  }

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col justify-center px-6 py-10">
      <div className="app-bg" />
      <div className="text-center">
        <Logo size="text-5xl" />
        <p className="mt-3 serif text-2xl text-espresso">
          Your Dubai <span className="gold-italic">café map.</span>
        </p>
        <p className="mt-1 text-sm text-brown/70">Discover. Save. Rank. Share.</p>
      </div>

      <form onSubmit={submit} className="mt-8 rounded-xl3 border border-line bg-card p-5 shadow-soft">
        <div className="mb-4 flex rounded-full border border-line bg-ivory p-1">
          {[
            ["signup", "Create account"],
            ["signin", "Sign in"],
          ].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                mode === m ? "bg-espresso text-cream shadow-card" : "text-brown"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "signup" && (
          <>
            <Field icon="user" placeholder="Your name" value={name} onChange={setName} />
            <Field icon="cup" placeholder="Username (e.g. saraeats)" value={username} onChange={setUsername} />
          </>
        )}
        <Field icon="people" placeholder="Email" type="email" value={email} onChange={setEmail} />
        <Field icon="lock" placeholder="Password" type="password" value={password} onChange={setPassword} />

        {error && <p className="mt-2 text-center text-sm text-red-700/80">{error}</p>}

        <PrimaryButton type="submit" className="mt-4 w-full !py-3.5 text-base">
          {mode === "signup" ? "Create account" : "Sign in"}
        </PrimaryButton>

        <p className="mt-3 text-center text-xs text-brown/60">
          {mode === "signup" ? "Already on Sipp? " : "New here? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError("");
            }}
            className="font-medium text-gold"
          >
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </p>
      </form>

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

export function Onboarding() {
  const { user, setPreference, updateProfile } = useAuth();
  const [picked, setPicked] = useState([]);
  const [taste, setTaste] = useState([]);
  const [step, setStep] = useState("pick"); // pick | taste | loading | ready
  const firstName = (user?.name || "there").split(" ")[0];

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleTaste = (t) => setTaste((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  useEffect(() => {
    if (step === "loading") {
      const t = setTimeout(() => setStep("ready"), 1900);
      return () => clearTimeout(t);
    }
    if (step === "ready") {
      const t = setTimeout(() => {
        updateProfile({ tasteTags: taste });
        setPreference(picked);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === "taste") {
    return (
      <main className="relative mx-auto min-h-[100dvh] w-full max-w-[460px] px-6 py-10">
        <div className="app-bg" />
        <div className="text-center">
          <Logo size="text-3xl" />
          <h1 className="mt-6 serif text-4xl leading-tight text-espresso">Tell us what you love.</h1>
          <p className="mt-1 text-sm text-brown/70">Personalize your café recommendations.</p>
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
