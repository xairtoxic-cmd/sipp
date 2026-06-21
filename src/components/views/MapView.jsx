"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CAFES, MAP_FILTERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { Icon } from "../Icons";
import { Chip, CafeImage, Tag, PrimaryButton, GhostButton } from "../UI";
import { HeartButton } from "../CafeCard";

function matchFilter(c, f) {
  switch (f) {
    case "All":
    case "Cafés":
      return true;
    case "Matcha":
      return c.tags.includes("Matcha");
    case "Brunch":
      return c.tags.includes("Brunch");
    case "Dessert":
      return c.tags.includes("Dessert");
    case "Study":
      return c.tags.includes("Study") || c.tags.includes("Laptop Friendly");
    case "Outdoor":
      return c.tags.includes("Outdoor Seating");
    case "Open Now":
      return c.openNow;
    case "High Rated":
      return c.rating >= 4.7;
    default:
      return true;
  }
}

// Map a café rating to a gold shade — higher rating = deeper/darker gold.
function colorForRating(rating) {
  const t = Math.max(0, Math.min(1, (rating - 4.0) / 0.9)); // 4.0 → 0, 4.9 → 1
  const light = [226, 203, 158]; // pale champagne gold
  const dark = [120, 79, 22]; // deep bronze gold
  const ch = (i) => Math.round(light[i] + (dark[i] - light[i]) * t);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

function pinSvg(color, selected, featured) {
  const size = selected || featured ? 44 : 34;
  const cup = featured
    ? `<path d="M8.5 11h8v3a4 4 0 0 1-4 4 4 4 0 0 1-4-4z" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M16.5 12H18a1.6 1.6 0 0 1 0 3.2h-1.5" fill="none" stroke="#fff" stroke-width="1.4"/>`
    : `<circle cx="12.5" cy="12" r="3" fill="#fff"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 25 32"><path d="M12.5 0C6 0 1 5 1 11.4 1 20 12.5 32 12.5 32S24 20 24 11.4C24 5 19 0 12.5 0z" fill="${color}"/>${cup}</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

export default function MapView() {
  const { openCafe, getStatus } = useStore();
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const markersRef = useRef({});
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    let list = CAFES.filter((c) => matchFilter(c, filter));
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(s) || c.area.toLowerCase().includes(s));
    }
    return list;
  }, [filter, q]);

  // init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current, {
        center: [25.165, 55.24],
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);
      map.on("dragend zoomend", () => setShowSearchArea(true));
      map.on("click", () => {
        setSelected(null);
        setExpanded(false);
      });
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // render markers
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};
    visible.forEach((c) => {
      const isSel = selected?.id === c.id;
      const featured = c.sippScore >= 9.2;
      const color = isSel ? "#2b2118" : colorForRating(c.rating);
      const s = isSel || featured ? 44 : 34;
      const icon = L.icon({
        iconUrl: pinSvg(color, isSel, featured),
        iconSize: [s, s],
        iconAnchor: [s / 2, s],
        className: "sipp-pin",
      });
      const m = L.marker([c.lat, c.lng], { icon }).addTo(map);
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelected(c);
        setExpanded(false);
        map.panTo([c.lat, c.lng], { animate: true });
      });
      markersRef.current[c.id] = m;
    });
  }, [visible, selected, ready]);

  function locate() {
    const map = mapRef.current;
    if (!map) return;
    if (!navigator.geolocation) {
      map.flyTo([25.2048, 55.2708], 13);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 14),
      () => map.flyTo([25.2048, 55.2708], 13)
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <div ref={mapEl} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-cream">
          <div className="flex flex-col items-center gap-2 text-brown/60">
            <Icon name="pin" size={28} className="animate-bounce text-gold" />
            <span className="text-sm">Loading your café map…</span>
          </div>
        </div>
      )}

      {/* Top UI */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] px-4 pt-3">
        <div className="pointer-events-auto mx-auto flex max-w-[460px] items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-cream/95 px-4 py-3 shadow-float backdrop-blur">
            <Icon name="search" size={18} className="text-brown/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search this area"
              className="w-full bg-transparent text-sm text-espresso placeholder:text-brown/50 focus:outline-none"
            />
          </div>
          <button className="grid h-12 w-12 place-items-center rounded-full border border-line bg-cream/95 text-espresso shadow-float backdrop-blur">
            <Icon name="sliders" size={20} />
          </button>
        </div>
        <div className="no-scrollbar pointer-events-auto mx-auto mt-2 flex max-w-[460px] gap-2 overflow-x-auto">
          {MAP_FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </div>

      {/* Search this area */}
      {showSearchArea && !selected && (
        <button
          onClick={() => setShowSearchArea(false)}
          className="absolute left-1/2 top-32 z-[500] -translate-x-1/2 animate-fadeIn rounded-full bg-espresso px-4 py-2 text-xs font-medium text-cream shadow-float"
        >
          <Icon name="compass" size={14} className="mr-1 inline" /> Search this area
        </button>
      )}

      {/* Near me */}
      <button
        onClick={locate}
        className="absolute bottom-36 right-4 z-[500] grid h-12 w-12 place-items-center rounded-full border border-line bg-cream/95 text-espresso shadow-float backdrop-blur"
        aria-label="Near me"
      >
        <Icon name="near" size={22} />
      </button>

      {/* Rating colour legend */}
      {!selected && (
        <div className="absolute bottom-36 left-4 z-[500] flex items-center gap-2 rounded-full border border-line bg-cream/95 px-3 py-2 shadow-float backdrop-blur">
          <span className="text-[10px] font-medium text-brown/70">Rating</span>
          <span
            className="h-2 w-16 rounded-full"
            style={{ background: "linear-gradient(90deg, rgb(226,203,158), rgb(120,79,22))" }}
          />
          <span className="text-[10px] text-brown/50">low</span>
          <span className="text-[10px] font-medium text-espresso">high</span>
        </div>
      )}

      {/* Bottom sheet */}
      {selected && (
        <div className="absolute inset-x-0 bottom-0 z-[600] flex justify-center px-3 pb-24">
          <div
            className={`pointer-events-auto w-full max-w-[460px] animate-sheetUp rounded-xl3 border border-line bg-card p-3 shadow-float ${
              expanded ? "" : ""
            }`}
          >
            <div
              className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-beige"
              onClick={() => setExpanded((v) => !v)}
            />
            <div className="flex gap-3">
              <CafeImage src={selected.images[0]} alt={selected.name} seed={selected.id} query={`${selected.name}, ${selected.area}`} className="h-24 w-24 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="serif text-2xl leading-tight text-espresso">{selected.name}</h3>
                    <p className="text-sm text-brown/80">{selected.area}</p>
                  </div>
                  <HeartButton cafeId={selected.id} />
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-gold">
                    <Icon name="star" size={13} fill="currentColor" /> {selected.rating}
                  </span>
                  <span className="text-brown/50">({selected.reviews})</span>
                  <span className="text-brown/40">·</span>
                  <span className="text-brown/80">Sipp {selected.sippScore.toFixed(1)}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selected.tags.slice(0, 3).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 animate-fadeIn space-y-2 border-t border-line pt-3 text-sm text-brown/90">
                <p>{selected.blurb}</p>
                <p className="flex items-center gap-2 text-xs text-gold">{selected.activity}</p>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <GhostButton className="flex-1 !py-2.5" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Less" : "More"}
              </GhostButton>
              <GhostButton
                className="flex-1 !py-2.5"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`,
                    "_blank"
                  )
                }
              >
                <Icon name="directions" size={16} /> Directions
              </GhostButton>
              <PrimaryButton className="flex-1 !py-2.5" onClick={() => openCafe(selected.id)}>
                View
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
