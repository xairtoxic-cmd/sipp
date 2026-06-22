"use client";

import { useRef, useState } from "react";
import { categoryLabel, isFineDining } from "@/lib/seed";
import { getBestBookingMethod } from "@/lib/booking";
import { useStore } from "@/lib/store";
import { Icon } from "./Icons";
import { CafeImage, PrimaryButton, GhostButton, useBodyScrollLock } from "./UI";

// ---- Canvas share-image renderer (reliable: no DOM screenshot) ----
const CREAM = "#F7F0E6", IVORY = "#FFF9F0", ESPRESSO = "#2B2118", GOLD = "#B9935A", BROWN = "#6b5a47";

// Ask the photo host for a larger render so the exported card stays crisp.
function hiRes(src) {
  if (!src) return src;
  try {
    if (src.includes("images.unsplash.com")) {
      return src.replace(/([?&])w=\d+/, "$1w=1600").replace(/([?&])q=\d+/, "$1q=85");
    }
  } catch {}
  return src;
}
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}
function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, r = w / h;
  let sw, sh, sx, sy;
  if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function gradFill(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "#dcc9a8"); g.addColorStop(1, "#a9855a");
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
function wrap(ctx, text, maxW, max = 3) {
  const words = String(text || "").split(/\s+/);
  const lines = []; let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines.slice(0, max);
}
// pills laid left→right; returns total width drawn
function pill(ctx, text, x, y, h, font, bg, fg) {
  ctx.font = font;
  const padX = h * 0.42;
  const w = ctx.measureText(text).width + padX * 2;
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(text, x + padX, y + h / 2 + h * 0.04);
  return w;
}

