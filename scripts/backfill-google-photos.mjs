// One-time backfill of up to 4 REAL Google photos per place, stored in the DB
// (places.photos jsonb + image_url = first photo). After this runs, the apps read
// stored URLs — Google is never called again, so it never costs anything per view.
//
// Safety: hard spend cap (stops well before your credit), resumable (skips places
// that already have photos), so re-running never double-charges.
//
// Usage:
//   node scripts/backfill-google-photos.mjs --limit=10        # small test
//   node scripts/backfill-google-photos.mjs --cap=300         # full run, stop at ~$300 est
//   node scripts/backfill-google-photos.mjs --uae             # only UAE places

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_SERVICE_ROLE_KEY;
const GKEY = env.GOOGLE_MAPS_API_KEY;
if (!SB_URL || !KEY) throw new Error("Missing Supabase URL / service-role key");
if (!GKEY) throw new Error("Missing GOOGLE_MAPS_API_KEY");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const LIMIT = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10) || Infinity;
const CAP = parseFloat(args.find((a) => a.startsWith("--cap="))?.split("=")[1] || "300");
const UAE_ONLY = args.includes("--uae");
const PER_PLACE = 4;

// Google Places (New) approximate pricing
const COST = { details: 0.017, search: 0.032, photo: 0.007 };
let spent = 0, calls = 0;

async function placeDetailsPhotos(placeId) {
  const r = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${GKEY}`);
  calls++; spent += COST.details;
  const j = await r.json();
  if (j.error) throw new Error(`details ${j.error.status}`);
  return (j.photos || []).slice(0, PER_PLACE).map((p) => p.name);
}

async function textSearchPhotos(place) {
  const body = { textQuery: [place.name, place.area, place.city, "UAE"].filter(Boolean).join(", "), maxResultCount: 1, regionCode: "AE" };
  if (place.lat && place.lng) body.locationBias = { circle: { center: { latitude: place.lat, longitude: place.lng }, radius: 600 } };
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GKEY, "X-Goog-FieldMask": "places.photos" },
    body: JSON.stringify(body),
  });
  calls++; spent += COST.search;
  const j = await r.json();
  if (j.error) throw new Error(`search ${j.error.status}`);
  return (j.places?.[0]?.photos || []).slice(0, PER_PLACE).map((p) => p.name);
}

async function resolve(photoName) {
  const r = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1000&skipHttpRedirect=true&key=${GKEY}`);
  calls++; spent += COST.photo;
  const j = await r.json();
  return j.photoUri || null;
}

async function loadPlaces() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    let url = `${SB_URL}/rest/v1/places?select=id,name,area,city,lat,lng,google_place_id,photos&order=id`;
    if (UAE_ONLY) url += "&country=eq.UAE";
    const data = await (await fetch(url, { headers: { ...H, Range: `${from}-${from + 999}` } })).json();
    if (!Array.isArray(data) || !data.length) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

async function save(id, urls) {
  await fetch(`${SB_URL}/rest/v1/places?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ photos: urls, image_url: urls[0] }),
  });
}

async function processOne(p) {
  try {
    let names = [];
    if (p.google_place_id && p.google_place_id.length > 5 && p.google_place_id.startsWith("ChIJ")) {
      names = await placeDetailsPhotos(p.google_place_id);
    } else {
      names = await textSearchPhotos(p);
    }
    if (!names.length) return "nophoto";
    const urls = (await Promise.all(names.map(resolve))).filter(Boolean);
    if (!urls.length) return "nophoto";
    await save(p.id, urls);
    return "ok";
  } catch (e) {
    return "err:" + e.message;
  }
}

(async () => {
  const places = await loadPlaces();
  const todo = places.filter((p) => !Array.isArray(p.photos) || p.photos.length === 0).slice(0, LIMIT === Infinity ? undefined : LIMIT);
  console.log(`${places.length} places, ${todo.length} need photos. Cap: $${CAP}. Limit: ${LIMIT === Infinity ? "none" : LIMIT}`);

  let ok = 0, no = 0, err = 0, done = 0;
  const CONC = 8;
  for (let i = 0; i < todo.length; i += CONC) {
    if (spent + COST.search + PER_PLACE * COST.photo > CAP) {
      console.log(`\n*** Spend cap $${CAP} reached (est $${spent.toFixed(2)}). Stopping. Re-run to continue. ***`);
      break;
    }
    const batch = todo.slice(i, i + CONC);
    const res = await Promise.all(batch.map(processOne));
    for (const r of res) { done++; if (r === "ok") ok++; else if (r === "nophoto") no++; else err++; }
    if (done % 80 === 0 || i + CONC >= todo.length) {
      console.log(`  ${done}/${todo.length} | ok=${ok} nophoto=${no} err=${err} | est spend $${spent.toFixed(2)} (${calls} calls)`);
    }
  }
  console.log(`\nDONE. updated=${ok} nophoto=${no} err=${err} | est spend $${spent.toFixed(2)} | API calls=${calls}`);
})();
