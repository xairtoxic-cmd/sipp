// Sipp AI classifier pass — refines the deterministic classification for cafés that
// need a smarter judgement. Sends ONLY derived signals (never raw review text) to an
// LLM and gets back primary_type + tags with confidence/source/evidence. AI tags are
// written with source='ai_classifier' and never overwrite admin/owner-verified tags.
//
// Requires ANTHROPIC_API_KEY (or OPENAI_API_KEY) in .env.local.
//
// Usage:
//   node scripts/ai-classify.mjs --city=Toronto --limit=30 --dry
//   node scripts/ai-classify.mjs --city=Toronto --cap=5      # ~$ token budget

import { readFileSync } from "node:fs";
import { PRIMARY_TYPES, TAG_RULES, round3 } from "./sipp-taxonomy.mjs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;
const GEMKEY = env.GEMINI_API_KEY;
const AKEY = env.ANTHROPIC_API_KEY;
const OKEY = env.OPENAI_API_KEY;
if (!SB || !KEY) throw new Error("Missing Supabase URL / service-role key");
if (!GEMKEY && !AKEY && !OKEY) {
  console.error("\n  AI pass needs an LLM key. Add GEMINI_API_KEY (free — get one at https://aistudio.google.com/app/apikey, it starts with 'AIza'), ANTHROPIC_API_KEY, or OPENAI_API_KEY to Sipp/.env.local, then re-run.\n");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const arg = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const ALL = args.includes("--all"); // every country, no filter
const CITY = arg("city");
const COUNTRY = ALL ? null : (arg("country") || (CITY ? null : "Canada"));
const LIMIT = parseInt(arg("limit") || "0", 10) || Infinity;
const CAP = parseFloat(arg("cap") || "5");
const DRY = args.includes("--dry");
const PENDING = args.includes("--pending"); // only places not yet classified
const IDS = arg("ids"); // comma-separated place ids

const VALID_TAGS = new Set(Object.keys(TAG_RULES));
const SYSTEM = `You categorize cafés for Sipp, a café discovery app. A café has exactly ONE primary_type and MANY tags.
Allowed primary_type: ${PRIMARY_TYPES.join(", ")}.
Allowed tags: ${[...VALID_TAGS].join(", ")}.
Rules:
- Only assign "Specialty Coffee" or "Roastery" with strong evidence (name, or repeated review mentions of pour over / single origin / roasting). Do NOT assign Specialty Coffee just because it is a coffee shop.
- A place can be both (e.g. Matcha + Dessert + Aesthetic). Do not force one.
- confidence 0..1. source is one of: cafe_name, google_review_keyword_signal, public_description, google_category.
- If evidence is weak, return primary_type "Café" and few/no tags.
Return ONLY JSON: {"primary_type","primary_type_confidence","tags":[{"tag","confidence","source","evidence_summary"}],"needs_admin_review"}`;

function userMsg(p) {
  const g = p.google_signals || {};
  return JSON.stringify({
    name: p.name, city: p.city, country: p.country,
    google_types: g.types || [], google_primary_type: g.primary_type_google || null,
    import_tags: p.tags || [], current_primary_type: p.primary_type,
    review_keyword_counts: g.review_keyword_counts || {}, summary_mentions: g.editorial_hits || [],
  });
}

let spent = 0;
async function callGemini(p) {
  const model = arg("model") || "gemini-2.0-flash"; // free tier
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMKEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ parts: [{ text: userMsg(p) }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 800, temperature: 0.2 },
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  const text = (j.candidates?.[0]?.content?.parts || []).map((x) => x.text || "").join("");
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); // free — no spend tracking
}
async function callAnthropic(p) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": AKEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 700, system: SYSTEM, messages: [{ role: "user", content: userMsg(p) }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  // Haiku pricing ~ $1/$5 per Mtok in/out — rough running estimate.
  const u = j.usage || {};
  spent += ((u.input_tokens || 0) * 1 + (u.output_tokens || 0) * 5) / 1e6;
  const text = (j.content || []).map((c) => c.text || "").join("");
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}
async function callOpenAI(p) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OKEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 700, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg(p) }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  const u = j.usage || {};
  spent += ((u.prompt_tokens || 0) * 0.15 + (u.completion_tokens || 0) * 0.6) / 1e6;
  return JSON.parse(j.choices[0].message.content);
}
const classifyAI = GEMKEY ? callGemini : AKEY ? callAnthropic : callOpenAI;
const PROVIDER = GEMKEY ? "Gemini" : AKEY ? "Anthropic" : "OpenAI";