async function renderShareBlob({ cafe, fmt, tpl, scoreText, serifFam, sansFam, top, reviewer }) {
  const W = 1080;
  const H = fmt === "story" ? 1920 : fmt === "post" ? 1350 : 1080;
  const SCALE = 2; // supersample → crisp text + photos
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  const img = await loadImage(hiRes(cafe.images && cafe.images[0]));
  const P = Math.round(W * 0.07);
  const meta = `${categoryLabel(cafe)} · ${cafe.area}`;
  const tags = (cafe.tags || []).slice(0, 3);
  const serif = (wt, px) => `${wt} ${Math.round(px)}px ${serifFam}`;
  const sans = (wt, px) => `${wt} ${Math.round(px)}px ${sansFam}`;

  if (tpl === "bold") {
    ctx.fillStyle = ESPRESSO; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = CREAM; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.font = serif(600, W * 0.07); ctx.fillText("sipp", P, P + W * 0.06);
    // round photo top-right
    const rsz = Math.round(W * 0.15), rx = W - P - rsz, ry = P;
    ctx.save(); ctx.beginPath(); ctx.arc(rx + rsz / 2, ry + rsz / 2, rsz / 2, 0, Math.PI * 2); ctx.clip();
    if (img) drawCover(ctx, img, rx, ry, rsz, rsz); else gradFill(ctx, rx, ry, rsz, rsz);
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.arc(rx + rsz / 2, ry + rsz / 2, rsz / 2, 0, Math.PI * 2); ctx.stroke();
    // big score block
    let y = H * (fmt === "square" ? 0.5 : 0.58);
    ctx.fillStyle = GOLD; ctx.font = sans(600, W * 0.03); ctx.fillText("SIPP SCORE", P, y);
    y += W * 0.32;
    ctx.font = serif(700, scoreText.length > 3 ? W * 0.16 : W * 0.34); ctx.fillText(scoreText, P, y);
    y += W * 0.11;
    ctx.fillStyle = CREAM; ctx.font = serif(600, W * 0.085);
    for (const ln of wrap(ctx, cafe.name, W - 2 * P, 2)) { ctx.fillText(ln, P, y); y += W * 0.09; }
    ctx.fillStyle = "rgba(247,240,230,0.72)"; ctx.font = sans(400, W * 0.034); ctx.fillText(meta, P, y + W * 0.005);
    if (top?.text && fmt !== "square") {
      let qy = y + W * 0.075;
      ctx.fillStyle = "rgba(247,240,230,0.82)"; ctx.font = `italic 400 ${Math.round(W * 0.033)}px ${sansFam}`;
      for (const ln of wrap(ctx, `“${top.text}” — ${reviewer?.name || "a member"}`, W - 2 * P, 4)) { ctx.fillText(ln, P, qy); qy += W * 0.044; }
    }
    return await new Promise((r) => canvas.toBlob(r, "image/png", 0.95));
  }

  if (tpl === "editorial") {
    ctx.fillStyle = IVORY; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = ESPRESSO; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.font = serif(600, W * 0.065); ctx.fillText("sipp", P, P + W * 0.05);
    ctx.fillStyle = "rgba(107,90,71,0.7)"; ctx.font = sans(500, W * 0.026); ctx.textAlign = "right";
    ctx.fillText(isFineDining(cafe) ? "DUBAI DINING" : "DUBAI CAFÉ", W - P, P + W * 0.045); ctx.textAlign = "left";
    const fx = P, fy = Math.round(P + W * 0.1), fw = W - 2 * P;
    const fh = fmt === "square" ? Math.round(H * 0.4) : Math.round(H * 0.52);
    ctx.save(); rr(ctx, fx, fy, fw, fh, Math.round(W * 0.04)); ctx.clip();
    if (img) drawCover(ctx, img, fx, fy, fw, fh); else gradFill(ctx, fx, fy, fw, fh);
    ctx.restore();
    let y = fy + fh + W * 0.085;
    ctx.fillStyle = GOLD; ctx.font = serif(700, W * 0.085); ctx.textAlign = "right";
    ctx.fillText(scoreText, W - P, y); ctx.textAlign = "left";
    ctx.fillStyle = ESPRESSO; ctx.font = serif(600, W * 0.082);
    const nameMaxW = W - 2 * P - ctx.measureText("  ").width - (W * 0.18);
    for (const ln of wrap(ctx, cafe.name, nameMaxW, 2)) { ctx.fillText(ln, P, y); y += W * 0.085; }
    ctx.fillStyle = BROWN; ctx.font = sans(400, W * 0.032); ctx.fillText(meta, P, y);
    let tx = P; const th = Math.round(W * 0.052), ty = y + W * 0.03;
    for (const t of tags) { tx += pill(ctx, t, tx, ty, th, sans(400, W * 0.028), "#EFE7D8", BROWN) + W * 0.018; }
    if (top?.text && fmt === "story") {
      let qy = ty + th + W * 0.06;
      ctx.fillStyle = BROWN; ctx.font = `italic 400 ${Math.round(W * 0.034)}px ${sansFam}`;
      for (const ln of wrap(ctx, `“${top.text}” — ${reviewer?.name || "a member"}`, W - 2 * P, 4)) { ctx.fillText(ln, P, qy); qy += W * 0.045; }
    }
    return await new Promise((r) => canvas.toBlob(r, "image/png", 0.95));
  }

  // classic — full-bleed photo, content bottom
  if (img) drawCover(ctx, img, 0, 0, W, H); else gradFill(ctx, 0, 0, W, H);
  const og = ctx.createLinearGradient(0, H * 0.3, 0, H);
  og.addColorStop(0, "rgba(43,33,24,0)"); og.addColorStop(1, "rgba(43,33,24,0.94)");
  ctx.fillStyle = og; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = CREAM; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.font = serif(600, W * 0.075); ctx.fillText("sipp", P, P + W * 0.065);
  let cy = H - P;
  // Open in Sipp pill
  const ph = Math.round(W * 0.06); cy -= ph;
  pill(ctx, "Open in Sipp", P, cy, ph, sans(500, W * 0.032), GOLD, ESPRESSO);
  cy -= W * 0.035;
  if (tags.length) {
    const th = Math.round(W * 0.05); cy -= th; let tx = P;
    for (const t of tags) { tx += pill(ctx, t, tx, cy, th, sans(400, W * 0.028), "rgba(247,240,230,0.18)", CREAM) + W * 0.015; }
    cy -= W * 0.03;
  }
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillStyle = "rgba(247,240,230,0.9)"; ctx.font = sans(400, W * 0.033);
  cy -= W * 0.033; ctx.fillText(meta, P, cy); cy -= W * 0.055;
  const scoreFont = serif(700, scoreText.length > 3 ? W * 0.058 : W * 0.11);
  const nameFont = serif(600, W * 0.086);
  ctx.font = scoreFont; const scoreW = ctx.measureText(scoreText).width;
  ctx.font = nameFont;
  const nameLines = wrap(ctx, cafe.name, W - 2 * P - scoreW - W * 0.03, 3);
  const lineH = Math.round(W * 0.088);
  for (let i = nameLines.length - 1; i >= 0; i--) {
    ctx.fillStyle = CREAM; ctx.font = nameFont; ctx.fillText(nameLines[i], P, cy);
    if (i > 0) cy -= lineH;
  }
  ctx.font = scoreFont; ctx.fillStyle = CREAM; ctx.textAlign = "right";
  ctx.fillText(scoreText, W - P, cy); ctx.textAlign = "left";
  // Top review quote, sitting just above the name
  if (top?.text && fmt !== "square") {
    const innerPad = Math.round(W * 0.035);
    ctx.font = sans(400, W * 0.032);
    const qlines = wrap(ctx, `“${top.text}”`, W - 2 * P - innerPad * 2, 3);
    const qlh = Math.round(W * 0.044);
    const boxH = innerPad * 2 + qlines.length * qlh + Math.round(W * 0.045);
    const boxTop = cy - W * 0.085 - boxH;
    rr(ctx, P, boxTop, W - 2 * P, boxH, Math.round(W * 0.03));
    ctx.fillStyle = "rgba(43,33,24,0.5)"; ctx.fill();
    let qy = boxTop + innerPad + qlh * 0.75;
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(247,240,230,0.96)"; ctx.font = sans(400, W * 0.032);
    for (const ln of qlines) { ctx.fillText(ln, P + innerPad, qy); qy += qlh; }
    ctx.fillStyle = GOLD; ctx.font = sans(500, W * 0.027);
    ctx.fillText(`${reviewer?.name || "A member"} · ${Number(top.overall || 0).toFixed(1)} ★`, P + innerPad, qy + Math.round(W * 0.008));
  }
  return await new Promise((r) => canvas.toBlob(r, "image/png", 0.95));
}

