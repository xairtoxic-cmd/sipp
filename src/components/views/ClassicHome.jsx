"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, placeMatches } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Icon } from "../Icons";
import { SectionHeader, PrimaryButton, useBodyScrollLock } from "../UI";
import { LargeCafeCard, Carousel } from "../CafeCard";
import { ReviewCard, PublicReviewCard } from "../ReviewCard";
import { LogoHeader, HeaderIconButton } from "../Chrome";

// Map signup taste chips onto café tags/features.
const TASTE_TO_TAG = {
  Coffee: "Specialty Coffee",
  "Specialty Coffee": "Specialty Coffee",
  Matcha: "Matcha",
  Brunch: "Brunch",
  Dessert: "Dessert",
  "Quiet Cafés": "Quiet",
  "Aesthetic Spots": "Aesthetic",
  "Laptop Friendly": "Laptop Friendly",
  "Date Night": "Date Night",
  "Hidden Gems": "Hidden Gems",
  Luxury: "Luxury",
  "Outdoor Seating": "Outdoor Seating",
  "Study Cafés": "Study",
  "Late Night": "Late Night",
};

function greetingFor(h) {
  if (h < 12) return "Good morning,";
  if (h < 18) return "Good afternoon,";
  return "Good evening,";
}

// The original desktop Home — time-of-day picks + a friends/trending/near-you feed.
export default function ClassicHome() {
  const { go, following, getStatus, saves, reviews: allReviews, cafes, cityCafes, cafeById, myCity, recommendScore, recommendReasons, tasteMatchWith } = useStore();
  const { user } = useAuth();
  const firstName = (user?.name || "there").split(" ")[0];
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("following");
  const [cats, setCats] = useState([]); // selected filter categories
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [greeting, setGreeting] = useState("Hello,");
  const [hour, setHour] = useState(9);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(greetingFor(h));
    setHour(h);
  }, []);

  useBodyScrollLock(filterOpen);

  const timeCtx =
    hour < 11
      ? { title: "Best for your", accent: "morning", pick: (c) => c.category === "cafe" }
      : hour < 16
      ? { title: "Best spots this", accent: "afternoon", pick: (c) => c.category === "cafe" }
      : hour < 22
      ? { title: "Best dining", accent: "tonight", pick: (c) => c.category === "fine_dining" }
      : { title: "Open", accent: "late night", pick: (c) => (c.features || c.tags).includes("Late Night") };

  const matchCats = (c) => cats.length === 0 || cats.every((cat) => placeMatches(c, cat));
  const toggleCat = (cat) => setCats((p) => (p.includes(cat) ? p.filter((x) => x !== cat) : [...p, cat]));

  const TABS = [
    { id: "following", label: "Feed" },
    { id: "trending", label: "Trending" },
    { id: "nearby", label: "Near You" },
  ];

  const friendReviews = useMemo(
    () =>
      allReviews
        .filter((r) => r.scope === "friend" && matchCats(cafeById(r.cafeId) || { features: [] }))
        .sort((a, b) => tasteMatchWith(b.user) - tasteMatchWith(a.user)),
    [allReviews, cats, tasteMatchWith] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const publicReviews = useMemo(
    () =>
      allReviews
        .filter((r) => r.scope === "public" && matchCats(cafeById(r.cafeId) || { features: [] }))
        .sort((a, b) => recommendScore(cafeById(b.cafeId) || {}) - recommendScore(cafeById(a.cafeId) || {})),
    [allReviews, cats, recommendScore] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const timePicks = useMemo(() => {
    const score = (c) => recommendScore(c, { hour });
    const list = cityCafes.filter((c) => timeCtx.pick(c) && matchCats(c)).sort((a, b) => score(b) - score(a));
    const fallback = cityCafes.filter(matchCats).sort((a, b) => score(b) - score(a));
    return (list.length ? list : fallback).slice(0, 10);
  }, [cityCafes, cats, hour, recommendScore]); // eslint-disable-line react-hooks/exhaustive-deps

  const nearby = useMemo(
    () => cityCafes.filter(matchCats).sort((a, b) => b.sippScore - a.sippScore).slice(0, 10),
    [cats, cityCafes] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const trending = useMemo(
    () => cityCafes.filter(matchCats).sort((a, b) => b.reviews - a.reviews).slice(0, 10),
    [cats, cityCafes] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.toLowerCase();
    let list = cafes;
    if (s.includes("sipp star")) list = list.filter((c) => c.hasSippStar);
    if (s.includes("sipp rated")) list = list.filter((c) => c.isSippRated);
    if (/\b(caf[eé]|coffee|matcha|brunch)\b/.test(s)) list = list.filter((c) => c.category === "cafe");
    if (/\b(fine|dining|restaurant)\b/.test(s)) list = list.filter((c) => c.category === "fine_dining");
    const rest = s.replace(/sipp star|sipp rated|caf[eé]s?|coffee|fine dining|fine|dining|restaurant|best/g, "").trim();
    if (rest) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(rest) ||
          c.area.toLowerCase().includes(rest) ||
          c.tags.some((t) => t.toLowerCase().includes(rest))
      );
    }
    return list.slice(0, 40);
  }, [q, cafes]);

  return (
    <div className="px-5 pb-32">
      <LogoHeader
        left={<HeaderIconButton icon="menu" label="Menu" onClick={() => go("lists")} />}
        right={<HeaderIconButton icon="people" label="Friends" onClick={() => go("social")} />}
      >
        <div className="mt-2 flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-xs text-brown/70">{greeting}</p>
            <h1 className="serif text-3xl leading-none text-espresso">
              {firstName} <span className="gold-italic">✨</span>
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() =>
                setSearchOpen((v) => {
                  if (v) setQ("");
                  return !v;
                })
              }
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-espresso shadow-card"
              aria-label="Search"
            >
              <Icon name={searchOpen ? "x" : "search"} size={18} />
            </button>
            <button
              onClick={() => setFilterOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-espresso shadow-card"
              aria-label="Filters"
            >
              <Icon name="sliders" size={18} />
              {cats.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-semibold text-cream">
                  {cats.length}
                </span>
              )}
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="mt-2.5 flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 shadow-card animate-fadeIn">
            <Icon name="search" size={18} className="text-brown/60" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cafés, restaurants, areas, or vibes"
              className="w-full bg-transparent text-sm text-espresso placeholder:text-brown/50 focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ("")} className="text-brown/50">
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        )}
        {!q.trim() && (
          <div className="-mx-5 mt-3 flex gap-2 px-5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-full px-4 py-2 text-sm transition ${
                  tab === t.id ? "bg-espresso text-cream shadow-card" : "border border-line bg-card text-espresso"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </LogoHeader>

      {q.trim() ? (
        <>
          <SectionHeader title="Results" accent={`(${results.length})`} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((c) => (
              <LargeCafeCard key={c.id} cafe={c} />
            ))}
            {results.length === 0 && (
              <p className="px-1 py-10 text-center text-sm text-brown/70">No cafés match that yet. Try another vibe.</p>
            )}
          </div>
        </>
      ) : (
        <div>
          {timePicks.length > 0 && (
            <>
              <SectionHeader title={timeCtx.title} accent={timeCtx.accent} />
              <Carousel cafes={timePicks} reasons={(c) => recommendReasons(c, { hour })[0]} />
            </>
          )}

          {tab === "following" && (
            <>
              <SectionHeader title="Friends'" accent="reviews" action="See all" onAction={() => go("social")} />
              {friendReviews.length === 0 ? (
                <div className="rounded-[28px] border border-line bg-card p-5 text-center shadow-soft">
                  <h4 className="serif text-2xl text-espresso">Follow people with taste.</h4>
                  <p className="mt-1 text-sm text-brown/70">Follow friends to see their reviews first. Until then, here's the community.</p>
                  <PrimaryButton className="mt-4" onClick={() => go("social")}>Find people to follow</PrimaryButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {friendReviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              )}

              {publicReviews.length > 0 && (
                <>
                  <SectionHeader title="From the" accent="community" />
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {publicReviews.map((r) => (
                      <PublicReviewCard key={r.id} review={r} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === "trending" && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((c) => (
                <LargeCafeCard key={c.id} cafe={c} />
              ))}
              {trending.length === 0 && (
                <p className="px-1 py-6 text-center text-sm text-brown/65">No cafés match these filters.</p>
              )}
            </div>
          )}

          {tab === "nearby" && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map((c) => (
                <LargeCafeCard key={c.id} cafe={c} />
              ))}
              {nearby.length === 0 && (
                <p className="px-1 py-6 text-center text-sm text-brown/65">No cafés match these filters.</p>
              )}
            </div>
          )}
        </div>
      )}

      {filterOpen && (
        <div
          className="fixed inset-0 z-[1600] flex items-end justify-center bg-espresso/30 backdrop-blur-sm"
          onClick={() => setFilterOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-[460px] flex-col animate-sheetUp rounded-t-xl3 border border-line bg-card pb-[max(env(safe-area-inset-bottom),14px)] shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-3">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-beige" />
              <div className="flex items-center justify-between">
                <h3 className="serif text-3xl text-espresso">Filters</h3>
                <button onClick={() => setFilterOpen(false)} className="text-brown/50">
                  <Icon name="x" size={22} />
                </button>
              </div>
              <p className="mt-0.5 text-sm text-brown/65">Filter by vibe, type and what the café has.</p>
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter((c) => c !== "All").map((f) => {
                  const on = cats.includes(f);
                  return (
                    <button
                      key={f}
                      onClick={() => toggleCat(f)}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        on ? "bg-espresso text-cream shadow-card" : "border border-line bg-ivory text-brown hover:border-gold/60"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-line px-5 pt-3">
              <button onClick={() => setCats([])} className="rounded-full px-4 py-3 text-sm font-medium text-brown">
                Clear{cats.length ? ` (${cats.length})` : ""}
              </button>
              <PrimaryButton className="flex-1" onClick={() => setFilterOpen(false)}>
                Show results
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
