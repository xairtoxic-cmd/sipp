// Free UAE café import from OpenStreetMap (Overpass API — no key, no cost).
// Pulls amenity=cafe + shop=coffee per emirate, dedupes against existing places
// (by normalized name within ~250m), and upserts via the Supabase REST API using
// the service-role key (no DB password / direct connection needed).
//
// Run: node scripts/import-uae-osm.mjs            (live insert)
//      node scripts/import-uae-osm.mjs --dry      (count only, no writes)
//
// After running, give new places images:  node scripts/backfill-stock-photos.mjs --only-stock

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !KEY) throw new Error("Missing Supabase URL / service-role key in .env.local");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const DRY = process.argv.includes("--dry");

const norm = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
const haversine = (a, b, c, d) => { const R = 6371000, t = Math.PI / 180, dla = (c - a) * t, dlo = (d - b) * t; const x = Math.sin(dla / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(dlo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

// City centers — each café is assigned to the nearest one (with addr:city override).
const CENTERS = [
  { city: "Dubai", emirate: "Dubai", lat: 25.20, lng: 55.27 },
  { city: "Abu Dhabi", emirate: "Abu Dhabi", lat: 24.47, lng: 54.37 },
  { city: "Al Ain", emirate: "Abu Dhabi", lat: 24.21, lng: 55.76 },
  { city: "Sharjah", emirate: "Sharjah", lat: 25.35, lng: 55.39 },
  { city: "Ajman", emirate: "Ajman", lat: 25.41, lng: 55.45 },
  { city: "Umm Al Quwain", emirate: "Umm Al Quwain", lat: 25.56, lng: 55.55 },
  { city: "Ras Al Khaimah", emirate: "Ras Al Khaimah", lat: 25.79, lng: 55.94 },
  { city: "Fujairah", emirate: "Fujairah", lat: 25.13, lng: 56.34 },
];
const ADDR_MAP = { dubai: "Dubai", "abu dhabi": "Abu Dhabi", "abudhabi": "Abu Dhabi", "al ain": "Al Ain", alain: "Al Ain", sharjah: "Sharjah", ajman: "Ajman", "umm al quwain": "Umm Al Quwain", "ras al khaimah": "Ras Al Khaimah", "ras al khaymah": "Ras Al Khaimah", fujairah: "Fujairah" };

function assign(lat, lng, addrCity) {
  const key = norm(addrCity).replace(/^al/, "al "); // light touch; mainly use centroid
  const direct = ADDR_MAP[(addrCity || "").trim().toLowerCase()];
  if (direct) return CENTERS.find((c) => c.city === direct);
  let best = CENTERS[0], bd = Infinity;
  for (const c of CENTERS) { const d = haversine(lat, lng, c.lat, c.lng); if (d < bd) { bd = d; best = c; } }
  return best;
}

async function overpass() {
  const BB = "22.4,51.0,26.2,56.5"; // UAE bounding box
  const q = `[out:json][timeout:180];
(
  node["amenity"="cafe"](${BB});
  node["shop"="coffee"](${BB});
  way["amenity"="cafe"](${BB});
  way["shop"="coffee"](${BB});
);
out center tags;`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "sipp-cafe-import/1.0 (canada@surayyagroup.com)" },
        body: "data=" + encodeURIComponent(q),
      });
      if (res.status === 429 || res.status === 504) throw new Error(`overpass ${res.status} (busy)`);
      if (!res.ok) throw new Error(`overpass ${res.status}`);
      return (await res.json()).elements || [];
    } catch (e) {
      console.warn(`  attempt ${attempt} failed: ${e.message}${attempt < 4 ? " — retrying in 15s" : ""}`);
      if (attempt < 4) await new Promise((r) => setTimeout(r, 15000));
      else throw e;
    }
  }
}

async function loadExisting() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SB_URL}/rest/v1/places?select=name,lat,lng&country=eq.UAE`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all.filter((p) => p.lat && p.lng).map((p) => ({ n: norm(p.name), lat: p.lat, lng: p.lng }));
}

function tagsFor(t) {
  const tags = ["Specialty Coffee"];
  const hay = `${t.name || ""} ${t.cuisine || ""}`.toLowerCase();
  if (/matcha/.test(hay)) tags.push("Matcha");
  if (/bakery|patisserie|bake/.test(hay)) tags.push("Bakery");
  if (/dessert|sweet/.test(hay)) tags.push("Dessert");
  if (/brunch/.test(hay)) tags.push("Brunch");
  if (t.outdoor_seating === "yes") tags.push("Outdoor Seating");
  return [...new Set(tags)].slice(0, 4);
}

async function upsertBatch(rows) {
  const res = await fetch(`${SB_URL}/rest/v1/places?on_conflict=id`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

(async () => {
  console.log("Loading existing UAE places for dedupe…");
  const existing = await loadExisting();
  console.log(`  ${existing.length} existing UAE places.`);

  console.log("Querying OpenStreetMap for all UAE cafés…");
  const els = await overpass();
  console.log(`  ${els.length} OSM café elements returned.`);

  const fresh = [];
  const seenIds = new Set();
  const byCity = {};
  let named = 0, dupes = 0;
  for (const el of els) {
    const t = el.tags || {};
    const name = t["name:en"] || t.name;
    if (!name || name.length < 2) continue;
    named++;
    const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
    if (!lat || !lng) continue;
    const id = `osm-${el.type}-${el.id}`;
    if (seenIds.has(id)) continue;
    const nn = norm(name);
    // dedupe vs existing curated places (same-ish name within 250m)
    const dup = existing.some((e) => (e.n === nn || (nn.length > 5 && (e.n.includes(nn) || nn.includes(e.n)))) && haversine(lat, lng, e.lat, e.lng) < 250);
    if (dup) { dupes++; continue; }
    seenIds.add(id);
    const c = assign(lat, lng, t["addr:city"]);
    byCity[c.city] = (byCity[c.city] || 0) + 1;
    fresh.push({
      id, name, area: t["addr:suburb"] || t["addr:district"] || t["addr:city"] || c.city,
      city: c.city, emirate: c.emirate, country: "UAE", lat, lng, category: "cafe", tags: tagsFor(t),
      website: t.website || t["contact:website"] || null, phone: t.phone || t["contact:phone"] || null,
      sipp_score: null, image_url: null, is_active: true,
    });
  }
  console.log(`  named: ${named}, skipped as duplicates of existing: ${dupes}`);
  console.log(`  new by city:`, byCity);
  console.log(`\nTotal new cafés to add: ${fresh.length}`);
  if (DRY) { console.log("(dry run — no writes)"); return; }
  if (!fresh.length) return;

  for (let i = 0; i < fresh.length; i += 200) {
    await upsertBatch(fresh.slice(i, i + 200));
    console.log(`  upserted ${Math.min(i + 200, fresh.length)}/${fresh.length}`);
  }
  console.log("Done. Now run: node scripts/backfill-stock-photos.mjs --only-stock");
})();