const FORMATS = [
  { id: "story", label: "Story 9:16", ratio: "9 / 16" },
  { id: "post", label: "Post 4:5", ratio: "4 / 5" },
  { id: "square", label: "Square 1:1", ratio: "1 / 1" },
];

const STYLES = [
  { id: "classic", label: "Classic" },
  { id: "editorial", label: "Editorial" },
  { id: "bold", label: "Bold" },
];

const hashNum = (s = "") => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

function Tags({ cafe, className = "" }) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {cafe.tags.slice(0, 3).map((t) => (
        <span key={t} className="rounded-full bg-cream/20 px-2 py-0.5 text-[10px] backdrop-blur">{t}</span>
      ))}
    </div>
  );
}

// --- Card styles ---
function ClassicCard({ cafe, top, reviewer, savedBy, fmt }) {
  return (
    <>
      <CafeImage src={cafe.images[0]} alt={cafe.name} seed={cafe.id} query={`${cafe.name}, ${cafe.area}`} rounded="rounded-none" className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-espresso/85 via-espresso/25 to-espresso/15" />
      <div className="absolute inset-0 flex flex-col justify-between p-4 text-cream">
        <div className="serif text-2xl lowercase leading-none">sipp</div>
        <div>
          <div className="flex items-end justify-between gap-2">
            <h2 className="serif text-3xl leading-none">{cafe.name}</h2>
            <span className="serif text-4xl font-bold leading-none">{cafe.sippScore == null ? "New" : cafe.sippScore.toFixed(1)}</span>
          </div>
          <p className="mt-1 text-xs text-cream/85">{categoryLabel(cafe)} · {cafe.area}</p>
          <Tags cafe={cafe} className="mt-2" />
          {top && fmt !== "square" && (
            <div className="mt-3 rounded-2xl bg-cream/15 p-3 backdrop-blur">
              <p className="text-[13px] leading-snug">“{top.text}”</p>
              <p className="mt-1.5 text-[11px] text-cream/85">{reviewer?.name} · {top.overall.toFixed(1)} ★</p>
            </div>
          )}
          <p className="mt-2.5 text-[11px] text-cream/80">Saved by Sara and {savedBy} others</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[11px] font-medium">
            Open in Sipp <Icon name="compass" size={12} />
          </div>
        </div>
      </div>
    </>
  );
}

