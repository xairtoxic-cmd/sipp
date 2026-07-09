// Validate scraped Canadian menus: drop e-commerce junk items (shipping,
// "sale price", cart language), then keep the menu only if what's left still
// looks like a café menu (>=6 items, median price <= $20). Junk menus -> null.
import pg from "pg";
import fs from "fs";

let PW = process.env.SUPA_PW;
if (!PW) { try { PW = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^SUPA_PW=(.+)$/m)?.[1]?.trim(); } catch {} }
const client = new pg.Client({ host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432, user: "postgres.viektinnderxgfddmnhn", password: PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

const BAN = /shipping|sale price|add to cart|sold out|subscri|gift card|order online|checkout|wholesale|bundle|delivery|shop now|view cart|coupon|promo|newsletter|sign up|log in|free over|reward|kit\b|pack\b|\bkg\b|capsule|pod\b|grinder|machine|descal|refill|cleaner|filter|cartridge|spare|warranty|brewer/i;

function cleanMenu(menu) {
  if (!Array.isArray(menu)) return null;
  const sections = menu.map((sec) => ({
    category: sec.category || "Menu",
    items: (sec.items || [])
      .filter((it) => it.name && !BAN.test(it.name))
      .map((it) => ({ name: it.name.replace(/\s*(sale price|from|regular price).*$/i, "").replace(/[([{\-–—:]+$/, "").trim(), price: it.price }))
      .filter((it) => it.name.length >= 3 && /[a-z]/i.test(it.name.slice(-2)) && parseFloat(it.price) <= 35),
  })).filter((s) => s.items.length > 0);
  const items = sections.flatMap((s) => s.items);
  if (items.length < 6) return null;
  const prices = items.map((i) => parseFloat(i.price)).filter((p) => !isNaN(p)).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  if (!prices.length || median > 20) return null; // café menus are mostly $3-15
  return sections;
}

async function main() {
  await client.connect();
  const { rows } = await client.query("select id, name, menu from places where country='Canada' and menu is not null");
  let kept = 0, cleaned = 0, dropped = 0;
  for (const p of rows) {
    const next = cleanMenu(p.menu);
    if (!next) {
      await client.query("update places set menu=null, menu_source=null where id=$1", [p.id]);
      dropped++;
    } else {
      const before = p.menu.flatMap((s) => s.items || []).length;
      const after = next.flatMap((s) => s.items).length;
      await client.query("update places set menu=$2 where id=$1", [p.id, JSON.stringify(next)]);
      kept++;
      if (after < before) cleaned++;
    }
  }
  console.log(`kept ${kept} (cleaned ${cleaned}), dropped ${dropped} junk menus`);
  await client.end();
}
main().catch((e) => { console.error("FAIL", e.message); process.exit(2); });
