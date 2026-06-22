// Curated UAE import: cafés + fine dining from Google Places → Supabase `places`.
// Run: GOOGLE_MAPS_API_KEY=... SUPA_PW=... node scripts/import-uae.mjs
import pg from "pg";

const KEY = process.env.GOOGLE_MAPS_API_KEY;
const PW = process.env.SUPA_PW;
if (!KEY || !PW) { console.error("Need GOOGLE_MAPS_API_KEY and SUPA_PW"); process.exit(1); }

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const PRICE = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };

const CAFE_HINTS = ["cafe", "coffee", "matcha", "brunch", "bakery", "patisserie", "dessert", "tea", "roaster", "espresso"];
const FINE_HINTS = ["fine dining", "tasting", "michelin", "chef", "rooftop", "steak", "omakase", "brasserie", "grill", "lounge"];

// city -> { emirate, areas }
const PLACES = {
  Dubai: { emirate: "Dubai", areas: ["Al Quoz", "Alserkal Avenue", "Jumeirah", "Al Wasl", "Downtown Dubai", "DIFC", "Business Bay", "City Walk", "Dubai Marina", "JBR", "Palm Jumeirah", "Umm Suqeim", "Al Barsha", "JLT", "Dubai Hills", "Deira", "Bur Dubai", "Mirdif", "Dubai Creek Harbour"] },
  "Abu Dhabi": { emirate: "Abu Dhabi", areas: ["Abu Dhabi Corniche", "Al Maryah Island", "Saadiyat Island", "Yas Island", "Khalifa City", "Al Reem Island"] },
  Sharjah: { emirate: "Sharjah", areas: ["Al Majaz", "Al Qasba", "Sharjah"] },
  Ajman: { emirate: "Ajman", areas: ["Ajman"] },
  "Ras Al Khaimah": { emirate: "Ras Al Khaimah", areas: ["Ras Al Khaimah", "Al Hamra"] },
  Fujairah: { emirate: "Fujairah", areas: ["Fujairah"] },
  "Umm Al Quwain": { emirate: "Umm Al Quwain", areas: ["Umm Al Quwain"] },
  "Al Ain": { emirate: "Al Ain", areas: ["Al Ain"] },
};

const QUERIES = [
  { q: "specialty coffee", cat: "cafe" },
  { q: "best cafe", cat: "cafe" },
  { q: "fine dining restaurant", cat: "fine_dining" },
];

async function textSearch(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours.openNow,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus,places.photos",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 20, regionCode: "AE" }),
  });
  const data = await res.json();
  return data.places || [];
}

async function resolvePhoto(name) {
  try {
    const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=900&skipHttpRedirect=true&key=${KEY}`);
    const d = await r.json();
    return d.photoUri || null;
  } catch { return null; }
}

function categorize(p, queryCat) {
  const n = (p.displayName?.text || "").toLowerCase();
  const t = (p.types || []).join(" ").toLowerCase();
  const isCafe = CAFE_HINTS.some((h) => n.includes(h) || t.includes(h)) || (p.types || []).includes("cafe") || (p.types || []).includes("coffee_shop") || (p.types || []).includes("bakery");
  const price = PRICE[p.priceLevel] || 0;
  const fineSignal = FINE_HINTS.some((h) => n.includes(h)) || price >= 3 || (p.types || []).includes("fine_dining_restaurant");
  if (queryCat === "fine_dining") {
    if (((p.types || []).includes("restaurant") || (p.types || []).includes("fine_dining_restaurant")) && fineSignal && !isCafe) return "fine_dining";
    return null;
  }
  return isCafe ? "cafe" : null;
}

function buildTags(p, cat) {
  const n = (p.displayName?.text || "").toLowerCase();
  const price = PRICE[p.priceLevel] || 0;
  const tags = [];
  if (cat === "cafe") {
    tags.push("Specialty Coffee");
    if (n.includes("matcha")) tags.push("Matcha");
    if (n.includes("brunch")) tags.push("Brunch");
    if (n.includes("bakery") || n.includes("bake") || n.includes("patisserie")) tags.push("Bakery");
    if (n.includes("dessert") || n.includes("sweet")) tags.push("Dessert");
  } else {
    tags.push("Fine Dining");
    if (price >= 4) tags.push("Luxury");
    if (n.includes("rooftop")) tags.push("Rooftop");
    if (n.includes("beach") || n.includes("marina") || n.includes("pier") || n.includes("waterfront")) tags.push("Waterfront");
    if (n.includes("tasting") || n.includes("omakase")) tags.push("Tasting Menu");
    if (tags.length < 3) tags.push("Date Night");
  }
  return [...new Set(tags)].slice(0, 4);
}

function curated(p, cat) {
  if (p.businessStatus === "CLOSED_PERMANENTLY") return false;
  const r = p.rating || 0, n = p.userRatingCount || 0;
  if (!p.location) return false;
  if (cat === "cafe") return r >= 4.2 && n >= 60;
  return r >= 4.3 && n >= 120;
}

const client = new pg.Client({ host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432, user: "postgres.viektinnderxgfddmnhn", password: PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

async function main() {
  await client.connect();
  await client.query("alter table places add column if not exists open_now boolean default true;");
  const seen = new Set();
  let kept = 0, scanned = 0;

  for (const [city, { emirate, areas }] of Object.entries(PLACES)) {
    for (const area of areas) {
      for (const { q, cat: qcat } of QUERIES) {
        let results = [];
        try { results = await textSearch(`${q} in ${area}, ${city}, UAE`); } catch (e) { continue; }
        scanned += results.length;
        for (const p of results) {
          if (seen.has(p.id)) continue;
          const cat = categorize(p, qcat);
          if (!cat || !curated(p, cat)) continue;
          seen.add(p.id);
          const image = p.photos?.[0]?.name ? await resolvePhoto(p.photos[0].name) : null;
          const tags = buildTags(p, cat);
          const sipp = Math.min(9.7, Math.round(((p.rating || 4.3) * 1.9 + 0.3) * 10) / 10);
          await client.query(
            `insert into places (id, google_place_id, name, area, city, emirate, country, lat, lng, category, tags, price_level, google_rating, rating_count, sipp_score, phone, website, google_maps_url, image_url, open_now, is_active)
             values ($1,$1,$2,$3,$4,$5,'UAE',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,true)
             on conflict (id) do update set name=excluded.name, area=excluded.area, city=excluded.city, emirate=excluded.emirate, lat=excluded.lat, lng=excluded.lng, category=excluded.category, tags=excluded.tags, price_level=excluded.price_level, google_rating=excluded.google_rating, rating_count=excluded.rating_count, sipp_score=excluded.sipp_score, phone=excluded.phone, website=excluded.website, google_maps_url=excluded.google_maps_url, image_url=coalesce(excluded.image_url, places.image_url), open_now=excluded.open_now`,
            [p.id, p.displayName?.text || "Unknown", area, city, emirate, p.location.latitude, p.location.longitude, cat, tags, PRICE[p.priceLevel] || null, p.rating || null, p.userRatingCount || null, sipp, p.nationalPhoneNumber || null, p.websiteUri || null, p.googleMapsUri || null, image, p.regularOpeningHours?.openNow ?? true]
          );
          kept++;
        }
      }
      console.log(`${city} / ${area} — kept ${kept} so far`);
    }
  }
  const { rows } = await client.query("select category, count(*) from places group by category");
  console.log("DONE. scanned", scanned, "kept", kept, JSON.stringify(rows));
  await client.end();
}
main().catch((e) => { console.error("IMPORT_FAIL", e.message); process.exit(2); });
