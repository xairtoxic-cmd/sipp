// Backfill real venue photos into places.image_url using the (free) Foursquare
// Places API. One photo per place — drives both the card and the detail image.
// No Google, no per-view cost: this runs once and stores the URL in the DB.
//
// Usage:
//   FOURSQUARE_API_KEY=xxx node scripts/backfill-foursquare-photos.mjs
//   ...optional flags:
//   --all          re-fetch even places that already have an image_url
//   --city=Dubai   only this city
//   --limit=200    stop after N updates (useful for a test run)
//
// Supabase URL + service-role key are read from .env.local.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---- env ----
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_SERVICE_ROLE_KEY;
const FSQ_KEY = process.env.FOURSQUARE_API_KEY || env.FOURSQUARE_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing Supabase URL / service-role key in .env.local");
if (!FSQ_KEY) throw new Error("Set FOURSQUARE_API_KEY (env var or .env.local). Get a free one at https://foursquare.com/developers/");

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const CITY = args.find((a) => a.startsWith("--city="))?.split("=")[1] || null;
const MAX = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10) || Infinity;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---- Foursquare helpers ----
// Current Foursquare Places API ("places-api.foursquare.com", Service Key as a
// Bearer token + dated version header). The legacy v3 API is shut down (HTTP 410).
const BASE = "https://places-api.foursquare.com";
const VERSION = "2025-06-17";

async function fsq(path) {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${FSQ_KEY}`, "X-Places-Api-Version": VERSION, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FSQ ${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

async function detectApi() {
  try {
    await fsq(`/places/search?query=cafe&ll=25.2,55.27&limit=1`);
  } catch (e) {
    if (/401|Invalid request token/.test(e.message)) {
      throw new Error(
        "Key rejected (401). This looks like a legacy v3 API key — the v3 API is shut down.\n" +
        "Generate a SERVICE KEY for the new Places API at https://foursquare.com/developers/ " +
        "(your project → API Keys → New → Service Key) and use that instead."
      );
    }
    throw e;
  }
}

async function findPhoto(place) {
  const ll = place.lat && place.lng ? `&ll=${place.lat},${place.lng}&radius=250` : "";
  const q = encodeURIComponent(place.name);
  // 1) find the matching venue
  const search = await fsq(`/places/search?query=${q}${ll}&limit=1`);
  const match = search.results?.[0];
  const fsqId = match?.fsq_place_id || match?.fsq_id;
  if (!fsqId) return null;
  // 2) get its photos
  const photos = await fsq(`/places/${fsqId}/photos?limit=1&sort=POPULAR`);
  const p = Array.isArray(photos) ? photos[0] : photos.results?.[0] || photos[0];
  if (!p?.prefix || !p?.suffix) return null;
  return `${p.prefix}original${p.suffix}`; // e.g. https://.../original.jpg
}

// ---- main ----
async function loadPlaces() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from("places").select("id,name,area,city,lat,lng,image_url").order("id").range(from, from + 999);
    if (CITY) q = q.eq("city", CITY);
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

(async () => {
  await detectApi();
  console.log("Foursquare Places API: connected.");
  const places = await loadPlaces();
  const todo = places.filter((p) => ALL || !p.image_url || /unsplash/.test(p.image_url));
  console.log(`${places.length} places loaded, ${todo.length} to backfill${CITY ? ` in ${CITY}` : ""}.`);

  let updated = 0, miss = 0, err = 0;
  for (const p of todo) {
    if (updated >= MAX) break;
    try {
      const url = await findPhoto(p);
      if (!url) { miss++; continue; }
      const { error } = await supabase.from("places").update({ image_url: url }).eq("id", p.id);
      if (error) throw error;
      updated++;
      if (updated % 25 === 0) console.log(`  ${updated} updated…`);
    } catch (e) {
      err++;
      if (err <= 5) console.warn(`  ! ${p.name}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 120)); // gentle rate limit
  }
  console.log(`Done. updated=${updated} no-photo=${miss} errors=${err}`);
})();
