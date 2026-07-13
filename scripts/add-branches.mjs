// Add ALL branches of a brand to Sipp — searches Google Places for up to 20
// matches, filters to names containing the brand, skips ones already in the DB,
// and inserts the rest with photos + derived signals (same row shape as add-place).
//
// Usage:
//   node scripts/add-branches.mjs --query="Heal Wellness" --city=Toronto
//   node scripts/add-branches.mjs --query="Heal Wellness" --region="Greater Toronto Area"   # wider search
//   add --dry to preview without inserting

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
const arg = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const QUERY = arg("query");
const REGION = arg("region") || arg("city") || "Toronto";
const COUNTRY = arg("country") || "Canada";
const DRY = args.includes("--dry");
if (!QUERY) { console.error("Need --query="); process.exit(1); }

const PRICE = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s\-&(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// GTA city bucket from the formatted address, so branches land in the right city filter
const GTA = ["Toronto", "Mississauga", "Brampton", "Vaughan", "Markham", "Richmond Hill", "Oakville", "Burlington", "Scarborough", "Etobicoke", "North York", "Ajax", "Pickering", "Whitby", "Oshawa", "Milton", "Newmarket", "Aurora", "Thornhill", "Woodbridge", "Hamilton", "Guelph", "Kitchener", "Waterloo", "London", "Ottawa", "Barrie"];
const CORE_TO = new Set(["Scarborough", "Etobicoke", "North York"]); // amalgamated → city stays Toronto
const SUBURB = { Maple: "Vaughan", Thornhill: "Vaughan", Woodbridge: "Vaughan", Concord: "Vaughan", Unionville: "Markham" };
function cityFrom(addr) {
  for (const [s, parent] of Object.entries(SUBURB)) if ((addr || "").includes(s)) return parent;
  for (const c of GTA) if ((addr || "").includes(c)) return CORE_TO.has(c) ? "Toronto" : c;
  return "Toronto";
}
function areaFrom(addr) {
  for (const c of GTA) if ((addr || "").includes(c) && CORE_TO.has(c)) return c;
  return null;
}

(async () => {
  const FIELDS = "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.editorialSummary,places.photos,places.reviews,places.priceLevel";
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GKEY, "X-Goog-FieldMask": FIELDS },
    body: JSON.stringify({ textQuery: `${QUERY}, ${REGION}, ${COUNTRY}`, maxResultCount: 20, regionCode: COUNTRY === "Canada" ? "CA" : undefined }),
  });
  const found = (await r.json()).places || [];
  const brand = norm(QUERY);
  const matches = found.filter((gp) => norm(gp.displayName?.text).includes(brand));
  console.log(`"${QUERY}": Google returned ${found.length}, ${matches.length} match the brand name`);

  let added = 0, skipped = 0;
  for (const gp of matches) {
    const dup = await (await fetch(`${SB}/rest/v1/places?select=id,name,is_active&google_place_id=eq.${gp.id}`, { headers: H })).json();
    if (Array.isArray(dup) && dup.length) { console.log(`  = already in app: ${dup[0].name} (active=${dup[0].is_active})`); skipped++; continue; }

    const photoUrls = [];
    if (!DRY) for (const ph of (gp.photos || []).slice(0, 4)) {
      const pr = await fetch(`https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=1000&skipHttpRedirect=true&key=${GKEY}`);
      const pj = await pr.json();
      if (pj.photoUri) photoUrls.push(pj.photoUri);
    }

    const reviews = (gp.reviews || []).map((rv) => rv.text?.text || rv.originalText?.text || "").filter(Boolean);
    const summary = gp.editorialSummary?.text || "";
    const review_keyword_counts = {}, editorial_hits = [];
    for (const [tag, rule] of Object.entries(TAG_RULES)) {
      let n = 0;
      for (const rv of reviews) if (findKeyword(rv, rule.keywords)) n++;
      if (n > 0) review_keyword_counts[tag] = n;
      if (findKeyword(summary, rule.keywords)) editorial_hits.push(tag);
    }

    const row = {
      id: gp.id, google_place_id: gp.id,
      name: titleCase(gp.displayName?.text || QUERY),
      area: areaFrom(gp.formattedAddress), city: cityFrom(gp.formattedAddress), country: COUNTRY,
      lat: gp.location?.latitude ?? null, lng: gp.location?.longitude ?? null,
      category: "cafe", tags: [], is_active: true,
      google_rating: gp.rating ?? null, rating_count: gp.userRatingCount ?? null,
      price_level: PRICE[gp.priceLevel] ?? 2,
      phone: gp.nationalPhoneNumber || null, website: gp.websiteUri || null,
      google_maps_url: gp.googleMapsUri || null,
      blurb: summary || null,
      photos: photoUrls, image_url: photoUrls[0] || null,
      google_signals: {
        place_id: gp.id, types: gp.types || [], primary_type_google: gp.primaryType || null,
        website: gp.websiteUri || null, rating: gp.rating || null, user_ratings: gp.userRatingCount || null,
        review_count_seen: reviews.length, review_keyword_counts, editorial_hits, fetched_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (DRY) { console.log(`  + would add: ${row.name} | ${gp.formattedAddress} → ${row.area ? row.area + ", " : ""}${row.city}`); added++; continue; }
    const ins = await fetch(`${SB}/rest/v1/places`, { method: "POST", headers: { ...H, Prefer: "return=minimal" } , body: JSON.stringify(row) });
    if (!ins.ok) { console.log(`  ✗ insert failed for ${row.name}: ${(await ins.text()).slice(0, 200)}`); continue; }
    console.log(`  + ADDED: ${row.name} | ${gp.formattedAddress} → ${row.area ? row.area + ", " : ""}${row.city} · ★${row.google_rating} (${row.rating_count}) · ${photoUrls.length} photos`);
    added++;
  }
  console.log(`\n${QUERY}: added ${added}, already present ${skipped}`);
})();
