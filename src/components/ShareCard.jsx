"use client";

import { useRef, useState } from "react";
import { categoryLabel } from "@/lib/seed";
import { getBestBookingMethod } from "@/lib/booking";
import { useStore } from "@/lib/store";
import { Icon } from "./Icons";
import { CafeImage, PrimaryButton, GhostButton, useBodyScrollLock } from "./UI";

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
    if (!cardRef.current) return nativeShare();
    setSharing(true);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(cardRef.current, { pixelRatio: 2.5, cacheBust: true, backgroundColor: "#FFFBF4" });
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
