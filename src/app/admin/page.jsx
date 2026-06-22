"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Logo } from "@/components/Chrome";
import { PrimaryButton, GhostButton } from "@/components/UI";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

async function authToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CAFE_BREAKDOWN = ["Coffee/Drinks", "Food", "Vibe", "Service", "Aesthetic", "Work-friendly", "Value", "Overall"];
const FINE_BREAKDOWN = ["Food", "Service", "Ambience", "Presentation", "Value", "Date-night", "Overall"];

function SippRatePanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({});
  const [breakdown, setBreakdown] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function search() {
    if (!q.trim() || !SUPA_URL) return;
    const res = await fetch(
      `${SUPA_URL}/rest/v1/places?name=ilike.*${encodeURIComponent(q.trim())}*&select=*&limit=12`,
      { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` } }
    );
    setResults(await res.json());
  }
  function pick(p) {
    setSel(p);
    setForm({
      is_sipp_rated: !!p.is_sipp_rated,
      has_sipp_star: !!p.has_sipp_star,
      sipp_rated_score: p.sipp_rated_score ?? "",
      sipp_reviewer_id: p.sipp_reviewer_id ?? "Sipp Team",
      sipp_review_date: p.sipp_review_date ?? "",
      sipp_public_note: p.sipp_public_note ?? "",
      sipp_internal_note: p.sipp_internal_note ?? "",
      sipp_rating_photos: (p.sipp_rating_photos || []).join(", "),
      booking_cta_enabled: !!p.booking_cta_enabled,
      accepts_reservations: !!p.accepts_reservations,
      walk_in_only: !!p.walk_in_only,
      deposit_required: !!p.deposit_required,
      booking_provider: p.booking_provider ?? "restaurant_website",
      booking_url: p.booking_url ?? "",
      booking_phone: p.booking_phone ?? "",
      booking_whatsapp: p.booking_whatsapp ?? "",
      reservation_notes: p.reservation_notes ?? "",
      image_url: p.image_url ?? "",
      menu_text: p.menu ? JSON.stringify(p.menu, null, 2) : "",
    });
    setBreakdown(p.sipp_rating_breakdown || {});
    setMsg("");
  }
  const PROVIDERS = ["opentable", "sevenrooms", "resy", "tock", "restaurant_website", "whatsapp", "phone", "none"];
  const keys = sel?.category === "fine_dining" ? FINE_BREAKDOWN : CAFE_BREAKDOWN;

  async function save() {
    if (!sel) return;
    // Validate the menu JSON before sending.
    let menu = null;
    if ((form.menu_text || "").trim()) {
      try {
        menu = JSON.parse(form.menu_text);
        if (!Array.isArray(menu)) throw new Error("Menu must be a JSON array of sections.");
      } catch (e) {
        setMsg("Error: invalid menu JSON — " + e.message);
        return;
      }
    }
    setSaving(true);
    setMsg("");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/admin/sipp-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
      body: JSON.stringify({
        placeId: sel.id,
        is_sipp_rated: !!form.is_sipp_rated,
        has_sipp_star: !!form.has_sipp_star,
        sipp_rated_score: form.sipp_rated_score === "" ? null : Number(form.sipp_rated_score),
        sipp_reviewer_id: form.sipp_reviewer_id,
        sipp_review_date: form.sipp_review_date || null,
        sipp_public_note: form.sipp_public_note,
        sipp_internal_note: form.sipp_internal_note,
        sipp_rating_breakdown: Object.keys(breakdown).length ? breakdown : null,
        sipp_rating_photos: form.sipp_rating_photos ? form.sipp_rating_photos.split(",").map((s) => s.trim()).filter(Boolean) : null,
        booking_cta_enabled: !!form.booking_cta_enabled,
        accepts_reservations: !!form.accepts_reservations,
        walk_in_only: !!form.walk_in_only,
        deposit_required: !!form.deposit_required,
        booking_provider: form.booking_provider || "none",
        booking_url: form.booking_url || null,
        booking_phone: form.booking_phone || null,
        booking_whatsapp: form.booking_whatsapp || null,
        reservation_notes: form.reservation_notes || null,
        image_url: form.image_url || null,
        menu,
        menu_source: menu ? "admin" : null,
      }),
    });
    const out = await res.json();
    setSaving(false);
    setMsg(out.error ? "Error: " + out.error : "Saved ✓");
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mt-8 rounded-xl2 border border-line bg-card p-4 shadow-card">
      <h2 className="serif text-2xl text-espresso">Sipp Rated & Sipp Star</h2>
      <p className="text-sm text-brown/70">Personally review a place and award the Sipp badges. Admins only.</p>

      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search a place by name…"
          className="flex-1 rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none"
        />
        <GhostButton onClick={search}>Search</GhostButton>
      </div>

      {results.length > 0 && !sel && (
        <div className="mt-2 space-y-1">
          {results.map((p) => (
            <button key={p.id} onClick={() => pick(p)} className="flex w-full items-center justify-between rounded-lg border border-line bg-ivory px-3 py-2 text-left text-sm">
              <span>{p.name} <span className="text-brown/50">· {p.city} · {p.category === "fine_dining" ? "Fine Dining" : "Café"}</span></span>
              {(p.is_sipp_rated || p.has_sipp_star) && <span className="text-[10px] text-gold">{p.has_sipp_star ? "★ Star" : "Rated"}</span>}
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="serif text-xl text-espresso">{sel.name}</p>
            <button onClick={() => setSel(null)} className="text-xs text-gold">Change</button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => set("is_sipp_rated", !form.is_sipp_rated)} className={`flex-1 rounded-full px-4 py-2 text-sm ${form.is_sipp_rated ? "bg-espresso text-cream" : "border border-line bg-ivory text-brown"}`}>
              {form.is_sipp_rated ? "✓ Sipp Rated" : "Mark Sipp Rated"}
            </button>
            <button onClick={() => set("has_sipp_star", !form.has_sipp_star)} className={`flex-1 rounded-full px-4 py-2 text-sm ${form.has_sipp_star ? "bg-gold text-cream" : "border border-line bg-ivory text-brown"}`}>
              {form.has_sipp_star ? "★ Sipp Star" : "Award Sipp Star"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input value={form.sipp_rated_score} onChange={(e) => set("sipp_rated_score", e.target.value)} type="number" step="0.1" placeholder="Sipp Rated score (1–10)" className="rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />
            <input value={form.sipp_review_date} onChange={(e) => set("sipp_review_date", e.target.value)} type="date" className="rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />
          </div>
          <input value={form.sipp_reviewer_id} onChange={(e) => set("sipp_reviewer_id", e.target.value)} placeholder="Reviewer name / ID" className="w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />

          <p className="text-xs uppercase tracking-wide text-brown/50">Sipp team breakdown</p>
          <div className="grid grid-cols-2 gap-2">
            {keys.map((k) => (
              <label key={k} className="flex items-center justify-between rounded-xl border border-line bg-ivory px-3 py-2 text-sm">
                <span className="text-brown/80">{k}</span>
                <input
                  type="number" step="0.1"
                  value={breakdown[k] ?? ""}
                  onChange={(e) => setBreakdown((b) => ({ ...b, [k]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                  className="w-14 bg-transparent text-right focus:outline-none"
                />
              </label>
            ))}
          </div>

          <textarea value={form.sipp_public_note} onChange={(e) => set("sipp_public_note", e.target.value)} rows={2} placeholder="Public reviewer note (shown on the place)" className="w-full resize-none rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />
          <textarea value={form.sipp_internal_note} onChange={(e) => set("sipp_internal_note", e.target.value)} rows={2} placeholder="Internal note (private, admin only)" className="w-full resize-none rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />
          <input value={form.sipp_rating_photos} onChange={(e) => set("sipp_rating_photos", e.target.value)} placeholder="Photo URLs (comma separated)" className="w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />

          <p className="mt-1 text-xs uppercase tracking-wide text-brown/50">Booking</p>
          <div className="flex flex-wrap gap-2">
            {[
              ["booking_cta_enabled", "Booking CTA on"],
              ["accepts_reservations", "Accepts reservations"],
              ["walk_in_only", "Walk-in only"],
              ["deposit_required", "Deposit required"],
            ].map(([k, label]) => (
              <button key={k} onClick={() => set(k, !form[k])} className={`rounded-full px-3.5 py-1.5 text-xs ${form[k] ? "bg-espresso text-cream" : "border border-line bg-ivory text-brown"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.booking_provider} onChange={(e) => set("booking_provider", e.target.value)} className="rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none">
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={form.booking_phone} onChange={(e) => set("booking_phone", e.target.value)} placeholder="Booking phone" className="rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />
          </div>
          <input value={form.booking_url} onChange={(e) => set("booking_url", e.target.value)} placeholder="Booking URL (OpenTable / SevenRooms / website…)" className="w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.booking_whatsapp} onChange={(e) => set("booking_whatsapp", e.target.value)} placeholder="WhatsApp number" className="rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />
            {form.booking_url ? (
              <a href={form.booking_url.startsWith("http") ? form.booking_url : `https://${form.booking_url}`} target="_blank" rel="noopener noreferrer" className="grid place-items-center rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm text-gold">Test link →</a>
            ) : (
              <span className="grid place-items-center rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm text-brown/40">No link</span>
            )}
          </div>
          <input value={form.reservation_notes} onChange={(e) => set("reservation_notes", e.target.value)} placeholder="Reservation notes" className="w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />

          <p className="mt-1 text-xs uppercase tracking-wide text-brown/50">Picture</p>
          {form.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.image_url} alt="" className="h-28 w-full rounded-xl border border-line object-cover" />
          ) : null}
          <input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="Main photo URL (https://…)" className="w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm focus:border-gold focus:outline-none" />

          <p className="mt-1 text-xs uppercase tracking-wide text-brown/50">Menu (JSON)</p>
          <textarea
            value={form.menu_text}
            onChange={(e) => set("menu_text", e.target.value)}
            rows={8}
            placeholder={'[{"section":"Starters","items":[{"name":"Burrata","price":55}]}]'}
            className="w-full resize-y rounded-xl border border-line bg-ivory px-3 py-2.5 font-mono text-xs focus:border-gold focus:outline-none"
          />
          <p className="text-[11px] text-brown/50">Array of sections — each with a <b>section</b> (or category) and <b>items</b> (name + price). Leave blank to clear.</p>

          <PrimaryButton className="w-full" onClick={save}>{saving ? "Saving…" : "Save place"}</PrimaryButton>
          {msg && <p className={`text-center text-sm ${msg.startsWith("Error") ? "text-red-700/80" : "text-gold"}`}>{msg}</p>}
        </div>
      )}
    </div>
  );
}