function EditorialCard({ cafe, top, reviewer, fmt }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream p-4 text-espresso">
      <div className="flex items-center justify-between">
        <span className="serif text-2xl lowercase leading-none">sipp</span>
        <span className="text-[10px] uppercase tracking-widest text-brown/60">Dubai café</span>
      </div>
      <div className="mt-3 flex-1 overflow-hidden rounded-2xl">
        <CafeImage src={cafe.images[0]} alt={cafe.name} seed={cafe.id} query={`${cafe.name}, ${cafe.area}`} rounded="rounded-2xl" className="h-full w-full" />
      </div>
      <div className="mt-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="serif text-3xl leading-none text-espresso">{cafe.name}</h2>
          <span className="serif text-3xl font-bold leading-none text-gold">{cafe.sippScore == null ? "New" : cafe.sippScore.toFixed(1)}</span>
        </div>
        <p className="mt-0.5 text-xs text-brown/70">{categoryLabel(cafe)} · {cafe.area}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {cafe.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full border border-line bg-ivory px-2 py-0.5 text-[10px] text-brown">{t}</span>
          ))}
        </div>
        {top && fmt === "story" && (
          <p className="mt-2 text-[12px] italic leading-snug text-brown/80">“{top.text}” — {reviewer?.name}</p>
        )}
      </div>
    </div>
  );
}

function BoldCard({ cafe, top, reviewer, fmt }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-espresso p-5 text-cream">
      <div className="flex items-center justify-between">
        <span className="serif text-2xl lowercase leading-none">sipp</span>
        <span className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-gold">
          <CafeImage src={cafe.images[0]} alt={cafe.name} seed={cafe.id} query={`${cafe.name}, ${cafe.area}`} rounded="rounded-full" className="h-full w-full" />
        </span>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-widest text-gold">Sipp Score</p>
        <p className="serif font-bold leading-[0.85] text-gold" style={{ fontSize: cafe.sippScore == null ? "2.4rem" : "5rem" }}>{cafe.sippScore == null ? "New" : cafe.sippScore.toFixed(1)}</p>
        <h2 className="mt-3 serif text-4xl leading-none">{cafe.name}</h2>
        <p className="mt-1 text-sm text-cream/70">{categoryLabel(cafe)} · {cafe.area}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {cafe.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full border border-cream/25 px-2 py-0.5 text-[10px] text-cream/85">{t}</span>
          ))}
        </div>
        {top && fmt !== "square" && (
          <p className="mt-3 text-[12px] italic leading-snug text-cream/80">“{top.text}” — {reviewer?.name}</p>
        )}
      </div>
    </div>
  );
}

