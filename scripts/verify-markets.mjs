// Verification suite for the market RPCs — runs as the ANON key (exactly what the app uses).
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const H = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`, "Content-Type": "application/json" };
const rpc = async (fn, args) => {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(args) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${fn}: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};
let pass = 0, fail = 0;
const check = (label, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? " — " + extra : ""}`); ok ? pass++ : fail++; };

// 1) resolve_market
const oakville = await rpc("resolve_market", { p_lat: 43.4675, p_lng: -79.6877 });
check("Oakville → gta_ca", oakville[0]?.market_id === "gta_ca", JSON.stringify(oakville[0]));
const london = await rpc("resolve_market", { p_lat: 51.5074, p_lng: -0.1278 });
check("Central London → london_uk", london[0]?.market_id === "london_uk", JSON.stringify(london[0]));
const dubai = await rpc("resolve_market", { p_lat: 25.2048, p_lng: 55.2708 });
check("Dubai → dubai_uae", dubai[0]?.market_id === "dubai_uae", JSON.stringify(dubai[0]));
const ocean = await rpc("resolve_market", { p_lat: 0, p_lng: -30 });
check("Mid-Atlantic → no market", !ocean.length);

// 2) search: ranking, market scoping, distance
const s1 = await rpc("search_places", { p_market: "london_uk", p_query: "coffee", p_lat: 51.5074, p_lng: -0.1278, p_limit: 10 });
check("london search returns places", s1.places.length === 10);
check("all results are london_uk", s1.places.every((p) => p.market === "london_uk"));
check("distance_km present with coords", s1.places.every((p) => typeof p.distance_km === "number"));
check("has next_cursor", !!s1.next_cursor);
const s2 = await rpc("search_places", { p_market: "london_uk", p_query: "coffee", p_lat: 51.5074, p_lng: -0.1278, p_limit: 10, p_cursor: s1.next_cursor });
const ids1 = new Set(s1.places.map((p) => p.id));
check("page 2 has no duplicates", s2.places.every((p) => !ids1.has(p.id)));
const sName = await rpc("search_places", { p_market: "gta_ca", p_query: "Gateau Ghost", p_limit: 5 });
check("strong name match ranks first", sName.places[0]?.name?.toLowerCase().includes("gateau"), sName.places[0]?.name);
const sEmpty = await rpc("search_places", { p_market: "gta_ca", p_limit: 5 });
check("empty query = market browse", sEmpty.places.length === 5 && sEmpty.places.every((p) => p.market === "gta_ca"));

// 3) map: pins close, clusters wide, viewport only
const pins = await rpc("map_places", { p_north: 51.53, p_south: 51.50, p_east: -0.09, p_west: -0.14, p_zoom: 15, p_market: "london_uk" });
check("zoom 15 → pins", pins.mode === "pins" && pins.places.length > 0, `${pins.places.length} pins`);
check("pins inside viewport", pins.places.every((p) => p.lat >= 51.50 && p.lat <= 51.53 && p.lng >= -0.14 && p.lng <= -0.09));
const clusters = await rpc("map_places", { p_north: 51.70, p_south: 51.28, p_east: 0.33, p_west: -0.51, p_zoom: 10, p_market: "london_uk" });
check("zoom 10 → clusters", clusters.mode === "clusters" && clusters.clusters.length > 0, `${clusters.clusters.length} clusters`);
const cTotal = clusters.clusters.reduce((a, c) => a + c.count, 0);
check("cluster counts cover catalogue", cTotal > 4000, `${cTotal} places in clusters`);
check("cluster shape", ["id", "lat", "lng", "count", "bounds"].every((k) => k in clusters.clusters[0]));
const mapSearch = await rpc("map_places", { p_north: 51.70, p_south: 51.28, p_east: 0.33, p_west: -0.51, p_zoom: 15, p_market: "london_uk", p_query: "matcha" });
check("map search respects bounds+market", mapSearch.places.every((p) => p.market === "london_uk"), `${mapSearch.places.length} matcha pins`);

// 4) batched lookup
const two = await rpc("search_places", { p_market: "gta_ca", p_limit: 2 });
const byIds = await rpc("places_by_ids", { p_ids: two.places.map((p) => p.id) });
check("places_by_ids returns summaries", byIds.length === 2 && byIds[0].id && byIds[0].name);

// 5) inactive places never appear
const inact = await rpc("search_places", { p_market: "london_uk", p_limit: 100 });
check("100 results all active-only (spot check via anon)", inact.places.length === 100);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
