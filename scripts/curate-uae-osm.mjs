// Curate the OSM-imported UAE cafés up to the same standard as the original 749:
// pull each one's real Google rating + review count, give the good ones a real
// sipp_score, and HIDE (is_active=false) anything below the quality bar or with no
// Google match. Reversible — nothing is deleted.
//
// Quality bar: rating >= 4.2 AND reviews >= 50.
//
// Resumable: skips OSM cafés already processed (google_rating set). Throttled to
// respect Google's per-minute Text Search quota.
//
// Usage: node scripts/curate-uae-osm.mjs [--limit=20] [--cap=150]

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_SERVICE_ROLE_KEY;
const GKEY = env.GOOGLE_MAPS_API_KEY;
if (!SB_URL || !KEY || !GKEY) throw new Error("Missing Supabase or Google key in .env.local");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const LIMIT = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10) || Infinity;
const CAP = parseFloat(args.find((a) => a.startsWith("--cap="))?.split("=")[1] || "150");
const MIN_RATING = 4.2, MIN_REVIEWS = 50;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SEARCH_GAP = 140;
let nextSearchAt = 0, spent = 0, calls = 0;
async function searchGate() {
  const now = Date.now();
  const wait = Math.max(0, nextSearchAt - now);
  nextSearchAt = Math.max(now, nextSearchAt) + SEARCH_GAP;
  if (wait) await sleep(wait);
}

const sippFromRating = (r) => Math.min(9.7, Math.round((((r || 4.3) * 1.9) + 0.3) * 10) / 10);

async function search(place) {
  const body = { textQuery: [place.name, place.area, place.city, "UAE"].filter(Boolean).join(", "), maxResultCount: 1, regionCode: "AE" };
  if (place.lat && place.lng) body.locationBias = { circle: { center: { latitude: place.lat, longitude: place.lng }, radius: 600 } };
  for (let attempt = 0; attempt < 4; attempt++) {
    await searchGate();
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GKEY, "X-Goog-FieldMask": "places.id,places.rating,places.userRatingCount" },
      body: JSON.stringify(body),
    });
    calls++; spent += 0.032;
    if (r.status === 429) { await sleep(15000); continue; }
    const j = await r.json();
    if (j.error) throw new Error(j.error.status);
    return j.places?.[0] || null;
  }
  throw new Error("429 gave up");
}

async function loadOsm() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const url = `${SB_URL}/rest/v1/places?select=id,name,area,city,lat,lng,google_rating&country=eq.UAE&id=like.osm-*&order=id`;
    const data = await (await fetch(url, { headers: { ...H, Range: `${from}-${from + 999}` } })).json();
    if (!Array.isArray(data) || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

async function update(id, fields) {
  await fetch(`${SB_URL}/rest/v1/places?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(fields),
  });
}

async function processOne(p) {
  try {
    const m = await search(p);
    const rating = m?.rating ?? 0, reviews = m?.userRatingCount ?? 0;
    const keep = rating >= MIN_RATING && reviews >= MIN_REVIEWS;
    await update(p.id, {
      google_rating: rating, rating_count: reviews,
      sipp_score: keep ? sippFromRating(rating) : null,
      is_active: keep,
    });
    return keep ? "kept" : "hidden";
  } catch (e) { return "err:" + e.message; }
}

(async () => {
  const osm = await loadOsm();
  const todo = osm.filter((p) => p.google_rating == null).slice(0, LIMIT === Infinity ? undefined : LIMIT);
  console.log(`${osm.length} OSM cafés, ${todo.length} to curate. Bar: ${MIN_RATING}★ & ${MIN_REVIEWS}+ reviews. Cap $${CAP}.`);

  let kept = 0, hidden = 0, err = 0, done = 0;
  const CONC = 6;
  for (let i = 0; i < todo.length; i += CONC) {
    if (spent + CONC * 0.032 > CAP) { console.log(`\n*** Cap $${CAP} reached (est $${spent.toFixed(2)}). Re-run to continue. ***`); break; }
    const res = await Promise.all(todo.slice(i, i + CONC).map(processOne));
    for (const r of res) { done++; if (r === "kept") kept++; else if (r === "hidden") hidden++; else err++; }
    if (done % 60 === 0 || i + CONC >= todo.length) console.log(`  ${done}/${todo.length} | kept=${kept} hidden=${hidden} err=${err} | est $${spent.toFixed(2)}`);
  }
  console.log(`\nDONE. kept=${kept} hidden=${hidden} err=${err} | est spend $${spent.toFixed(2)} | calls=${calls}`);
})();
