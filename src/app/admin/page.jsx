"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import { Logo } from "@/components/Chrome";
import { PrimaryButton, GhostButton } from "@/components/UI";

const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Al Ain"];
const DUBAI_AREAS = [
  "Al Quoz", "Alserkal Avenue", "Jumeirah", "Al Wasl", "Downtown Dubai", "DIFC", "Business Bay",
  "City Walk", "Dubai Marina", "JBR", "Bluewaters", "Palm Jumeirah", "Umm Suqeim", "Dubai Mall",
  "Dubai Creek Harbour", "Mirdif", "Deira",
];
const TYPES = ["cafe", "coffee_shop", "coffee_roastery", "bakery", "brunch_restaurant", "dessert_shop", "tea cafe", "matcha cafe"];

export default function Admin() {
  const [emirate, setEmirate] = useState("Dubai");
  const [area, setArea] = useState("Al Quoz");
  const [type, setType] = useState("cafe");
  const [radius, setRadius] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [logs, setLogs] = useState([]);
  const [simulated, setSimulated] = useState(false);

  async function runImport() {
    setLoading(true);
    try {
      const res = await fetch("/api/places/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emirate, area, type, radius }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setSimulated(!!data.simulated);
      setDecisions({});
      setLogs((l) => [
        {
          id: Date.now(),
          source: data.simulated ? "Simulated" : "Google Places",
          area: `${area}, ${emirate}`,
          query: data.query,
          found: (data.results || []).length,
          time: "just now",
        },
        ...l,
      ]);
    } catch (e) {
      alert("Import failed: " + e);
    }
    setLoading(false);
  }

  function decide(id, val) {
    setDecisions((d) => ({ ...d, [id]: val }));
  }

  const approved = Object.values(decisions).filter((v) => v === "approved").length;
  const rejected = Object.values(decisions).filter((v) => v === "rejected").length;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="text-2xl" />
          <span className="rounded-full bg-espresso px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-cream">
            Admin
          </span>
        </div>
        <a href="/" className="text-sm text-gold">
          ← Back to app
        </a>
      </div>

      <h1 className="mt-6 serif text-4xl text-espresso">
        Import <span className="gold-italic">cafés</span>
      </h1>
      <p className="mt-1 text-sm text-brown/70">
        Pull café-style places from Google Places, review, and approve into the Sipp map.
      </p>

      {/* Import controls */}
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl2 border border-line bg-card p-4 shadow-card sm:grid-cols-4">
        <Field label="Emirate">
          <Select value={emirate} onChange={setEmirate} options={EMIRATES} />
        </Field>
        <Field label="Area">
          <Select value={area} onChange={setArea} options={emirate === "Dubai" ? DUBAI_AREAS : [area]} editable />
        </Field>
        <Field label="Place type">
          <Select value={type} onChange={setType} options={TYPES} />
        </Field>
        <Field label="Radius (m)">
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            className="w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none"
          />
        </Field>
        <div className="col-span-2 sm:col-span-4">
          <PrimaryButton className="w-full !py-3" onClick={runImport}>
            {loading ? "Importing…" : "Run import"}
          </PrimaryButton>
        </div>
      </div>

      {simulated && results.length > 0 && (
        <p className="mt-3 rounded-xl border border-gold/40 bg-gold/5 px-4 py-2 text-xs text-brown">
          Simulated results (no <code>GOOGLE_MAPS_API_KEY</code> set). Add your key to{" "}
          <code>.env.local</code> to import live Google Places data.
        </p>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="serif text-2xl text-espresso">Review results ({results.length})</h2>
            <span className="text-xs text-brown/60">
              {approved} approved · {rejected} rejected
            </span>
          </div>
          <div className="overflow-hidden rounded-xl2 border border-line bg-card shadow-card">
            {results.map((r) => {
              const d = decisions[r.google_place_id];
              return (
                <div
                  key={r.google_place_id}
                  className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-espresso">{r.name}</p>
                      {!r.is_cafe && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">
                          not café
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-brown/60">{r.formatted_address}</p>
                    <p className="mt-0.5 text-[11px] text-brown/50">
                      ★ {r.google_rating ?? "–"} ({r.google_rating_count ?? 0}) · {r.types?.slice(0, 2).join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => decide(r.google_place_id, "approved")}
                      className={`grid h-9 w-9 place-items-center rounded-full ${
                        d === "approved" ? "bg-espresso text-cream" : "border border-line text-espresso"
                      }`}
                    >
                      <Icon name="check" size={16} />
                    </button>
                    <button
                      onClick={() => decide(r.google_place_id, "rejected")}
                      className={`grid h-9 w-9 place-items-center rounded-full ${
                        d === "rejected" ? "bg-red-600 text-white" : "border border-line text-brown"
                      }`}
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <PrimaryButton onClick={() => alert(`${approved} cafés approved into Sipp (wire to Supabase to persist).`)}>
              Save {approved} approved
            </PrimaryButton>
            <GhostButton onClick={() => setResults([])}>Clear</GhostButton>
          </div>
        </div>
      )}

      {/* Import logs */}
      {logs.length > 0 && (
        <div className="mt-8">
          <h2 className="serif text-2xl text-espresso">Import logs</h2>
          <div className="mt-2 overflow-hidden rounded-xl2 border border-line bg-card shadow-card">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b border-line px-4 py-3 text-sm last:border-0">
                <div>
                  <p className="text-espresso">{l.query}</p>
                  <p className="text-xs text-brown/60">
                    {l.source} · {l.area}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-espresso">{l.found} found</p>
                  <p className="text-xs text-brown/50">{l.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-brown/50">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options, editable }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm text-espresso focus:border-gold focus:outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
