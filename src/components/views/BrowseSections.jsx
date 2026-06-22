"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { placeMatches } from "@/lib/seed";

const fmt = (n) => n.toLocaleString();

// Pick the best-rated place's photo to represent a group.
function imageFor(list) {
  let best = null;
  for (const c of list) {
    if (!c.images || !c.images[0]) continue;
    if (!best || (c.sippScore || 0) > (best.sippScore || 0)) best = c;
  }
  return best?.images?.[0] || null;
}

// Sipp categories that map onto placeMatches() labels — one row of six.
const CATEGORY_DEFS = [
  { label: "Cafés", match: "Cafés" },
  { label: "Fine Dining", match: "Fine Dining" },
  { label: "Brunch", match: "Brunch" },
  { label: "Specialty Coffee", match: "Specialty Coffee" },
  { label: "Dessert", match: "Dessert" },
  { label: "Rooftop", match: "Rooftop" },
];

export function SearchByArea() {
  const { cafes, browse } = useStore();
  const areas = useMemo(() => {
    const map = new Map();
    cafes.forEach((c) => {
      if (!c.city) return;
      if (!map.has(c.city)) map.set(c.city, []);
      map.get(c.city).push(c);
    });
    return [...map.entries()]
      .map(([city, list]) => ({ city, count: list.length, image: imageFor(list) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [cafes]);

  if (areas.length < 2) return null;

  return (
    <section className="mt-8">
      <h2 className="px-1 serif text-2xl text-espresso">Search by area</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {areas.map((a) => (
          <button
            key={a.city}
            onClick={() => browse({ kind: "area", value: a.city, label: a.city })}
            className="lift flex items-center gap-3 overflow-hidden rounded-2xl border border-line bg-card p-2 text-left shadow-card"
          >
            <span className="h-16 w-20 shrink-0 overflow-hidden rounded-xl" style={{ background: "linear-gradient(135deg,#dcc9a8,#a9855a)" }}>
              {a.image && <img src={a.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate serif text-xl leading-tight text-espresso">{a.city}</span>
              <span className="text-xs font-medium text-brown/55">{fmt(a.count)} places</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function SearchByCategory() {
  const { cafes, browse } = useStore();
  const cats = useMemo(
    () =>
      CATEGORY_DEFS.map((d) => {
        const list = cafes.filter((c) => placeMatches(c, d.match));
        return { ...d, count: list.length, image: imageFor(list) };
      }).filter((d) => d.count > 0),
    [cafes]
  );

  if (!cats.length) return null;

  return (
    <section className="mt-8">
      <h2 className="px-1 serif text-2xl text-espresso">Search by category</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 lg:grid-cols-6">
        {cats.map((c) => (
          <button
            key={c.label}
            onClick={() => browse({ kind: "category", value: c.match, label: c.label })}
            className="lift relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-espresso text-left shadow-card"
          >
            {c.image && <img src={c.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-gradient-to-t from-espresso/90 via-espresso/35 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-3">
              <span className="block serif text-lg leading-tight text-cream">{c.label}</span>
              <span className="text-[11px] font-medium text-cream/80">{fmt(c.count)} places</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
