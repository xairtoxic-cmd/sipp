// Vision rescue pass — cafés whose menus resisted text extraction. Two new
// weapons: (1) PDF menus are downloaded and read directly by Claude,
// (2) otherwise the rendered menu page is SCREENSHOTTED and read visually.
// Same validation + budget cap as prior passes.
// Run: node scripts/vision-menus-ca.mjs
import Anthropic from "@anthropic-ai/sdk";
import puppeteer from "puppeteer";
import pg from "pg";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);

const BUDGET_USD = 20;
const MODEL = "claude-haiku-4-5";
let inTok = 0, outTok = 0;
const cost = () => (inTok / 1e6) * 1 + (outTok / 1e6) * 5;

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const client = new pg.Client({ host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432, user: "postgres.viektinnderxgfddmnhn", password: env.SUPA_PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

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
const RULES = (name) => `These are from the website of "${name}", a café in Canada. Extract their real food & drink MENU items with CAD prices. Only actual menu items served at the café — NOT retail products (coffee bags, equipment, merch, subscriptions). Prices per item, CAD $1.50–$35. If no real menu is visible, return found=false. Max 40 items.`;

async function aiExtract(name, blocks) {
  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: [...blocks, { type: "text", text: RULES(name) }] }],
  });
  inTok += resp.usage.input_tokens;
  outTok += resp.usage.output_tokens;
  const tb = resp.content.find((b) => b.type === "text");
  try { return JSON.parse(tb.text); } catch { return null; }
}

function validate(data) {
  if (!data?.found || !Array.isArray(data.items)) return null;
  const seen = new Set();
  const items = data.items
    .filter((it) => it.name && !BAN.test(it.name) && it.price >= 1.5 && it.price <= 35)
    .filter((it) => { const k = it.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 40)
    .map((it) => ({ name: String(it.name).slice(0, 60), price: Number.isInteger(it.price) ? it.price : it.price.toFixed(2) }));
  return items.length >= 5 ? items : null;
}

async function fetchPdf(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; SippBot/1.0)" } });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024 || buf.length < 1000) return null;
    if (buf.slice(0, 4).toString() !== "%PDF") return null;
    return buf.toString("base64");
  } catch { return null; }
}

async function processOne(browser, p) {
  const base = p.website.startsWith("http") ? p.website : "https://" + p.website;
  const page = await browser.newPage();
  try {
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36");
    await page.setViewport({ width: 1280, height: 1400 });
    await page.goto(base, { waitUntil: "networkidle2", timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1200));
    const links = await page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).map((a) => a.href));

    // 1) PDF menu? Read it directly.
    const pdfLink = links.find((h) => /menu/i.test(h) && /\.pdf(\?|$)/i.test(h));
    if (pdfLink) {
      const b64 = await fetchPdf(pdfLink);
      if (b64) {
        const items = validate(await aiExtract(p.name, [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }]));
        if (items) {
          await client.query("update places set menu=$2, menu_source=$3 where id=$1", [p.id, JSON.stringify([{ category: "Menu", items }]), "pdf:" + pdfLink]);
          return items.length;
        }
      }
    }

    // 2) Otherwise: screenshot the menu page (or homepage) and read it visually.
    const menuLink = links.find((h) => /menu/i.test(h) && !/\.(pdf|jpe?g|png)(\?|$)/i.test(h) && !/facebook|instagram|ubereats|doordash|skipthedishes/i.test(h));
    if (menuLink && menuLink !== base) {
      try { await page.goto(menuLink, { waitUntil: "networkidle2", timeout: 25000 }); await new Promise((r) => setTimeout(r, 1200)); } catch {}
    }
    const shots = [];
    shots.push(await page.screenshot({ type: "jpeg", quality: 70 }));
    await page.evaluate(() => window.scrollBy(0, 1300));
    await new Promise((r) => setTimeout(r, 600));
    shots.push(await page.screenshot({ type: "jpeg", quality: 70 }));
    const blocks = shots.map((s) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: s.toString("base64") } }));
    const items = validate(await aiExtract(p.name, blocks));
    if (items) {
      await client.query("update places set menu=$2, menu_source=$3 where id=$1", [p.id, JSON.stringify([{ category: "Menu", items }]), "vision:" + (menuLink || base)]);
      return items.length;
    }
    return 0;
  } catch { return 0; } finally { await page.close().catch(() => {}); }
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
