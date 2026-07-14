// London (UK) café discovery sweep via Google Places (New) Text Search.
// Same adaptive quadtree engine as sweep-gta: coarse grid over Greater London;
// any cell that saturates (60 results) subdivides into 4 until ~1km cells.
// Chain-filtered (UK list), deduped against the catalogue by google_place_id,
// inserted with real coordinates, rating, contact info, 4 real photos, and
// derived category signals (keyword counts only — raw review text never stored).
//
// Usage:
//   node scripts/sweep-london.mjs --dry                 # count only, no inserts
//   node scripts/sweep-london.mjs --cap-search=70 --cap-photos=150
// After: node scripts/classify-cafes.mjs --country="United Kingdom"

import { readFileSync } from "node:fs";
import { TAG_RULES, findKeyword } from "./sipp-taxonomy.mjs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;
const GKEY = env.GOOGLE_MAPS_API_KEY;
if (!SB || !KEY || !GKEY) throw new Error("Missing Supabase/Google keys");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const arg = (k, d) => parseFloat(args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const DRY = args.includes("--dry");
const CAP_SEARCH = arg("cap-search", 70);
const CAP_PHOTOS = arg("cap-photos", 150);

// UK chain exclusions — big chains only; small premium local groups stay in.
const CHAINS = /costa\s*coffee|^costa\b|pret\s*a\s*manger|^pret\b|caff[eè]\s*nero|greggs|starbucks|mcdonald|mccaf|gail'?s|black\s*sheep\s*coffee|joe\s*&\s*the\s*juice|ole\s*&\s*steen|le\s*pain\s*quotidien|coco\s*di\s*mama|patisserie\s*valerie|krispy\s*kreme|dunkin|tim\s*hortons?|esquires|muffin\s*break|millie'?s\s*cookies|wh\s*smith|harris\s*\+?\s*hoole|caf[eé]\s*rouge|creams\s*(caf[eé]|dessert)|^creams\b|heavenly\s*desserts|kaspa'?s|gong\s*cha|chatime|coco\s*fresh|bubbleology|t4\b|cupp\b|second\s*cup|insomnia\s*coffee|soho\s*coffee|amt\s*coffee|puccino'?s|costa$/i;

// Café-ish Google types we accept; hard excludes for kiosks etc.
const OK_TYPES = new Set(["cafe", "coffee_shop", "tea_house", "bubble_tea_store", "dessert_shop", "dessert_restaurant", "bakery", "cat_cafe", "dog_cafe"]);
const BAD_TYPES = new Set(["gas_station", "convenience_store", "grocery_store", "supermarket"]);

// Greater London bounding box (M25-ish): Heathrow/Uxbridge → Upminster, Croydon → Enfield.
const BOX = { latLo: 51.28, latHi: 51.70, lngLo: -0.51, lngHi: 0.33 };
const MIN_CELL = 0.009; // ~1 km

// "..., Croydon CR0 1PB, UK" → town before the postcode. Everything is city=London;
// non-London towns (Croydon, Richmond, ...) become the area for filtering.
const townFromAddress = (addr) => {
  const m = /,\s*([A-Za-z .'\-]+?)\s+[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/.exec(addr || "");
  return m ? m[1].trim() : null;
};
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s\-&(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const PRICE = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };

const FIELDS = "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.editorialSummary,places.photos,places.reviews,places.priceLevel,nextPageToken";
const COST = { search: 0.04, photo: 0.007 };
let spentSearch = 0, spentPhotos = 0, calls = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nextAt = 0;
async function gate() { const now = Date.now(); const w = Math.max(0, nextAt - now); nextAt = Math.max(now, nextAt) + 130; if (w) await sleep(w); }

async function searchCell(cell) {
  const out = [];
  let pageToken = null;
  for (let page = 0; page < 3; page++) {
    if (spentSearch + COST.search > CAP_SEARCH) return { results: out, capped: true };
    await gate();
    const body = {
      textQuery: "cafe",
      pageSize: 20,
      locationRestriction: { rectangle: { low: { latitude: cell.latLo, longitude: cell.lngLo }, high: { latitude: cell.latHi, longitude: cell.lngHi } } },
    };
    if (pageToken) body.pageToken = pageToken;
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GKEY, "X-Goog-FieldMask": FIELDS },
      body: JSON.stringify(body),
    });
    calls++; spentSearch += COST.search;
    if (r.status === 429) { await sleep(12000); page--; continue; }
    const j = await r.json();
    if (j.error) { console.log("  search error:", j.error.status); break; }
    out.push(...(j.places || []));
    pageToken = j.nextPageToken;
    if (!pageToken) break;
    await sleep(400);
  }
  return { results: out, capped: false };
}

