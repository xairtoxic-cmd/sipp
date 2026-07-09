// AI menu extraction pass — Canadian cafés whose sites defeated the regex
// scraper. Fetches each café's site text and has Claude Haiku 4.5 extract a
// structured menu (guaranteed-JSON via output_config.format). Costs real API
// credits: hard budget cap below aborts the run if estimated spend exceeds it.
// Run: node scripts/ai-menus-ca.mjs   (keys from ../.env.local)
import Anthropic from "@anthropic-ai/sdk";
import pg from "pg";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);

const BUDGET_USD = 25; // hard cap — abort before exceeding
const MODEL = "claude-haiku-4-5"; // $1/M in, $5/M out
let inTok = 0, outTok = 0;
const cost = () => (inTok / 1e6) * 1 + (outTok / 1e6) * 5;

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const client = new pg.Client({ host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432, user: "postgres.viektinnderxgfddmnhn", password: env.SUPA_PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

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
    if (/\.(pdf|jpe?g|png)(\?|$)/i.test(m[1])) continue;
    try { return new URL(m[1], base).href; } catch {}
  }
  return null;
}

const SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, price: { type: "number" } },
        required: ["name", "price"],
        additionalProperties: false,
      },
    },
  },
  required: ["found", "items"],
  additionalProperties: false,
};

const BAN = /shipping|sale price|cart|sold out|subscri|gift card|wholesale|bundle|delivery fee|coupon|promo|newsletter|kit\b|pack\b|\bkg\b|capsule|pod\b|grinder|machine|merch|t-shirt|mug\b|tote/i;

async function extractOne(p) {
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
  if (!html) return 0;
  const text = htmlToText(html).slice(0, 9000);
  if (text.length < 300) return 0;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{
      role: "user",
      content: `This is text from the website of "${p.name}", a café in Canada. Extract their real food & drink MENU items with CAD prices. Rules: only actual menu items served at the café (drinks, food, pastries) — NOT retail products (coffee bags, equipment, merch, subscriptions). Prices must be per-item CAD between $1.50 and $35. If the text contains no real menu, return found=false with empty items. Max 40 items.\n\nWEBSITE TEXT:\n${text}`,
    }],
  });
  inTok += resp.usage.input_tokens;
  outTok += resp.usage.output_tokens;

  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock) return 0;
  let data;
  try { data = JSON.parse(textBlock.text); } catch { return 0; }
  if (!data.found || !Array.isArray(data.items)) return 0;

  const seen = new Set();
  const items = data.items
    .filter((it) => it.name && !BAN.test(it.name) && it.price >= 1.5 && it.price <= 35)
    .filter((it) => { const k = it.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 40)
    .map((it) => ({ name: String(it.name).slice(0, 60), price: Number.isInteger(it.price) ? it.price : it.price.toFixed(2) }));
  if (items.length < 5) return 0;

  await client.query("update places set menu=$2, menu_source=$3 where id=$1", [p.id, JSON.stringify([{ category: "Menu", items }]), "ai:" + source]);
  return items.length;
}

async function main() {
  await client.connect();
  const { rows } = await client.query("select id, name, website from places where country='Canada' and category='cafe' and is_active=true and website is not null and website <> '' and menu is null");
  console.log(`targets: ${rows.length}, budget cap: $${BUDGET_USD}`);
  let done = 0, found = 0, idx = 0;
  const CONC = 5;
  async function worker() {
    while (idx < rows.length) {
      if (cost() > BUDGET_USD) { console.log(`BUDGET CAP HIT at $${cost().toFixed(2)} — stopping`); idx = rows.length; break; }
      const p = rows[idx++];
      try {
        const n = await extractOne(p);
        if (n) { found++; console.log(`MENU ${p.name} (${n} items)`); }
      } catch (e) {
        if (e?.status === 429) { await new Promise((r) => setTimeout(r, 30000)); idx--; continue; }
      }
      done++;
      if (done % 100 === 0) console.log(`progress ${done}/${rows.length}, menus ${found}, spend $${cost().toFixed(2)}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`DONE. scanned ${done}, menus stored ${found}, total spend $${cost().toFixed(2)} (${inTok} in / ${outTok} out tokens)`);
  await client.end();
}
main().catch((e) => { console.error("FAIL", e.message); process.exit(2); });
