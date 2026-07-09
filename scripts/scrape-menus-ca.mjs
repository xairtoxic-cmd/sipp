// Canadian café menu scraper: fetch each café's own website, find its menu
// page, extract "Item ... $4.50" pairs, store into places.menu (shape matches
// the mobile UI: [{ category, items: [{ name, price }] }]). Sites with PDF/
// image/JS-only menus yield nothing and stay null — the app then hides the
// menu section (real menus only, never fake).
// Run: node scripts/scrape-menus-ca.mjs   (SUPA_PW from env or ../.env.local)
import pg from "pg";
import fs from "fs";

let PW = process.env.SUPA_PW;
if (!PW) {
  try { PW = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^SUPA_PW=(.+)$/m)?.[1]?.trim(); } catch {}
}
if (!PW) { console.error("Need SUPA_PW"); process.exit(1); }

const client = new pg.Client({ host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432, user: "postgres.viektinnderxgfddmnhn", password: PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

async function fetchText(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; SippBot/1.0)" } });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("text/html")) return null;
    return await res.text();
  } catch { return null; } finally { clearTimeout(t); }
}

const htmlToText = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();

function findMenuLink(html, base) {
  const re = /href\s*=\s*["']([^"']*menu[^"']*)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (/\.(pdf|jpe?g|png)(\?|$)/i.test(href)) continue;
    try { return new URL(href, base).href; } catch {}
  }
  return null;
}

// "Latte ... $5.25" / "Latte — 5.25" style pairs (CAD).
function extractItems(text) {
  const items = [];
  const seen = new Set();
  const re = /([A-Z][A-Za-z'&(),./ -]{2,44}?)\s*[–—\-:.…]*\s*(?:CA?\$|\$)\s?(\d{1,3}(?:\.\d{2})?)\b/g;
  let m;
  while ((m = re.exec(text)) && items.length < 40) {
    const name = m[1].trim().replace(/\s+/g, " ");
    const price = parseFloat(m[2]);
    if (name.length < 3 || /\d/.test(name) || price < 1.5 || price > 200) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ name, price: Number.isInteger(price) ? price : price.toFixed(2) });
  }
  return items;
}

async function scrapeOne(p) {
  const base = p.website.startsWith("http") ? p.website : "https://" + p.website;
  let html = await fetchText(base);
  let source = base;
  if (html) {
    const menuUrl = findMenuLink(html, base);
    if (menuUrl && menuUrl !== base) {
      const mh = await fetchText(menuUrl);
      if (mh) { html = mh; source = menuUrl; }
    }
  }
  const items = html ? extractItems(htmlToText(html)) : [];
  if (items.length >= 6) {
    await client.query("update places set menu=$2, menu_source=$3 where id=$1", [p.id, JSON.stringify([{ category: "Menu", items }]), source]);
    return items.length;
  }
  return 0;
}

async function main() {
  await client.connect();
  const { rows } = await client.query("select id, name, website from places where country='Canada' and category='cafe' and is_active=true and website is not null and website <> '' and menu is null");
  console.log(`targets: ${rows.length}`);
  let done = 0, found = 0;
  const CONC = 8;
  let idx = 0;
  async function worker() {
    while (idx < rows.length) {
      const p = rows[idx++];
      try {
        const n = await scrapeOne(p);
        if (n) { found++; console.log(`MENU ${p.name} (${n} items)`); }
      } catch {}
      done++;
      if (done % 200 === 0) console.log(`progress ${done}/${rows.length}, menus ${found}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`DONE. scanned ${done}, menus stored ${found}`);
  await client.end();
}
main().catch((e) => { console.error("SCRAPE_FAIL", e.message); process.exit(2); });