function keep(gp) {
  const name = gp.displayName?.text || "";
  if (!name || CHAINS.test(name)) return false;
  const types = new Set([...(gp.types || []), gp.primaryType].filter(Boolean));
  if ([...types].some((t) => BAD_TYPES.has(t))) return false;
  return [...types].some((t) => OK_TYPES.has(t));
}

function toRow(gp) {
  const town = townFromAddress(gp.formattedAddress) || "London";
  const reviews = (gp.reviews || []).map((rv) => rv.text?.text || rv.originalText?.text || "").filter(Boolean);
  const summary = gp.editorialSummary?.text || "";
  const review_keyword_counts = {}, editorial_hits = [];
  for (const [tag, rule] of Object.entries(TAG_RULES)) {
    let n = 0;
    for (const rv of reviews) if (findKeyword(rv, rule.keywords)) n++;
    if (n > 0) review_keyword_counts[tag] = n;
    if (findKeyword(summary, rule.keywords)) editorial_hits.push(tag);
  }
  return {
    id: gp.id, google_place_id: gp.id,
    name: titleCase(gp.displayName?.text || ""),
    area: town !== "London" ? town : null, city: "London", country: "United Kingdom",
    lat: gp.location?.latitude ?? null, lng: gp.location?.longitude ?? null,
    category: "cafe", tags: [], is_active: true,
    google_rating: gp.rating ?? null, rating_count: gp.userRatingCount ?? null,
    price_level: PRICE[gp.priceLevel] ?? 2,
    phone: gp.nationalPhoneNumber || null, website: gp.websiteUri || null,
    google_maps_url: gp.googleMapsUri || null, blurb: summary || null,
    photos: [], image_url: null,
    google_signals: {
      place_id: gp.id, types: gp.types || [], primary_type_google: gp.primaryType || null,
      website: gp.websiteUri || null, rating: gp.rating || null, user_ratings: gp.userRatingCount || null,
      review_count_seen: reviews.length, review_keyword_counts, editorial_hits, fetched_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    _photoNames: (gp.photos || []).slice(0, 4).map((p) => p.name),
  };
}

async function loadExistingIds() {
  const ids = new Set();
  for (let from = 0; ; from += 1000) {
    const d = await (await fetch(`${SB}/rest/v1/places?select=id,google_place_id`, { headers: { ...H, Range: `${from}-${from + 999}` } })).json();
    if (!Array.isArray(d) || !d.length) break;
    d.forEach((p) => { ids.add(p.id); if (p.google_place_id) ids.add(p.google_place_id); });
    if (d.length < 1000) break;
  }
  return ids;
}

(async () => {
  console.log(`London sweep${DRY ? " (dry)" : ""} — caps: search $${CAP_SEARCH}, photos $${CAP_PHOTOS}`);
  const existing = await loadExistingIds();
  console.log(`Existing catalogue ids: ${existing.size}\n`);

  const cells = [];
  const NL = 8, NG = 8;
  for (let i = 0; i < NL; i++) for (let j = 0; j < NG; j++) {
    cells.push({
      latLo: BOX.latLo + (i * (BOX.latHi - BOX.latLo)) / NL, latHi: BOX.latLo + ((i + 1) * (BOX.latHi - BOX.latLo)) / NL,
      lngLo: BOX.lngLo + (j * (BOX.lngHi - BOX.lngLo)) / NG, lngHi: BOX.lngLo + ((j + 1) * (BOX.lngHi - BOX.lngLo)) / NG,
    });
  }

  const found = new Map();
  let processed = 0, subdivided = 0, capped = false;
  while (cells.length) {
    const cell = cells.pop();
    const { results, capped: hitCap } = await searchCell(cell);
    if (hitCap) { capped = true; break; }
    processed++;
    for (const gp of results) {
      if (!keep(gp)) continue;
      if (existing.has(gp.id) || found.has(gp.id)) continue;
      found.set(gp.id, toRow(gp));
    }
    if (results.length >= 60 && (cell.latHi - cell.latLo) > MIN_CELL) {
      const midLat = (cell.latLo + cell.latHi) / 2, midLng = (cell.lngLo + cell.lngHi) / 2;
      cells.push(
        { latLo: cell.latLo, latHi: midLat, lngLo: cell.lngLo, lngHi: midLng },
        { latLo: cell.latLo, latHi: midLat, lngLo: midLng, lngHi: cell.lngHi },
        { latLo: midLat, latHi: cell.latHi, lngLo: cell.lngLo, lngHi: midLng },
        { latLo: midLat, latHi: cell.latHi, lngLo: midLng, lngHi: cell.lngHi },
      );
      subdivided++;
    }
    if (processed % 25 === 0) console.log(`  cells done ${processed}, queue ${cells.length}, new cafés ${found.size}, est search $${spentSearch.toFixed(2)}`);
  }

  const rows = [...found.values()];
  const byArea = {};
  rows.forEach((r) => (byArea[r.area || "London"] = (byArea[r.area || "London"] || 0) + 1));
  console.log(`\nSWEEP DONE${capped ? " (SEARCH CAP HIT — partial)" : ""}: ${processed} cells (${subdivided} subdivided), ${rows.length} NEW independent cafés, est $${spentSearch.toFixed(2)}`);
  console.log("Top areas:", Object.entries(byArea).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c, n]) => `${c} ${n}`).join(" · "));

  if (DRY) { console.log("\n(dry run — nothing inserted)"); return; }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50).map(({ _photoNames, ...r }) => r);
    const res = await fetch(`${SB}/rest/v1/places`, { method: "POST", headers: { ...H, Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(batch) });
    if (res.ok) inserted += batch.length;
    else console.log("  insert batch failed:", (await res.text()).slice(0, 160));
  }
  console.log(`Inserted ${inserted} places.`);

  let photoOk = 0;
  for (const r of rows) {
    if (spentPhotos + r._photoNames.length * COST.photo > CAP_PHOTOS) { console.log("  photo cap hit — remaining cafés keep placeholder until next run"); break; }
    if (!r._photoNames.length) continue;
    const urls = [];
    for (const name of r._photoNames) {
      const pr = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=1000&skipHttpRedirect=true&key=${GKEY}`);
      spentPhotos += COST.photo;
      const pj = await pr.json().catch(() => ({}));
      if (pj.photoUri) urls.push(pj.photoUri);
    }
    if (urls.length) {
      await fetch(`${SB}/rest/v1/places?id=eq.${encodeURIComponent(r.id)}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ photos: urls, image_url: urls[0] }) });
      photoOk++;
    }
    if (photoOk % 100 === 0 && photoOk > 0) console.log(`  photos: ${photoOk} cafés, est $${spentPhotos.toFixed(2)}`);
  }
  console.log(`\nALL DONE. new=${inserted} photos=${photoOk} | search $${spentSearch.toFixed(2)} + photos $${spentPhotos.toFixed(2)} = $${(spentSearch + spentPhotos).toFixed(2)} (${calls} calls)`);
  console.log('Next: node scripts/classify-cafes.mjs --country="United Kingdom"');
})();
