"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { SectionHeader } from "../UI";
import { Carousel, LargeCafeCard } from "../CafeCard";
import { LogoHeader, HeaderIconButton } from "../Chrome";
import { Icon } from "../Icons";
import { placeMatches } from "@/lib/seed";
import { SearchByArea, SearchByCategory } from "./BrowseSections";

const bySipp = (a, b) => b.sippScore - a.sippScore;
const hasAny = (c, keys) => keys.some((k) => c.tags.includes(k) || (c.features || []).includes(k));

const VIEW_AREAS = [
  "Dubai Marina", "JBR", "Bluewaters", "Palm Jumeirah", "Downtown Dubai", "Dubai Creek Harbour", "Corniche", "Saadiyat", "Yas",
];

// Responsive results grid — fills the wide desktop canvas.
function ResultsGrid({ list }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((c) => (
        <LargeCafeCard key={c.id} cafe={c} />
      ))}
    </div>
  );
}

export default function Explore() {
  const { go, cafes, cityCafes, myCity, exploreQuery, clearExplore } = useStore();
  const [q, setQ] = useState("");

  // Filtered results from "Search by area / category".
  if (exploreQuery) {
    const { kind, value, label } = exploreQuery;
    const results = cafes
      .filter((c) => (kind === "area" ? c.city === value : placeMatches(c, value)))
      .slice()
      .sort(bySipp);
    return (
      <div className="px-5 pb-32 lg:px-8">
        <header className="sticky top-0 z-30 -mx-5 mb-2 flex items-center gap-3 bg-cream/80 px-5 pb-2 pt-3 backdrop-blur-md lg:-mx-8 lg:px-8">
          <button
            onClick={clearExplore}
            aria-label="Back"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-card text-espresso shadow-card"
          >
            <Icon name="back" size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate serif text-3xl leading-none text-espresso">{label}</h1>
            <p className="text-xs text-brown/60">
              {results.length.toLocaleString()} {kind === "area" ? `places in ${label}` : "places across the UAE"}
            </p>
          </div>
        </header>
        {results.length === 0 ? (
          <p className="px-1 py-12 text-center text-sm text-brown/70">Nothing here yet.</p>
        ) : (
          <ResultsGrid list={results} />
        )}
      </div>
    );
  }

  // Free-text search across the whole catalogue.
  const ql = q.trim().toLowerCase();
  const searchResults = ql
    ? cafes
        .filter(
          (c) =>
            c.name.toLowerCase().includes(ql) ||
            (c.area || "").toLowerCase().includes(ql) ||
            (c.city || "").toLowerCase().includes(ql) ||
            (c.tags || []).some((t) => t.toLowerCase().includes(ql))
        )
        .slice()
        .sort(bySipp)
    : [];

  const all = cityCafes;
  const padTo = (list, n) => {
    if (list.length >= n) return list.slice(0, n);
    const ids = new Set(list.map((c) => c.id));
    return [...list, ...[...all].sort(bySipp).filter((c) => !ids.has(c.id))].slice(0, n);
  };

  const cafePlaces = all.filter((c) => c.category === "cafe");
  const fine = all.filter((c) => c.category === "fine_dining");
  const trending = [...all]
    .sort((a, b) => (b.reviews || 0) - (a.reviews || 0) || b.sippScore - a.sippScore)
    .slice(0, 10);
  const fineDining = padTo([...fine].sort(bySipp), 8);
  const dateNight = padTo([...all].filter((c) => hasAny(c, ["Date Night", "Date Spot", "Romantic"])).sort(bySipp), 8);
  const study = padTo([...cafePlaces].filter((c) => hasAny(c, ["Study", "Laptop Friendly", "Study Friendly", "Quiet"])).sort(bySipp), 8);
  const matcha = padTo([...cafePlaces].filter((c) => hasAny(c, ["Matcha", "Dessert"])).sort(bySipp), 8);
  const waterfront = padTo([...fine].filter((c) => hasAny(c, ["Waterfront", "Rooftop"])).sort(bySipp), 8);
  const views = padTo(
    [...all].filter((c) => VIEW_AREAS.some((a) => (c.area || "").includes(a)) || (c.features || []).includes("Rooftop")).sort(bySipp),
    8
  );

  return (
    <div className="px-5 pb-32 lg:px-8">
      <LogoHeader
        left={<HeaderIconButton icon="menu" label="Lists" onClick={() => go("lists")} />}
        right={<HeaderIconButton icon="people" label="Friends" onClick={() => go("social")} />}
      />

      {/* Hero search — first thing on the page */}
      <div className="relative mt-1 lg:mt-2">
        <Icon name="search" size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-brown/45" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Location, cuisine, restaurant name, etc."
          className="w-full rounded-2xl border border-line bg-card py-4 pl-14 pr-5 text-[15px] text-espresso shadow-card placeholder:text-brown/45 focus:border-gold focus:outline-none"
        />
      </div>

      {ql ? (
        <div className="mt-5">
          <SectionHeader title="Results" accent={`(${searchResults.length})`} />
          {searchResults.length === 0 ? (
            <p className="px-1 py-10 text-center text-sm text-brown/70">No places match “{q}”. Try another search.</p>
          ) : (
            <ResultsGrid list={searchResults} />
          )}
        </div>
      ) : (
        <>
          <SectionHeader title="Trending" accent="now" />
          <Carousel cafes={trending} />

          <SearchByArea />
          <SearchByCategory />

          <SectionHeader title="Fine dining" accent="nights" />
          <Carousel cafes={fineDining} />

          <SectionHeader title="Best for" accent="date nights" />
          <Carousel cafes={dateNight} />

          <SectionHeader title="Waterfront &" accent="rooftop" />
          <Carousel cafes={waterfront} />

          <SectionHeader title="Best to" accent="study" />
          <Carousel cafes={study} />

          <SectionHeader title="Best" accent="matcha" />
          <Carousel cafes={matcha} />

          <SectionHeader title="Best with a" accent="view" />
          <Carousel cafes={views} />
        </>
      )}
    </div>
  );
}
