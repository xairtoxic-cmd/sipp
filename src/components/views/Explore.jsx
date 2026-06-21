"use client";

import { CAFES } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { SectionHeader } from "../UI";
import { Carousel } from "../CafeCard";
import { LogoHeader, HeaderIconButton } from "../Chrome";

const bySipp = (a, b) => b.sippScore - a.sippScore;
const hasAny = (c, keys) => keys.some((k) => c.tags.includes(k) || (c.features || []).includes(k));

// Pad a collection with the next best cafés so carousels never look empty.
function padTo(list, n) {
  if (list.length >= n) return list.slice(0, n);
  const ids = new Set(list.map((c) => c.id));
  const extra = [...CAFES].sort(bySipp).filter((c) => !ids.has(c.id));
  return [...list, ...extra].slice(0, n);
}

const VIEW_AREAS = [
  "Dubai Marina", "JBR", "Bluewaters", "Palm Jumeirah", "Downtown Dubai", "Dubai Creek Harbour", "Dubai Mall",
];

export default function Explore() {
  const { go } = useStore();

  const dates = padTo([...CAFES].filter((c) => hasAny(c, ["Date Night", "Date Spot"])).sort(bySipp), 8);
  const study = padTo([...CAFES].filter((c) => hasAny(c, ["Study", "Laptop Friendly", "Study Friendly", "Quiet"])).sort(bySipp), 8);
  const matcha = padTo([...CAFES].filter((c) => hasAny(c, ["Matcha", "Dessert"])).sort(bySipp), 8);
  const views = padTo(
    [...CAFES].filter((c) => VIEW_AREAS.some((a) => c.area.includes(a)) || (c.features || []).includes("Rooftop")).sort(bySipp),
    8
  );

  return (
    <div className="px-5 pb-32">
      <LogoHeader
        left={<HeaderIconButton icon="menu" label="Lists" onClick={() => go("lists")} />}
        right={<HeaderIconButton icon="people" label="Friends" onClick={() => go("social")} />}
      >
        <h1 className="mt-2 px-1 serif text-4xl text-espresso">
          Discover <span className="gold-italic">Dubai</span>
        </h1>
        <p className="mt-0.5 px-1 text-sm text-brown/70">Curated café collections for every mood.</p>
      </LogoHeader>

      <SectionHeader title="Best for" accent="date nights" />
      <Carousel cafes={dates} />

      <SectionHeader title="Best to" accent="study" />
      <Carousel cafes={study} />

      <SectionHeader title="Best" accent="matcha" />
      <Carousel cafes={matcha} />

      <SectionHeader title="Best with a" accent="view" />
      <Carousel cafes={views} />
    </div>
  );
}
