"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { personalityFor } from "@/lib/seed";
import { Logo } from "@/components/Chrome";
import { GhostButton, PrimaryButton } from "@/components/UI";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

function Bars({ data, max = 100 }) {
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-brown/80">{k}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-beige/60">
            <span className="block h-full rounded-full bg-gold" style={{ width: `${(Number(v) / max) * 100}%` }} />
          </span>
          <span className="w-10 text-right serif text-base text-espresso">{Number(v).toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AlgorithmAdmin() {
  const { user } = useAuth();
  const { tasteScores, dislikedTags, cafes, recommendScore, recommendReasons, rebuildTaste } = useStore();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState("");

  if (!user) return <Gate text="Sign in as an admin to view this page." />;
  if ((user.email || "").toLowerCase() !== ADMIN_EMAIL) return <Gate text="Admins only." />;

  const matches = q.trim() ? cafes.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  const sortedTaste = Object.fromEntries(Object.entries(tasteScores).sort((a, b) => b[1] - a[1]));

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="text-2xl" />
          <span className="rounded-full bg-espresso px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-cream">Algorithm</span>
        </div>
        <a href="/admin" className="text-sm text-gold">← Admin</a>
      </div>

      <h1 className="mt-6 serif text-4xl text-espresso">Recommendation <span className="gold-italic">engine</span></h1>

      {/* Your taste profile */}
      <div className="mt-5 rounded-xl2 border border-line bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="serif text-2xl text-espresso">Your taste profile</h2>
          <GhostButton
            className="!px-4 !py-2 text-xs"
            onClick={async () => {
              const n = await rebuildTaste();
              setMsg(`Rebuilt from ${n} events ✓`);
            }}
          >
            Rebuild from events
          </GhostButton>
        </div>
        {Object.keys(sortedTaste).length ? <Bars data={sortedTaste} /> : <p className="text-sm text-brown/65">No taste signals yet — save, rank and love places to train it.</p>}
        {dislikedTags.length > 0 && (
          <p className="mt-3 text-xs text-brown/60">Avoiding: {dislikedTags.join(", ")}</p>
        )}
        {msg && <p className="mt-2 text-xs text-gold">{msg}</p>}
      </div>

      {/* Place inspector */}
      <div className="mt-5 rounded-xl2 border border-line bg-card p-4 shadow-card">
        <h2 className="serif text-2xl text-espresso">Place inspector</h2>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(null); }}
          placeholder="Search a place…"
          className="mt-2 w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none"
        />
        {matches.length > 0 && !sel && (
          <div className="mt-2 space-y-1">
            {matches.map((c) => (
              <button key={c.id} onClick={() => setSel(c)} className="block w-full rounded-lg border border-line bg-ivory px-3 py-2 text-left text-sm">
                {c.name} <span className="text-brown/50">· {c.city} · {c.category === "fine_dining" ? "Fine Dining" : "Café"}</span>
              </button>
            ))}
          </div>
        )}
        {sel && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="serif text-xl text-espresso">{sel.name}</p>
              <button onClick={() => setSel(null)} className="text-xs text-gold">Change</button>
            </div>
            <p className="mt-1 text-sm text-brown/70">
              Recommendation score for you: <span className="font-semibold text-espresso">{(recommendScore(sel) * 100).toFixed(0)}/100</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {recommendReasons(sel).map((r) => (
                <span key={r} className="rounded-full bg-gold/12 px-2.5 py-1 text-[11px] font-medium text-gold">{r}</span>
              ))}
            </div>
            <p className="mt-4 text-xs uppercase tracking-wide text-brown/50">Personality profile</p>
            <div className="mt-2">
              <Bars data={personalityFor(sel)} max={10} />
            </div>
            <p className="mt-3 text-xs text-brown/60">
              Community {Number(sel.communityScore).toFixed(1)} · {sel.hasSippStar ? "★ Sipp Star" : sel.isSippRated ? "Sipp Rated" : "not Sipp rated"}
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-brown/50">Rule-based engine · taste match · friend signal · place quality · Sipp editorial · context.</p>
    </main>
  );
}

function Gate({ text }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
      <div>
        <Logo size="text-3xl" />
        <p className="mt-3 text-brown/70">{text}</p>
        <a href="/" className="mt-4 inline-block rounded-full bg-espresso px-5 py-3 text-sm text-cream">Open Sipp</a>
      </div>
    </main>
  );
}
