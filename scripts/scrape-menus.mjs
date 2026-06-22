// Best-effort menu scraper: fetch each fine-dining website, find a menu page,
// extract item + price pairs, store into places.menu. Many sites won't yield
// usable data (PDF/JS/image menus) — those are left null (UI falls back to a link).
import pg from "pg";

const PW = process.env.SUPA_PW;
const client = new pg.Client({ host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432, user: "postgres.viektinnderxgfddmnhn", password: PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

async function fetchText(url, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 SippBot" } });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok || !ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMenuLink(html, base) {
  const re = /href\s*=\s*["']([^"']*menu[^"']*)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1];
    if (href.toLowerCase().endsWith(".pdf")) continue;
    try {
      return new URL(href, base).href;
    } catch {}
  }
  return null;
}

// Pull "Item name … AED 120" style pairs.
function extractItems(text) {
  const items = [];
  const seen = new Set();
  const re = /([A-Z][A-Za-z'&., ]{3,48}?)\s*[–—\-:.]*\s*(?:AED|Dhs?|د\.إ)\s?(\d{2,4})(?:\.\d{1,2})?/g;
  let m;
  while ((m = re.exec(text)) && items.length < 30) {
    const name = m[1].trim().replace(/\s+/g, " ");
    const price = parseInt(m[2], 10);
    if (name.length < 3 || /\d/.test(name) || price < 10 || price > 5000) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ name, price });
  }
  return items;
}

async function main() {
  await client.connect();
  const { rows } = await client.query("select id, name, website from places where category='fine_dining' and website is not null");
  let done = 0, found = 0;
  for (const p of rows) {
    done++;
    const base = p.website.startsWith("http") ? p.website : "https://" + p.website;
    let html = await fetchText(base);
    let source = base;
    if (html) {
      const menuUrl = findMenuLink(html, base);
      if (menuUrl) {
        const mh = await fetchText(menuUrl);
        if (mh) { html = mh; source = menuUrl; }
      }
    }
    const items = html ? extractItems(htmlToText(html)) : [];
    if (items.length >= 5) {
      await client.query("update places set menu=$2, menu_source=$3 where id=$1", [p.id, JSON.stringify([{ section: "Menu", items }]), source]);
      found++;
      console.log(`✓ ${p.name} — ${items.length} items`);
    }
    if (done % 20 === 0) console.log(`...scanned ${done}/${rows.length}, menus ${found}`);
  }
  console.log(`DONE. scanned ${done}, menus stored ${found}`);
  await client.end();
}
main().catch((e) => { console.error("SCRAPE_FAIL", e.message); process.exit(2); });
