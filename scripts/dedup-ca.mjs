// Duplicate café detection — OSM + Google imports sometimes list the same
// place twice. Conservative matching: within 150m AND normalized names equal
// (or one is a prefix of the other, ≥5 chars). Keeps the richer record
// (Google ChIJ id > has image > more ratings), hides the other (is_active=false,
// reversible). Default is REPORT ONLY; pass --apply to hide.
// Run: node scripts/dedup-ca.mjs [--apply]
import pg from "pg";
import fs from "fs";

let PW = process.env.SUPA_PW;
if (!PW) { try { PW = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^SUPA_PW=(.+)$/m)?.[1]?.trim(); } catch {} }
const APPLY = process.argv.includes("--apply");

const client = new pg.Client({ host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432, user: "postgres.viektinnderxgfddmnhn", password: PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
function distM(a, b) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
const nameMatch = (a, b) => {
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a))) return true;
  return false;
};
// Richer record wins: real Google id, then has image, then more ratings.
const score = (p) => (p.id.startsWith("ChIJ") ? 1000 : 0) + (p.image_url ? 100 : 0) + Math.min(99, p.rating_count || 0);

async function main() {
  await client.connect();
  const { rows } = await client.query("select id, name, lat, lng, image_url, rating_count from places where country='Canada' and is_active=true and lat is not null and lng is not null");
  console.log(`checking ${rows.length} active Canadian places (${APPLY ? "APPLY" : "report only"})`);
  rows.forEach((p) => (p.n = norm(p.name)));
  // Grid-bucket by ~0.002° (~200m) so we only compare neighbours.
  const grid = new Map();
  const key = (la, ln) => `${Math.round(la / 0.002)}|${Math.round(ln / 0.002)}`;
  rows.forEach((p) => {
    const k = key(p.lat, p.lng);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(p);
  });
  const hidden = new Set();
  const pairs = [];
  for (const p of rows) {
    if (hidden.has(p.id)) continue;
    const [gy, gx] = key(p.lat, p.lng).split("|").map(Number);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      for (const q of grid.get(`${gy + dy}|${gx + dx}`) || []) {
        if (q.id === p.id || hidden.has(q.id)) continue;
        if (!nameMatch(p.n, q.n)) continue;
        if (distM(p, q) > 150) continue;
        const [keep, hide] = score(p) >= score(q) ? [p, q] : [q, p];
        hidden.add(hide.id);
        pairs.push({ keep: keep.name, keepId: keep.id, hide: hide.name, hideId: hide.id, d: Math.round(distM(p, q)) });
      }
    }
  }
  console.log(`found ${pairs.length} duplicate pairs`);
  pairs.slice(0, 25).forEach((x) => console.log(`  HIDE "${x.hide}" (${x.hideId.slice(0, 10)}…) — keep "${x.keep}" (${x.keepId.slice(0, 10)}…) ${x.d}m apart`));
  if (pairs.length > 25) console.log(`  … and ${pairs.length - 25} more`);
  if (APPLY && pairs.length) {
    const ids = pairs.map((x) => x.hideId);
    await client.query("update places set is_active=false where id = any($1)", [ids]);
    console.log(`APPLIED: hid ${ids.length} duplicates (reversible via is_active=true)`);
  }
  await client.end();
}
main().catch((e) => { console.error("FAIL", e.message); process.exit(2); });
