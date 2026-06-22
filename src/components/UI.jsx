"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

const PHOTOS_ENABLED = process.env.NEXT_PUBLIC_PLACES_PHOTOS === "1";

// Lock background scrolling while a modal/sheet is open.
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

// In-memory cache so each café's real photo is fetched once per session.
const photoCache = new Map();

function useRealPhoto(query) {
  const [url, setUrl] = useState(query && photoCache.get(query));
  useEffect(() => {
    if (!PHOTOS_ENABLED || !query) return;
    if (photoCache.has(query)) {
      setUrl(photoCache.get(query));
      return;
    }
    let cancelled = false;
    fetch(`/api/places/photo?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => {
        photoCache.set(query, d?.url || null);
        if (!cancelled && d?.url) setUrl(d.url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [query]);
  return url || null;
}

const GRADS = [
  "linear-gradient(135deg,#d8c4a6,#b9935a)",
  "linear-gradient(135deg,#cdb49a,#8a6e4e)",
  "linear-gradient(135deg,#e3d2b5,#c0a072)",
  "linear-gradient(135deg,#cbb89a,#7d6244)",
  "linear-gradient(135deg,#dcc9a8,#a9855a)",
];

function gradFor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % GRADS.length;
  return GRADS[h];
}

export function CafeImage({ src, alt, seed, query, className = "", rounded = "rounded-2xl" }) {
  const [ok, setOk] = useState(true);
  const real = useRealPhoto(query);
  const finalSrc = real || src;
  const grad = gradFor(seed || alt);
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`} style={{ background: grad }}>
      {ok && finalSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={finalSrc}
          alt={alt}
          loading="lazy"
          onError={() => setOk(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {!ok && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="serif text-3xl text-white/85">{(alt || "·")[0]}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-espresso/25 via-transparent to-transparent" />
    </div>
  );
}

export function Avatar({ user, size = 36, ring = false }) {
  const initials = (user?.name || "?").slice(0, 1);
  return (
    <div
      className={`grid place-items-center overflow-hidden rounded-full text-white serif font-semibold ${ring ? "ring-2 ring-cream" : ""}`}
      style={{ width: size, height: size, background: user?.avatar || "#B9935A", fontSize: size * 0.42 }}
    >
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt={user?.name || "avatar"} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

export function Stars({ value = 0, size = 14 }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-[1px] text-gold">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} fill={i <= full ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
        active
          ? "bg-espresso text-cream shadow-card"
          : "border border-line bg-card text-brown hover:border-gold/60"
      }`}
    >
      {children}
    </button>
  );
}

// Sipp Rated / Sipp Star pills — original Sipp identity (espresso + gold).
export function SippBadges({ place, className = "" }) {
  if (!place?.isSippRated && !place?.hasSippStar) return null;
  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {place.hasSippStar && (
        <span className="inline-flex items-center gap-1 rounded-full bg-espresso px-2.5 py-1 text-[10px] font-semibold tracking-wide text-gold">
          ★ Sipp Star
        </span>
      )}
      {place.isSippRated && (
        <span className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-2.5 py-1 text-[10px] font-medium text-gold">
          Sipp Rated
        </span>
      )}
    </span>
  );
}

export function Tag({ children }) {
  return (
    <span className="rounded-full border border-line bg-ivory px-2.5 py-1 text-[11px] font-medium text-brown">
      {children}
    </span>
  );
}

export function PrimaryButton({ children, onClick, className = "", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-espresso px-5 py-3 text-sm font-medium text-cream shadow-card transition active:scale-[0.98] hover:bg-[#3a2c20] ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = "", active = false }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition active:scale-[0.98] ${
        active ? "border-gold bg-gold/10 text-espresso" : "border-line bg-card text-espresso hover:border-gold/60"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function ScoreBadge({ value, label = "Sipp Score" }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-ivory px-3 py-2">
      <span className="serif text-2xl leading-none text-espresso">{value?.toFixed(1)}</span>
      <span className="text-[10px] uppercase tracking-wider text-brown/70">{label}</span>
    </div>
  );
}

export function SectionHeader({ title, accent, action, onAction }) {
  return (
    <div className="mb-3 mt-6 flex items-end justify-between px-1">
      <h3 className="serif text-2xl text-espresso">
        {title} {accent && <span className="gold-italic">{accent}</span>}
      </h3>
      {action && (
        <button onClick={onAction} className="text-xs font-medium text-gold">
          {action}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "cup", title, sub, action }) {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-2 px-6 py-16 text-center">
      <div className="mb-1 grid h-16 w-16 place-items-center rounded-full border border-line bg-card text-gold">
        <Icon name={icon} size={28} />
      </div>
      <h4 className="serif text-2xl text-espresso">{title}</h4>
      <p className="text-sm text-brown/80">{sub}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-beige/60 ${className}`} />;
}
