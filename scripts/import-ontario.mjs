// Import all independent cafés in Ontario from OpenStreetMap (Overpass, free).
// Excludes national/chain coffee shops (Tim Hortons, Starbucks, etc.).
// Upserts into Supabase `places` via the REST API (service-role key).
//
// Run: node scripts/import-ontario.mjs

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

// National / multi-location chains to exclude.
const CHAINS = /tim\s*hortons?|^tims?\b|starbucks|mccaf|mcdonald|second\s*cup|country\s*style|coffee\s*time|coffee\s*culture|williams\s*fresh|robin'?s|baskin|dunkin|a\s*&\s*w|presse\s*caf|aroma\s*espresso|balzac'?s|esquires|timothy'?s|good\s*earth|blenz|waves\s*coffee|country\s*style|cinnabon|booster\s*juice|jugo\s*juice|david'?s\s*tea|t&t|gong\s*cha|chatime|coco\s*fresh|the\s*coffee\s*bean/i;

// Major Ontario cities for nearest-city assignment when addr:city is missing.
const CITIES = [
  ["Toronto", 43.653, -79.383], ["Ottawa", 45.421, -75.697], ["Mississauga", 43.589, -79.644],
  ["Brampton", 43.731, -79.762], ["Hamilton", 43.256, -79.871], ["London", 42.984, -81.245],
  ["Markham", 43.856, -79.337], ["Vaughan", 43.837, -79.508], ["Kitchener", 43.451, -80.493],
  ["Waterloo", 43.466, -80.523], ["Windsor", 42.317, -83.036], ["Richmond Hill", 43.882, -79.440],
  ["Oakville", 43.467, -79.687], ["Burlington", 43.325, -79.799], ["Oshawa", 43.897, -78.866],
  ["Barrie", 44.389, -79.690], ["Guelph", 43.545, -80.248], ["Kingston", 44.231, -76.486],
  ["Cambridge", 43.360, -80.313], ["Niagara Falls", 43.090, -79.083], ["St. Catharines", 43.159, -79.247],
  ["Sudbury", 46.491, -80.993], ["Thunder Bay", 48.382, -89.246], ["Kanata", 45.307, -75.916],
  ["Whitby", 43.897, -78.943], ["Ajax", 43.851, -79.020], ["Pickering", 43.836, -79.090],
  ["Milton", 43.518, -79.882], ["Newmarket", 44.059, -79.461], ["Peterborough", 44.309, -78.320],
];
const nearestCity = (lat, lng) => {
  let best = "Ontario", bd = Infinity;
  for (const [name, cl, cn] of CITIES) { const d = (lat - cl) ** 2 + (lng - cn) ** 2; if (d < bd) { bd = d; best = name; } }
  return best;
};

const TAG_MAP = [
  [/matcha|tea\s*house|tea\s*room/i, "Matcha"],
  [/bakery|patisserie|boulangerie|bake/i, "Bakery"],
  [/roaster|espresso|specialty|third\s*wave/i, "Specialty Coffee"],
  [/dessert|gelato|ice\s*cream|sweets/i, "Dessert"],
  [/brunch|breakfast/i, "Brunch"],
];

async function overpass() {
  const query = `[out:json][timeout:240];
area["name"="Ontario"]["admin_level"="4"]["boundary"="administrative"]->.on;
(
  node["amenity"="cafe"](area.on);
  way["amenity"="cafe"](area.on);
  node["shop"="coffee"](area.on);
  way["shop"="coffee"](area.on);
);
out center tags;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "sipp-import/1.0 (canada@surayyagroup.com)" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const j = await res.json();
  return j.elements || [];
}

function toPlace(el) {
  const t = el.tags || {};
  const name = (t.name || t["name:en"] || "").trim();
  if (!name || CHAINS.test(name)) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const city = (t["addr:city"] || t["addr:town"] || "").trim() || nearestCity(lat, lng);
  const area = (t["addr:suburb"] || t["addr:neighbourhood"] || t["addr:quarter"] || "").trim() || city;
  const tags = new Set(["Specialty Coffee"]);
  const hay = `${name} ${t.cuisine || ""} ${t.shop || ""}`;
  for (const [re, tag] of TAG_MAP) if (re.test(hay)) tags.add(tag);
  return {
    id: `osm-${el.type[0]}${el.id}`,
    google_place_id: null,
    name, area, city, emirate: null, country: "Canada",
    lat, lng, category: "cafe",
    tags: [...tags].slice(0, 4),
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

async function upsert(rows) {
  const res = await fetch(`${SB_URL}/rest/v1/places?on_conflict=id`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert ${res.status} ${await res.text().catch(() => "")}`);
}

(async () => {
  console.log("Querying Overpass for Ontario cafés…");
  const els = await overpass();
  console.log(`OSM returned ${els.length} elements.`);
  const seen = new Set();
  const places = [];
  let chains = 0, noName = 0;
  for (const el of els) {
    const name = (el.tags?.name || "").trim();
    if (name && CHAINS.test(name)) { chains++; continue; }
    const p = toPlace(el);
    if (!p) { if (!name) noName++; continue; }
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    places.push(p);
  }
  console.log(`Keeping ${places.length} independent cafés (excluded ${chains} chains, ${noName} unnamed).`);

  let done = 0;
  for (let i = 0; i < places.length; i += 400) {
    await upsert(places.slice(i, i + 400));
    done += Math.min(400, places.length - i);
    console.log(`  upserted ${done}/${places.length}`);
  }
  // city breakdown
  const byCity = {};
  places.forEach((p) => (byCity[p.city] = (byCity[p.city] || 0) + 1));
  console.log("Top cities:", Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 10));
  console.log("DONE.");
})();
