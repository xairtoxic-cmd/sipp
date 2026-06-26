// Free, category-matched stock photos for every place (Unsplash hot-link, no key,
// no cost). Each place gets an image that fits its TYPE — specialty coffee, fine
// dining, sushi, pizza, bakery, etc. — so the catalogue looks intentional, not random.
//
// Real per-venue photos are a paid feature everywhere (Google/Foursquare charge,
// Wikimedia only returns nearby skyline junk), so this is the best $0 result.
//
// Every candidate image is verified (HTTP HEAD) before use; dead ids are dropped
// and that theme falls back to its safe generic pool.
//
// Usage:
//   node scripts/backfill-stock-photos.mjs            # all places
//   node scripts/backfill-stock-photos.mjs --limit=20 # test run
//   node scripts/backfill-stock-photos.mjs --only-stock  # only places that have no/Unsplash image

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing Supabase URL / service-role key in .env.local");

const args = process.argv.slice(2);
const MAX = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0", 10) || Infinity;
const ONLY_STOCK = args.includes("--only-stock");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const U = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

// Candidate Unsplash photo ids per theme (verified at runtime).
const POOLS = {
  coffee: ["1495474472287-4d71bcdd2085","1442512595331-e89e73853f31","1501339847302-ac426a4a7cbb","1453614512568-c4024d13c247","1521017432531-fbd92d768814","1559496417-e7f25cb247f3","1554118811-1e0d58224f24","1509042239860-f550ce710b93","1447933601403-0c6688de566e","1517701550927-30cf4ba1dba5"],
  matcha: ["1536256263959-770b48d82b0a","1515823662972-da6a2e4d3002","1464965911861-746a04b4bca6","1592318951566-71f5f5f0f5f5"],
  bakery: ["1509440159596-0249088772ff","1555507036-ab1f4038808a","1517433670267-08bbd4be890f","1486427944299-d1955d23e34d","1568254183919-78a4f43a2877"],
  finedining: ["1414235077428-338989a2e8c0","1517248135467-4c7edcad34c4","1559339352-11d035aa65de","1551218808-94e220e084d2","1546069901-ba9599a7e63c","1504674900247-0877df9cc836","1424847651672-bf20a4b0982b","1540189549336-e6e99c3679fe"],
  sushi: ["1553621042-f6e147245754","1579584425555-c3ce17fd4351","1611143669185-af224c5e3252","1617196034796-73dfa7b1fd56"],
  pizza: ["1513104890138-7c749659a591","1565299624946-b28f40a0ae38","1574071318508-1cdbab80d002","1604382354936-07c5d9983bd3"],
  burger: ["1568901346375-23c9450c58cd","1571091718767-18b5b1457add","1550547660-d9450f859349","1586190848861-99aa4a171e90"],
  pasta: ["1473093295043-cdd812d0e601","1551183053-bf91a1d81141","1556761223-4c4282c73f77","1621996346565-e3dbc646d9a9"],
  indian: ["1585937421612-70a008356fbe","1505253758473-96b7015fcd40","1596797038530-2c107229654b","1631515243349-e0cb75fb8d3a"],
};

// First matching rule wins (most specific → generic).
const RULES = [
  [/bakery|pastr|dessert/i, "bakery"],
  [/matcha/i, "matcha"],
  [/sushi|japanese/i, "sushi"],
  [/pizza/i, "pizza"],
  [/burger/i, "burger"],
  [/ital|pasta/i, "pasta"],
  [/indian|curry/i, "indian"],
];

function themeFor(place) {
  const hay = [(place.tags || []).join(" "), place.name].join(" ");
  for (const [re, theme] of RULES) if (re.test(hay)) return theme;
  return place.category === "fine_dining" ? "finedining" : "coffee";
}

// deterministic pick so the same place is stable across re-runs
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

async function verify(id) {
  try {
    const r = await fetch(`https://images.unsplash.com/photo-${id}?w=20`, { method: "HEAD" });
    return r.ok;
  } catch { return false; }
}

async function loadPlaces() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("places").select("id,name,category,tags,image_url").order("id").range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

(async () => {
  // verify every candidate id, prune dead ones
  console.log("Verifying image pools…");
  const valid = {};
  for (const [theme, ids] of Object.entries(POOLS)) {
    const ok = [];
    for (const id of ids) if (await verify(id)) ok.push(id);
    valid[theme] = ok;
    console.log(`  ${theme}: ${ok.length}/${ids.length} valid`);
  }
  // any theme that ended up thin falls back to a safe generic pool
  const genericFood = valid.finedining.length ? valid.finedining : valid.coffee;
  for (const t of Object.keys(POOLS)) {
    if (valid[t].length < 2) valid[t] = t === "coffee" ? valid.coffee : (t === "matcha" ? valid.coffee : genericFood);
  }
  if (!valid.coffee.length) throw new Error("No valid coffee images — aborting (check connectivity).");

  const places = await loadPlaces();
  const todo = ONLY_STOCK ? places.filter((p) => !p.image_url || /unsplash/.test(p.image_url)) : places;
  console.log(`${places.length} places, ${todo.length} to update.`);

  let n = 0;
  for (const p of todo) {
    if (n >= MAX) break;
    const theme = themeFor(p);
    const pool = valid[theme]?.length ? valid[theme] : valid.coffee;
    const url = U(pool[hash(p.id + theme) % pool.length]);
    const { error } = await supabase.from("places").update({ image_url: url }).eq("id", p.id);
    if (error) { console.warn("  !", p.name, error.message); continue; }
    n++;
    if (n % 100 === 0) console.log(`  ${n} updated…`);
  }
  console.log(`Done. updated=${n}`);
})();
