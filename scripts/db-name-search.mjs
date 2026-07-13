// Quick DB lookup: node scripts/db-name-search.mjs "morning after" "heal" ...
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
for (const q of process.argv.slice(2)) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/places?select=name,area,city,is_active,website&name=ilike.${encodeURIComponent("*" + q + "*")}`;
  const r = await (await fetch(url, { headers: H })).json();
  console.log(`--- "${q}" → ${Array.isArray(r) ? r.length : JSON.stringify(r).slice(0, 200)} ---`);
  if (Array.isArray(r)) for (const p of r) console.log(`  ${p.is_active ? "[active]" : "[HIDDEN]"} ${p.name} | ${p.area || "-"} | ${p.city}`);
}
