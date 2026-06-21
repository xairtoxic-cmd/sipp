"use client";

import { useEffect, useMemo, useState } from "react";
import { CAFES, REVIEWS, CATEGORIES, DROPS, cafeById } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Icon } from "../Icons";
import { SectionHeader, PrimaryButton, CafeImage } from "../UI";
import { LargeCafeCard, Carousel } from "../CafeCard";
import { ReviewCard, PublicReviewCard } from "../ReviewCard";
import { LogoHeader, HeaderIconButton } from "../Chrome";

function DropsRow() {
  const { openCafe } = useStore();
  return (
    <div className="no-scrollbar -mx-5 mt-4 flex gap-3 overflow-x-auto px-5">
      {DROPS.map((d) => {
        const cafe = cafeById(d.cafeId);
        if (!cafe) return null;
        return (
          <button
            key={d.id}
            onClick={() => openCafe(cafe.id)}
            className="w-64 shrink-0 overflow-hidden rounded-xl2 border border-line bg-card text-left shadow-card"
          >
            <div className="relative">
              <CafeImage src={cafe.images[0]} alt={cafe.name} seed={cafe.id} rounded="rounded-none" className="h-28 w-full" />
              <span className="absolute left-2.5 top-2.5 rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cream">
                Drop · {d.when}
              </span>
            </div>
            <div className="p-3">
              <h4 className="serif text-lg leading-tight text-espresso">{d.title}</h4>
              <p className="mt-0.5 line-clamp-2 text-xs text-brown/70">{d.desc}</p>
              <p className="mt-1 text-[11px] text-gold">{cafe.name} · {cafe.area}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

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

export default function Discover() {
  const { go, following, getStatus, saves } = useStore();
  const { user } = useAuth();
  const firstName = (user?.name || "there").split(" ")[0];
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("following");
  const [cats, setCats] = useState([]); // selected filter categories
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [greeting, setGreeting] = useState("Hello,");

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));
  }, []);

  const matchCats = (c) => cats.length === 0 || cats.every((cat) => (c.features || c.tags).includes(cat));
  const toggleCat = (cat) => setCats((p) => (p.includes(cat) ? p.filter((x) => x !== cat) : [...p, cat]));

  const TABS = [
    { id: "following", label: "Following" },
    { id: "public", label: "Public" },
    { id: "trending", label: "Trending" },
    { id: "nearby", label: "Near You" },
  ];

  const publicReviews = useMemo(
    () => REVIEWS.filter((r) => r.scope === "public" && matchCats(cafeById(r.cafeId) || { features: [] })),
    [cats]
  );

  // Personalized "Recommended for you" — from the signup survey (taste tags +
  // preferred shops) and what the user has liked / saved / loved.
  const recommended = useMemo(() => {
    const weights = {};
    const add = (tag, w) => {
      if (tag) weights[tag] = (weights[tag] || 0) + w;
    };
    (user?.tasteTags || []).forEach((t) => add(TASTE_TO_TAG[t] || t, 2));
    const prefs = Array.isArray(user?.prefCafe) ? user.prefCafe : user?.prefCafe ? [user.prefCafe] : [];
    prefs.forEach((id) => cafeById(id)?.tags.forEach((t) => add(t, 2)));
    CAFES.forEach((c) => {
      const s = getStatus(c.id);
      if (s.loved) c.tags.forEach((t) => add(t, 3));
      else if (s.saved || s.liked) c.tags.forEach((t) => add(t, 2));
    });

    const scored = CAFES.filter((c) => {
      const s = getStatus(c.id);
      return !s.been && !s.notfor && !s.saved && !s.loved; // recommend fresh spots
    }).map((c) => {
      const score = (c.features || c.tags).reduce((sum, t) => sum + (weights[t] || 0), 0);
      return { c, score };
    });

    const hasSignal = Object.keys(weights).length > 0;
    return scored
      .sort((a, b) => b.score - a.score || b.c.sippScore - a.c.sippScore)
      .filter((x) => (hasSignal ? x.score > 0 : true))
      .slice(0, 8)
      .map((x) => x.c);
  }, [user, saves]); // eslint-disable-line react-hooks/exhaustive-deps

  const nearby = useMemo(
    () => CAFES.filter(matchCats).sort((a, b) => b.sippScore - a.sippScore).slice(0, 10),
    [cats]
  );
  const trending = useMemo(
    () => CAFES.filter(matchCats).sort((a, b) => b.reviews - a.reviews).slice(0, 10),
    [cats]
  );
  const friendReviews = useMemo(
    () =>
      REVIEWS.filter(
        (r) =>
          r.scope === "friend" &&
          (r.user === "sara" || following.includes(r.user)) &&
          matchCats(cafeById(r.cafeId) || { features: [] })
      ),
    [following, cats]
  );

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.toLowerCase();
    return CAFES.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.area.toLowerCase().includes(s) ||
        c.tags.some((t) => t.toLowerCase().includes(s))
    );
  }, [q]);

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
              placeholder="Search cafés, areas, or vibes"
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
                  tab === t.id
                    ? "bg-espresso text-cream shadow-card"
                    : "border border-line bg-card text-espresso"
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
          <div className="space-y-4">
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
          {/* Recommended for you — personalized from survey + likes */}
          {recommended.length > 0 && (
            <>
              <SectionHeader title="Recommended" accent="for you" />
              <Carousel cafes={recommended} />
            </>
          )}

          {/* FOLLOWING — friends' reviews (social-first) */}
          {tab === "following" &&
            (following.length === 0 ? (
              <div className="mt-5 rounded-[28px] border border-line bg-card p-5 text-center shadow-soft">
                <h4 className="serif text-2xl text-espresso">Follow people with taste.</h4>
                <p className="mt-1 text-sm text-brown/70">
                  Your feed gets better when you follow friends, creators, and café lovers.
                </p>
                <PrimaryButton className="mt-4" onClick={() => go("social")}>
                  Find people to follow
                </PrimaryButton>
              </div>
            ) : (
              <>
                <SectionHeader title="Featured" accent="drops" />
                <DropsRow />
                <SectionHeader title="Friends'" accent="reviews" action="See all" onAction={() => go("social")} />
                <div className="space-y-4">
                  {friendReviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                  {friendReviews.length === 0 && (
                    <p className="px-1 py-6 text-center text-sm text-brown/65">No friend reviews for this filter yet.</p>
                  )}
                </div>
              </>
            ))}

          {/* PUBLIC — community reviews */}
          {tab === "public" && (
            <div className="mt-5 space-y-3">
              {publicReviews.map((r) => (
                <PublicReviewCard key={r.id} review={r} />
              ))}
              {publicReviews.length === 0 && (
                <p className="px-1 py-6 text-center text-sm text-brown/65">No public reviews for this filter yet.</p>
              )}
            </div>
          )}

          {/* TRENDING */}
          {tab === "trending" && (
            <div className="mt-5 space-y-4">
              {trending.map((c) => (
                <LargeCafeCard key={c.id} cafe={c} />
              ))}
              {trending.length === 0 && (
                <p className="px-1 py-6 text-center text-sm text-brown/65">No cafés match these filters.</p>
              )}
            </div>
          )}

          {/* NEAR YOU */}
          {tab === "nearby" && (
            <div className="mt-5 space-y-4">
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

      {/* Filter panel */}
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

            <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
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
              <button
                onClick={() => setCats([])}
                className="rounded-full px-4 py-3 text-sm font-medium text-brown"
              >
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