export function ShareCard({ cafe, onClose }) {
  useBodyScrollLock();
  const { toast, reviews, getProfile, reserve } = useStore();
  const booking = getBestBookingMethod(cafe);
  const [fmt, setFmt] = useState("story");
  const [tpl, setTpl] = useState("classic");
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef(null);
  const ratio = FORMATS.find((f) => f.id === fmt)?.ratio;

  const top = reviews.filter((r) => r.cafeId === cafe.id).sort((a, b) => b.overall - a.overall)[0];
  const reviewer = top ? getProfile(top.user) : null;
  const savedBy = 6 + (hashNum(cafe.id) % 18);
  const link = typeof window !== "undefined" ? `${window.location.origin}/share/place/${cafe.id}` : `/share/place/${cafe.id}`;

  function copy() {
    navigator.clipboard?.writeText(link).then(() => toast("Link copied ✓"), () => toast("Link copied ✓"));
  }
  function nativeShare() {
    if (navigator.share) {
      navigator.share({ title: `${cafe.name} on Sipp`, text: `${cafe.name} — ${cafe.area}`, url: link }).catch(() => {});
    } else {
      copy();
    }
  }

  // Share the actual card image (the style they chose), falling back to saving
  // the image, then to sharing just the link.
  async function shareImage() {
    setSharing(true);
    try {
      // Use the app's actual (hashed) font-family names so the canvas matches the UI.
      try { await (document.fonts?.ready || Promise.resolve()); } catch {}
      const serifEl = cardRef.current?.querySelector(".serif");
      const serifFam = (serifEl && getComputedStyle(serifEl).fontFamily) || "Georgia, serif";
      const sansFam = getComputedStyle(document.body).fontFamily || "Inter, sans-serif";
      const scoreText = cafe.sippScore == null ? "New" : cafe.sippScore.toFixed(1);
      const blob = await renderShareBlob({ cafe, fmt, tpl, scoreText, serifFam, sansFam, top, reviewer });
      if (!blob) throw new Error("render failed");
      const file = new File([blob], `sipp-${cafe.id}.png`, { type: "image/png" });
      const title = `${cafe.name} on Sipp`;
      const text = `${cafe.name} — ${cafe.area}\n${link}`;
      const withUrl = { files: [file], title, text, url: link };
      const filesOnly = { files: [file], title, text };
      if (navigator.canShare && navigator.canShare(withUrl)) {
        // Best case: image + link in both text and url.
        await navigator.share(withUrl);
      } else if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Some targets won't take url alongside a file — keep the link in the text,
        // and copy it so it can always be pasted with the post.
        try { await navigator.clipboard?.writeText(link); } catch {}
        await navigator.share(filesOnly);
      } else {
        // No file-share support (most desktops): save the image so they still get the picture.
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `sipp-${cafe.name.replace(/\s+/g, "-").toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast("Card image saved ✓");
      }
    } catch (e) {
      nativeShare(); // last resort
    } finally {
      setSharing(false);
    }
  }

  const cardProps = { cafe, top, reviewer, savedBy, fmt };

  return (
    <div className="fixed inset-0 z-[1600] flex items-end justify-center bg-espresso/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-[460px] flex-col animate-sheetUp rounded-t-xl3 border border-line bg-cream pb-[max(env(safe-area-inset-bottom),14px)] shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-beige" />
          <div className="flex items-center justify-between">
            <h3 className="serif text-3xl text-espresso">Share card</h3>
            <button onClick={onClose} className="text-brown/50">
              <Icon name="x" size={22} />
            </button>
          </div>
          {/* style picker */}
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setTpl(s.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs transition ${
                  tpl === s.id ? "bg-gold text-cream" : "border border-line bg-card text-brown"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {/* format picker */}
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFmt(f.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs transition ${
                  fmt === f.id ? "bg-espresso text-cream" : "border border-line bg-card text-brown"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card preview */}
        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div
            ref={cardRef}
            className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-xl3 border border-line shadow-float"
            style={{ aspectRatio: ratio, background: "#FFFBF4" }}
          >
            {tpl === "classic" && <ClassicCard {...cardProps} />}
            {tpl === "editorial" && <EditorialCard {...cardProps} />}
            {tpl === "bold" && <BoldCard {...cardProps} />}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 pt-3">
          <GhostButton className="flex-1 !py-3" onClick={copy}>
            <Icon name="share" size={16} /> Copy link
          </GhostButton>
          <PrimaryButton className="flex-1 !py-3" onClick={shareImage} disabled={sharing}>
            {sharing ? "Preparing…" : "Share image"}
          </PrimaryButton>
        </div>
        {booking && (
          <button onClick={() => reserve(cafe)} className="mx-5 mt-2 flex items-center justify-center gap-2 rounded-full border border-gold/50 bg-gold/10 py-3 text-sm font-medium text-gold">
            <Icon name="cup" size={16} /> Reserve Table
          </button>
        )}
        <p className="px-5 pt-2 text-center text-[11px] text-brown/50">Long-press the card to save the image.</p>
      </div>
    </div>
  );
}