const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Al Ain"];
const DUBAI_AREAS = [
  "Al Quoz", "Alserkal Avenue", "Jumeirah", "Al Wasl", "Downtown Dubai", "DIFC", "Business Bay",
  "City Walk", "Dubai Marina", "JBR", "Bluewaters", "Palm Jumeirah", "Umm Suqeim", "Dubai Mall",
  "Dubai Creek Harbour", "Mirdif", "Deira",
];
const TYPES = [
  "cafe", "coffee_shop", "coffee_roastery", "bakery", "brunch_restaurant", "dessert_shop", "tea cafe", "matcha cafe",
  "fine dining restaurant", "tasting menu restaurant", "rooftop restaurant", "waterfront restaurant", "date night restaurant", "premium lounge",
];

export default function Admin() {
  const { user, hydrated } = useAuth();
  const isAdmin = (user?.email || "").toLowerCase() === ADMIN_EMAIL;
  const [tab, setTab] = useState("users");
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

  if (!hydrated) {
    return <main className="grid min-h-screen place-items-center text-brown/60">Loading…</main>;
  }
  if (!isAdmin) {
    return (
      <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
        <div>
          <Logo size="text-4xl" />
          <h1 className="mt-4 serif text-3xl text-espresso">Admins only</h1>
          <p className="mt-1 text-sm text-brown/70">
            {user ? "This account isn't an admin." : "Sign in with the admin account to continue."}
          </p>
          <a href="/" className="mt-4 inline-block text-sm font-medium text-gold">← Back to app</a>
        </div>
      </main>
    );
  }

  const TABS = [
    ["users", "Live users"],
    ["posts", "Posts"],
    ["places", "Restaurants & Sipp Star"],
    ["import", "Import"],
  ];

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="text-2xl" />
          <span className="rounded-full bg-espresso px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-cream">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin/algorithm" className="text-sm text-gold">Algorithm →</a>
          <a href="/" className="text-sm text-gold">← Back to app</a>
        </div>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
              tab === id ? "bg-espresso text-cream shadow-card" : "border border-line bg-card text-brown"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "places" && <SippRatePanel />}
      {tab === "posts" && <ReviewsPanel />}
      {tab === "users" && <UsersPanel />}

      {tab === "import" && (
      <>
      <h1 className="mt-8 serif text-4xl text-espresso">
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
                      {r.place_category === "cafe" && (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">Café</span>
                      )}
                      {r.place_category === "fine_dining" && (
                        <span className="rounded-full bg-espresso px-2 py-0.5 text-[10px] font-medium text-cream">Fine Dining</span>
                      )}
                      {!r.place_category && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">not curated</span>
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
      </>
      )}
    </main>
  );
}

function ReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    const token = await authToken();
    const res = await fetch("/api/admin/reviews", { headers: { Authorization: `Bearer ${token}` } });
    const out = await res.json();
    setLoading(false);
    if (out.error) setMsg("Error: " + out.error);
    else setReviews(out.reviews || []);
  }
  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!window.confirm("Delete this post permanently?")) return;
    const token = await authToken();
    const res = await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const out = await res.json();
    if (out.error) setMsg("Error: " + out.error);
    else setReviews((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="mt-6 rounded-xl2 border border-line bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="serif text-2xl text-espresso">Posts</h2>
        <GhostButton onClick={load}>{loading ? "Loading…" : "Refresh"}</GhostButton>
      </div>
      <p className="text-sm text-brown/70">Latest reviews from everyone — delete anything that breaks the rules.</p>
      {msg && <p className="mt-2 text-sm text-red-700/80">{msg}</p>}
      <div className="mt-3 space-y-2">
        {reviews.map((r) => (
          <div key={r.id} className="flex items-start gap-3 rounded-xl border border-line bg-ivory p-3">
            {r.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photo} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-espresso">
                <b>{r.author}</b> on <b>{r.place}</b>
                {r.overall != null && <span className="text-gold"> · {Number(r.overall).toFixed(1)}</span>}
              </p>
              <p className="truncate text-xs text-brown/70">{r.text || "(no text)"}</p>
            </div>
            <button onClick={() => del(r.id)} className="shrink-0 rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
              Delete
            </button>
          </div>
        ))}
        {reviews.length === 0 && !loading && <p className="py-6 text-center text-sm text-brown/60">No posts yet.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${accent ? "border-gold bg-gold/10" : "border-line bg-ivory"}`}>
      <p className={`serif text-3xl leading-none ${accent ? "text-gold" : "text-espresso"}`}>{value ?? "–"}</p>
      <p className="mt-1 text-[11px] text-brown/60">{label}</p>
    </div>
  );
}

function UsersPanel() {
  const { onlineIds } = useAuth();
  const [data, setData] = useState({ stats: null, roster: [] });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    const token = await authToken();
    const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
    const out = await res.json();
    setLoading(false);
    if (out.error) setMsg("Error: " + out.error);
    else setData(out);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // refresh the roster occasionally for new signups
    return () => clearInterval(t);
  }, []);

  // Live online set comes from realtime presence (updates instantly).
  const onlineSet = new Set(onlineIds || []);
  const roster = (data.roster || [])
    .map((u) => ({ ...u, online: onlineSet.has(u.id) }))
    .sort((a, b) => Number(b.online) - Number(a.online) || new Date(b.lastSignIn || 0) - new Date(a.lastSignIn || 0));
  const onlineNow = (onlineIds || []).length;

  return (
    <div className="mt-6 rounded-xl2 border border-line bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="serif text-2xl text-espresso">Users</h2>
        <GhostButton onClick={load}>{loading ? "…" : "Refresh"}</GhostButton>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Online now" value={onlineNow} accent />
        <Stat label="Total users" value={data.stats?.total} />
        <Stat label="New today" value={data.stats?.newToday} />
      </div>
      <p className="mt-2 text-[11px] text-brown/50">
        <span className="font-medium text-green-600">● Live</span> — “Online now” updates in real time as people open and close the app.
      </p>
      {msg && <p className="mt-2 text-sm text-red-700/80">{msg}</p>}
      <div className="mt-3 space-y-1">
        {roster.map((u) => (
          <div key={u.id} className="flex items-center gap-2 rounded-lg border border-line bg-ivory px-3 py-2 text-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${u.online ? "bg-green-500 animate-pulse" : "bg-brown/20"}`} />
            <span className="min-w-0 flex-1 truncate text-espresso">
              {u.name || u.username || "—"} <span className="text-brown/50">· {u.email}</span>
            </span>
            <span className="shrink-0 text-[11px] text-brown/50">{u.city}</span>
          </div>
        ))}
      </div>
    </div>
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
