"use client";

import { useStore } from "@/lib/store";
import { categoryLabel } from "@/lib/seed";
import { Icon } from "./Icons";
import { CafeImage, Tag, SippBadges } from "./UI";

export function HeartButton({ cafeId, size = 18, className = "" }) {
  const { getStatus, toggleSave } = useStore();
  const saved = getStatus(cafeId).saved;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleSave(cafeId);
      }}
      aria-label="Save café"
      className={`grid place-items-center rounded-full bg-cream/85 backdrop-blur text-espresso shadow-card transition active:scale-90 ${className}`}
      style={{ width: size + 18, height: size + 18 }}
    >
      <span className={saved ? "text-gold" : "text-espresso"}>
        <Icon name="heart" size={size} fill={saved ? "currentColor" : "none"} />
      </span>
    </button>
  );
}

export function LargeCafeCard({ cafe }) {
  const { openCafe } = useStore();
  return (
    <button
      onClick={() => openCafe(cafe.id)}
      className="group w-full overflow-hidden rounded-xl3 border border-line bg-card text-left shadow-card transition active:scale-[0.99]"
    >
      <div className="relative">
        <CafeImage src={cafe.images[0]} alt={cafe.name} seed={cafe.id} query={`${cafe.name}, ${cafe.area}`} rounded="rounded-none" className="h-52 w-full" />
        <div className="absolute right-3 top-3">
          <HeartButton cafeId={cafe.id} />
        </div>
        {(cafe.hasSippStar || cafe.isSippRated) && <SippBadges place={cafe} className="absolute left-3 top-3" />}
      </div>
      <div className="p-4">
        <h4 className="serif text-2xl leading-tight text-espresso">{cafe.name}</h4>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-brown/80">
          <Icon name="pin" size={13} /> {cafe.area}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cafe.tags.slice(0, 3).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-xs text-gold">{cafe.activity}</p>
          {cafe.sippScore == null ? (
            <span className="text-[11px] font-medium leading-tight text-brown/45">No Sipp<br />score yet</span>
          ) : (
            <span className="serif text-3xl font-bold leading-none text-espresso">{cafe.sippScore.toFixed(1)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export function CafeCard({ cafe, reason }) {
  const { openCafe } = useStore();
  return (
    <button
      onClick={() => openCafe(cafe.id)}
      className="group w-56 shrink-0 overflow-hidden rounded-xl2 border border-line bg-card text-left shadow-card transition active:scale-[0.99]"
    >
      <div className="relative">
        <CafeImage src={cafe.images[0]} alt={cafe.name} seed={cafe.id} query={`${cafe.name}, ${cafe.area}`} rounded="rounded-none" className="h-36 w-full" />
        <div className="absolute right-2.5 top-2.5">
          <HeartButton cafeId={cafe.id} size={15} />
        </div>
        {(cafe.hasSippStar || cafe.isSippRated) && <SippBadges place={cafe} className="absolute left-2.5 top-2.5" />}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="serif text-xl leading-tight text-espresso truncate">{cafe.name}</h4>
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-gold">
            <Icon name="star" size={11} fill="currentColor" /> {cafe.rating}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-brown/80">{cafe.area}</p>
        {reason ? (
          <p className="mt-1.5 truncate text-[11px] font-medium text-gold">{reason}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1">
            {cafe.tags.slice(0, 2).map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export function Carousel({ cafes, reasons }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
      {cafes.map((c) => (
        <CafeCard key={c.id} cafe={c} reason={reasons ? reasons(c) : undefined} />
      ))}
    </div>
  );
}

export function SavedRow({ cafe, statusLabel }) {
  const { openCafe } = useStore();
  return (
    <button
      onClick={() => openCafe(cafe.id)}
      className="flex w-full items-center gap-3 rounded-xl2 border border-line bg-card p-3 text-left shadow-card transition active:scale-[0.99]"
    >
      <CafeImage src={cafe.images[0]} alt={cafe.name} seed={cafe.id} query={`${cafe.name}, ${cafe.area}`} className="h-16 w-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="serif text-xl leading-tight text-espresso truncate">{cafe.name}</h4>
          <HeartButton cafeId={cafe.id} size={15} />
        </div>
        <p className="truncate text-xs text-brown/80">{categoryLabel(cafe)} · {cafe.area}</p>
        <div className="mt-1 flex items-center gap-2">
          {statusLabel && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">{statusLabel}</span>
          )}
          <span className="flex items-center gap-0.5 text-[11px] text-brown/70">
            <Icon name="star" size={10} fill="currentColor" /> {cafe.rating}
          </span>
        </div>
      </div>
    </button>
  );
}