function statusFor(conf, source) {
  if (conf >= 0.9) return "public";
  if (conf >= 0.7) return source === "cafe_name" ? "public" : "needs_admin_review";
  if (conf >= 0.5) return "needs_admin_review";
  return "hidden";
}

async function loadPlaces() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    let url = `${SB}/rest/v1/places?select=id,name,city,country,tags,primary_type,categorization_status,google_signals&is_active=eq.true&order=id`;
    if (COUNTRY) url += `&country=eq.${encodeURIComponent(COUNTRY)}`;
    if (CITY) url += `&city=eq.${encodeURIComponent(CITY)}`;
    url += `&google_signals=not.is.null`; // only AI-process cafés we have signals for
    if (PENDING) url += `&or=(categorization_status.is.null,categorization_status.not.in.(classified,needs_review))`;
    if (IDS) url += `&id=in.(${IDS.split(",").map((s) => `"${s.trim()}"`).join(",")})`;
    const d = await (await fetch(url, { headers: { ...H, Range: `${from}-${from + 999}` } })).json();
    if (!Array.isArray(d) || !d.length) break;
    all.push(...d);
    if (d.length < 1000) break;
  }
  return LIMIT === Infinity ? all : all.slice(0, LIMIT);
}

async function write(p, out) {
  const tags = (out.tags || []).filter((t) => VALID_TAGS.has(t.tag)).map((t) => {
    const c = round3(Math.max(0, Math.min(1, Number(t.confidence) || 0)));
    return { place_id: p.id, tag: t.tag, confidence_score: c, source: "ai_classifier", status: statusFor(c, t.source), evidence_summary: (t.evidence_summary || "").slice(0, 240) };
  }).filter((t) => t.status !== "hidden");
  await fetch(`${SB}/rest/v1/place_tags?place_id=eq.${encodeURIComponent(p.id)}&source=eq.ai_classifier`, { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } });
  if (tags.length) await fetch(`${SB}/rest/v1/place_tags`, { method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(tags) });
  const patch = { admin_review_status: "pending", updated_at: new Date().toISOString() };
  if (PRIMARY_TYPES.includes(out.primary_type) && (out.primary_type_confidence || 0) >= 0.8) patch.primary_type = out.primary_type;
  patch.categorization_status = out.needs_admin_review ? "needs_review" : "classified";
  await fetch(`${SB}/rest/v1/places?id=eq.${encodeURIComponent(p.id)}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  await fetch(`${SB}/rest/v1/category_audit_log`, { method: "POST", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ place_id: p.id, old_primary_type: p.primary_type, new_primary_type: patch.primary_type || p.primary_type, new_tags: tags.map((t) => ({ tag: t.tag, c: t.confidence_score })), changed_by: "ai_classifier" }) });
}

(async () => {
  const places = await loadPlaces();
  console.log(`AI-classifying ${places.length} café(s) via ${PROVIDER}${DRY ? " (dry)" : ""}\n`);
  let ok = 0, err = 0;
  for (const p of places) {
    if (spent > CAP) { console.log(`\n*** Token budget $${CAP} reached (~$${spent.toFixed(3)}). Re-run to continue. ***`); break; }
    try {
      const out = await classifyAI(p);
      const pub = (out.tags || []).filter((t) => (t.confidence || 0) >= 0.7).map((t) => t.tag).join(", ");
      console.log(`  ${p.name} → [${out.primary_type}] ${pub || "—"}${out.needs_admin_review ? "  (review)" : ""}`);
      if (!DRY) await write(p, out);
      ok++;
    } catch (e) { err++; console.log(`  ✗ ${p.name}: ${e.message}`); }
  }
  console.log(`\nDONE. ok=${ok} err=${err} | est spend ~$${spent.toFixed(3)}`);
})();
