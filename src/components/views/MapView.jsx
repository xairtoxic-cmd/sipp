"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MAP_FILTERS, placeMatches, isFineDining, categoryLabel } from "@/lib/seed";
import { getBestBookingMethod } from "@/lib/booking";
import { useStore } from "@/lib/store";
import { Icon } from "../Icons";
import { Chip, CafeImage, Tag, PrimaryButton, GhostButton, useBodyScrollLock } from "../UI";
import { HeartButton } from "../CafeCard";

function matchFilter(c, f) {
  switch (f) {
    case "All":
      return true;
    case "Open Now":
      return c.openNow;
    case "High Rated":
      return c.rating >= 4.7;
    case "Near Me":
      return true;
    default:
      // Cafés, Fine Dining, Brunch, Dessert, Date Night, Rooftop, Waterfront, Hidden Gems…
      return placeMatches(c, f);
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

function glyphSvg(kind) {
  if (kind === "star")
    return `<path d="M12.5 5.6l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z" fill="#fff"/>`;
  if (kind === "cup")
    return `<path d="M8.5 11h8v3a4 4 0 0 1-4 4 4 4 0 0 1-4-4z" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M16.5 12H18a1.6 1.6 0 0 1 0 3.2h-1.5" fill="none" stroke="#fff" stroke-width="1.4"/>`;
  if (kind === "fork")
    return `<g fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round"><path d="M9.4 8.4v3a1.5 1.5 0 0 0 3 0v-3"/><path d="M10.9 12.6V16"/><path d="M15.6 8.4c-1 0-1.7 1.3-1.7 2.8 0 1 .5 1.8 1.2 2.1V16"/></g>`;
  return `<circle cx="12.5" cy="12" r="3" fill="#fff"/>`;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Hover preview card shown on desktop when the cursor is over a pin.
function tooltipHtml(c) {
  const scoreLabel = c.sippScore == null ? "No Sipp score yet" : `★ Sipp ${c.sippScore.toFixed(1)}`;
  const photo =
    c.images && c.images[0]
      ? `<div class="sipp-tip-photo"><img src="${esc(c.images[0])}" alt="" loading="lazy"/></div>`
      : "";
  return (
    photo +
    `<div class="sipp-tip-body">` +
    `<div class="sipp-tip-name">${esc(c.name)}</div>` +
    `<div class="sipp-tip-meta">${esc(categoryLabel(c))}${c.area ? " · " + esc(c.area) : ""}</div>` +
    `<div class="sipp-tip-score">${scoreLabel}</div>` +
    `</div>`
  );
}

// True on devices with a real pointer (desktop) — gates hover-only behaviour.
const hoverCapable = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(hover: hover)").matches;

// The plain teardrop pin — no ring.
function pinSvg(color, glyph) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 32">` +
    `<path d="M12.5 0C6 0 1 5 1 11.4 1 20 12.5 32 12.5 32S24 20 24 11.4C24 5 19 0 12.5 0z" fill="${color}"/>` +
    glyphSvg(glyph) +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

// Build the map icon for one place. The only special treatment is a gold glow
// (CSS, via the tier-glow class) for the top 10% rated places in the region.
// topCutoff is the score at the region's 90th percentile.
function buildIcon(L, c, isSel, topCutoff) {
  const fine = isFineDining(c);
  const star = c.hasSippStar;
  const score = c.sippScore ?? 0;
  const glow = c.sippScore != null && topCutoff > 0 && score >= topCutoff;
  const big = isSel || star;
  const s = big ? 44 : 34;
  const color = isSel ? "#C2674A" : fine ? "#2B2118" : "#C9A227";
  const glyph = star ? "star" : fine ? "fork" : "cup";
  // divIcon with an INNER element: Leaflet positions the root via transform, so
  // the hover lift must scale the inner element (which has no transform) — scaling
  // the root would multiply Leaflet's translate and shift the pin off its spot.
  const html =
    `<div class="sipp-pin-inner" style="width:${s}px;height:${s}px">` +
    `<img src="${pinSvg(color, glyph)}" width="${s}" height="${s}" style="display:block"/>` +
    `</div>`;
  return L.divIcon({
    html,
    className: `sipp-pin${glow ? " tier-glow" : ""}`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s],
    tooltipAnchor: [0, -s + 2], // hover card sits above the pin head
  });
}

// Level-of-detail: how many pins to show at a given zoom. Zoomed out = fewer
// (only the very best); zoomed in = progressively more.
function maxPinsForZoom(z) {
  if (z <= 8) return 15;
  if (z <= 10) return 40;
  if (z <= 11) return 70;
  if (z <= 12) return 120;
  if (z <= 13) return 250;
  if (z <= 14) return 450;
  return 1500;
}

// Ranking used to decide which pins survive when zoomed out: rating first,
// with a gentle boost for places that have lots of reviews.
function placeQuality(c) {
  const score = c.sippScore ?? 0;
  const reviews = c.reviews || 0;
  return score + Math.min(reviews / 250, 1.2);
}

export default function MapView() {
  const { openCafe, getStatus, cityCafes, cafes, recommendScore, friendSet, reserve } = useStore();
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const markersRef = useRef({});
  const renderRef = useRef(() => {});
  const selectedIdRef = useRef(null);
  const centeredRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [areaBounds, setAreaBounds] = useState(null); // when "Search this area" used
  const [q, setQ] = useState("");
  useBodyScrollLock(filterOpen);

  const visible = useMemo(() => {
    // Default: your city. After "Search this area": the whole UAE pool (the live
    // map viewport + zoom level then decide which of those actually render).
    let base = areaBounds ? cafes : cityCafes;
    let list = base.filter((c) => {
      if (filter === "Best for me") return recommendScore(c) >= 0.55;
      if (filter === "Loved by friends") return friendSet.has(c.id);
      return matchFilter(c, filter);
    });
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(s) || (c.area || "").toLowerCase().includes(s));
    }
    return list;
  }, [filter, q, cityCafes, cafes, areaBounds, recommendScore, friendSet]);

  // Score at the 90th percentile of the region's places — the cutoff for the
  // "glow" tier (top ~10% rated). Region = your city, or the whole pool once
  // you've searched a wider area.
  const topCutoff = useMemo(() => {
    const pool = areaBounds ? cafes : cityCafes;
    const scores = pool
      .map((c) => c.sippScore)
      .filter((s) => s != null && s > 0)
      .sort((a, b) => b - a);
    if (!scores.length) return Infinity;
    const k = Math.max(1, Math.ceil(scores.length * 0.1));
    return scores[k - 1];
  }, [areaBounds, cafes, cityCafes]);

  function searchThisArea() {
    // Widen the pool beyond the home city so panning anywhere surfaces places.
    // The data effect re-renders pins when `visible` recomputes from areaBounds.
    setAreaBounds(true);
    setShowSearchArea(false);
  }

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
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Re-evaluate which pins to show whenever the view changes (zoom = detail).
      map.on("moveend zoomend", () => renderRef.current());
      map.on("dragend zoomend", () => setShowSearchArea(true));
      map.on("click", () => {
        setSelected(null);
        setExpanded(false);
      });
      mapRef.current = map;
      setReady(true);
      // Leaflet can mis-measure a container that was hidden/resizing at init
      // (tab switch, flex layout) — recalc once the layout settles.
      setTimeout(() => { if (!cancelled && mapRef.current) mapRef.current.invalidateSize(); }, 150);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // The render function lives in a ref so map event handlers always call the
  // latest version (fresh `visible`) without re-binding listeners. Re-assigned
  // every render — cheap, and avoids stale closures.
  renderRef.current = () => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const z = map.getZoom();
    const bounds = map.getBounds();

    // Places in the current viewport, ranked by quality, capped by zoom level.
    const inView = visible.filter((c) => c.lat && c.lng && bounds.contains([c.lat, c.lng]));
    inView.sort((a, b) => placeQuality(b) - placeQuality(a));
    const keep = inView.slice(0, maxPinsForZoom(z));
    const want = new Set(keep.map((c) => c.id));
    // Always keep the currently-selected pin on the map.
    const sel = selectedIdRef.current;
    if (sel && !want.has(sel)) {
      const selPlace = visible.find((c) => c.id === sel);
      if (selPlace) { keep.push(selPlace); want.add(sel); }
    }

    // Remove pins that should no longer show.
    Object.keys(markersRef.current).forEach((id) => {
      if (!want.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
    // Add pins that aren't on the map yet.
    keep.forEach((c) => {
      if (markersRef.current[c.id]) return;
      const isSel = sel === c.id;
      const m = L.marker([c.lat, c.lng], { icon: buildIcon(L, c, isSel, topCutoff) });
      m._place = c;
      if (hoverCapable) {
        m.bindTooltip(tooltipHtml(c), { direction: "top", offset: [0, -2], opacity: 1, className: "sipp-tip" });
      }
      m.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelected(c);
        setExpanded(false);
        map.panTo([c.lat, c.lng], { animate: true });
      });
      m.addTo(map);
      markersRef.current[c.id] = m;
    });
  };

  // Re-render when the data set changes; center on the city once on first load.
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!centeredRef.current && visible.length) {
      const pts = visible.filter((c) => c.lat && c.lng).map((c) => [c.lat, c.lng]);
      if (pts.length) {
        try { map.fitBounds(pts, { padding: [40, 40], maxZoom: 13, animate: false }); } catch {}
        centeredRef.current = true;
      }
    }
    renderRef.current();
  }, [visible, ready]);

  // Highlight the selected pin in place (no rebuild).
  useEffect(() => {
    const L = LRef.current;
    if (!L) return;
    const prev = selectedIdRef.current;
    if (prev && prev !== selected?.id && markersRef.current[prev]) {
      const m = markersRef.current[prev];
      m.setIcon(buildIcon(L, m._place, false, topCutoff));
    }
    if (selected?.id && markersRef.current[selected.id]) {
      const m = markersRef.current[selected.id];
      m.setIcon(buildIcon(L, m._place, true, topCutoff));
    }
    selectedIdRef.current = selected?.id || null;
  }, [selected]);

  // If a filter/search change drops the selected place from view, close its sheet
  // so it doesn't linger over a place that no longer has a pin.
  useEffect(() => {
    if (selected && !visible.some((c) => c.id === selected.id)) {
      setSelected(null);
      setExpanded(false);
    }
  }, [visible, selected]);

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
          <button
            onClick={() => setFilterOpen(true)}
            aria-label="Filters"
            className="relative grid h-12 w-12 place-items-center rounded-full border border-line bg-cream/95 text-espresso shadow-float backdrop-blur"
          >
            <Icon name="sliders" size={20} />
            {filter !== "All" && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-gold" />}
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
        <div className="pointer-events-none absolute inset-x-0 top-32 z-[500] flex justify-center">
          <button
            onClick={searchThisArea}
            className="pointer-events-auto flex animate-fadeIn items-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-xs font-medium text-cream shadow-float"
          >
            <Icon name="compass" size={14} /> Search this area
          </button>
        </div>
      )}

      {/* Near me */}
      <button
        onClick={locate}
        className="absolute bottom-36 right-4 z-[500] grid h-12 w-12 place-items-center rounded-full border border-line bg-cream/95 text-espresso shadow-float backdrop-blur"
        aria-label="Near me"
      >
        <Icon name="near" size={22} />
      </button>

      {/* Café / fine dining key */}
      {!selected && (
        <div className="absolute bottom-36 left-4 z-[500] flex flex-col gap-1.5 rounded-2xl border border-line bg-cream/95 px-3 py-2 shadow-float backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-brown/80">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#C9A227" }} /> Café
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-brown/80">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#2B2118" }} /> Fine dining
            </span>
            <span className="flex items-center gap-1 text-[11px] text-brown/80">
              <span className="text-gold">★</span> Sipp Star
            </span>
          </div>
          <div className="flex items-center gap-3 border-t border-line/70 pt-1.5">
            <span className="flex items-center gap-1.5 text-[11px] text-brown/80">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: "#C9A227", boxShadow: "0 0 6px 1.5px rgba(230,180,70,0.95)" }}
              />{" "}
              Top 10% rated · glows
            </span>
          </div>
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
              <button onClick={() => openCafe(selected.id)} className="shrink-0">
                <CafeImage src={selected.images[0]} alt={selected.name} seed={selected.id} query={`${selected.name}, ${selected.area}`} className="h-24 w-24" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => openCafe(selected.id)} className="text-left">
                    <h3 className="serif text-2xl leading-tight text-espresso">{selected.name}</h3>
                    <p className="text-sm text-brown/80">{categoryLabel(selected)} · {selected.area}</p>
                  </button>
                  <HeartButton cafeId={selected.id} />
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-gold">
                    <Icon name="star" size={13} fill="currentColor" /> {selected.rating}
                  </span>
                  <span className="text-brown/50">({selected.reviews})</span>
                  <span className="text-brown/40">·</span>
                  <span className="text-brown/80">{selected.sippScore == null ? "No Sipp score yet" : `Sipp ${selected.sippScore.toFixed(1)}`}</span>
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
            {getBestBookingMethod(selected) && (
              <PrimaryButton className="mt-2 w-full !py-2.5" onClick={() => reserve(selected)}>
                <Icon name="cup" size={16} /> Reserve
              </PrimaryButton>
            )}
          </div>
        </div>
      )}

      {/* Filter sheet */}
      {filterOpen && (
        <div className="fixed inset-0 z-[1600] flex items-end justify-center bg-espresso/40 backdrop-blur-sm" onClick={() => setFilterOpen(false)}>
          <div
            className="w-full max-w-[460px] animate-sheetUp rounded-t-xl3 border border-line bg-cream p-5 pb-[max(env(safe-area-inset-bottom),16px)] shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-beige" />
            <div className="flex items-center justify-between">
              <h3 className="serif text-3xl text-espresso">Filter the map</h3>
              <button onClick={() => setFilterOpen(false)} className="text-brown/50">
                <Icon name="x" size={22} />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {MAP_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setFilterOpen(false);
                  }}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    filter === f ? "bg-espresso text-cream shadow-card" : "border border-line bg-card text-brown hover:border-gold/60"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
