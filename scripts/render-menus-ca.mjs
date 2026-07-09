// JS-rendered menu extraction — the pass for cafés whose menus live behind
// JavaScript (Square, Toast, SPA sites). These are the same menus Google's
// "Menu" tab displays; we take them from the source (the café's own site and
// its linked ordering page) instead of scraping Google. Headless Chrome
// renders the page, Haiku extracts a structured menu, same validation as the
// earlier passes. Budget-capped.
// Run: node scripts/render-menus-ca.mjs   (keys from ../.env.local)
import Anthropic from "@anthropic-ai/sdk";
import puppeteer from "puppeteer";
import pg from "pg";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);

const BUDGET_USD = 25;
const MODEL = "claude-haiku-4-5";
let inTok = 0, outTok = 0;
const cost = () => (inTok / 1e6) * 1 + (outTok / 1e6) * 5;

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const client = new pg.Client({ host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432, user: "postgres.viektinnderxgfddmnhn", password: env.SUPA_PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

// Ordering platforms whose pages are the merchant's own storefront.
const ORDER_HOSTS = /square\.site|squareup\.com|toasttab\.com|clover\.com/i;

async function renderPage(browser, url, ms = 25000) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36");
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: ms });
    await new Promise((r) => setTimeout(r, 1500)); // late JS
    const text = await page.evaluate(() => document.body?.innerText || "");
    const links = await page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).map((a) => a.href));
    return { text: text.replace(/\s+/g, " ").trim(), links };
  } catch { return null; } finally { await page.close().catch(() => {}); }
}

function pickMenuLink(links, baseHost) {
  const scored = links
    .filter((h) => /^https?:/i.test(h))
    .map((h) => {
      let score = 0;
      if (/menu/i.test(h)) score += 2;
      if (/order/i.test(h)) score += 1;
      if (ORDER_HOSTS.test(h)) score += 2;
      try { if (new URL(h).host === baseHost) score += 1; } catch {}
      if (/\.(pdf|jpe?g|png)(\?|$)/i.test(h)) score = 0;
      if (/facebook|instagram|twitter|tiktok|ubereats|doordash|skipthedishes|grubhub/i.test(h)) score = 0;
      return { h, score };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.h || null;
}

const SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, price: { type: "number" } }, required: ["name", "price"], additionalProperties: false } },
  },
  required: ["found", "items"],
  additionalProperties: false,
};
const BAN = /shipping|sale price|cart|sold out|subscri|gift card|wholesale|bundle|delivery fee|coupon|promo|newsletter|kit\b|pack\b|\bkg\b|capsule|pod\b|grinder|machine|merch|t-shirt|mug\b|tote/i;

async function aiExtract(name, text) {
  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{
      role: "user",
      content: `This is rendered text from the website/online-ordering page of "${name}", a café in Canada. Extract their real food & drink MENU items with CAD prices. Only actual menu items served at the café — NOT retail products (coffee bags, equipment, merch, subscriptions). Prices per item, CAD $1.50–$35. If no real menu, return found=false. Max 40 items.\n\nPAGE TEXT:\n${text.slice(0, 11000)}`,
    }],
  });
  inTok += resp.usage.input_tokens;
  outTok += resp.usage.output_tokens;
  const tb = resp.content.find((b) => b.type === "text");
  if (!tb) return null;
  try { return JSON.parse(tb.text); } catch { return null; }
}

async function processOne(browser, p) {
  const base = p.website.startsWith("http") ? p.website : "https://" + p.website;
  let baseHost = "";
  try { baseHost = new URL(base).host; } catch {}
  const home = await renderPage(browser, base);
  if (!home) return 0;
  let text = home.text;
  const menuUrl = pickMenuLink(home.links, baseHost);
  if (menuUrl && menuUrl !== base) {
    const menuPage = await renderPage(browser, menuUrl);
    if (menuPage && menuPage.text.length > 200) text = menuPage.text + " " + text.slice(0, 2000);
  }
  // Cheap pre-filter: only call the AI when the page plausibly contains prices.
  const priceHits = (text.match(/\$\s?\d{1,3}(\.\d{2})?/g) || []).length;
  if (text.length < 300 || priceHits < 4) return 0;

  const data = await aiExtract(p.name, text);
  if (!data?.found || !Array.isArray(data.items)) return 0;
  const seen = new Set();
  const items = data.items
    .filter((it) => it.name && !BAN.test(it.name) && it.price >= 1.5 && it.price <= 35)
    .filter((it) => { const k = it.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 40)
    .map((it) => ({ name: String(it.name).slice(0, 60), price: Number.isInteger(it.price) ? it.price : it.price.toFixed(2) }));
  if (items.length < 5) return 0;
  await client.query("update places set menu=$2, menu_source=$3 where id=$1", [p.id, JSON.stringify([{ category: "Menu", items }]), "js:" + (menuUrl || base)]);
  return items.length;
}

async function main() {
  await client.connect();
  const { rows } = await client.query("select id, name, website from places where country='Canada' and category='cafe' and is_active=true and website is not null and website <> '' and menu is null");
  console.log(`targets: ${rows.length}, budget cap: $${BUDGET_USD}`);
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  let done = 0, found = 0, idx = 0;
  const CONC = 4;
  async function worker() {
    while (idx < rows.length) {
      if (cost() > BUDGET_USD) { console.log(`BUDGET CAP HIT at $${cost().toFixed(2)}`); idx = rows.length; break; }
      const p = rows[idx++];
      try {
        const n = await processOne(browser, p);
        if (n) { found++; console.log(`MENU ${p.name} (${n} items)`); }
      } catch (e) {
        if (e?.status === 429) { await new Promise((r) => setTimeout(r, 30000)); idx--; continue; }
      }
      done++;
      if (done % 100 === 0) console.log(`progress ${done}/${rows.length}, menus ${found}, spend $${cost().toFixed(2)}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  await browser.close();
  console.log(`DONE. scanned ${done}, menus stored ${found}, total spend $${cost().toFixed(2)}`);
  await client.end();
}
main().catch((e) => { console.error("FAIL", e.message); process.exit(2); });
