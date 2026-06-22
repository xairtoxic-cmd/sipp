"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "../Icons";
import { PrimaryButton } from "../UI";
import { FeedPost, distanceKm } from "../ReviewCard";
import { LogoHeader, HeaderIconButton } from "../Chrome";

const TABS = [
  { id: "feed", label: "Feed" },
  { id: "following", label: "Following" },
  { id: "nearby", label: "Near you" },
];

// The Instagram-style scrolling feed — used on mobile.
export default function MobileFeed() {
  const {
    go, reviews: allReviews, cafeById, recommendScore, likeCountFor, friendSet,
    following, userLoc, requestLocation,
  } = useStore();
  const [tab, setTab] = useState("feed");
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    requestLocation(); // for distances + "Near you" (no-op if denied)
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const posts = useMemo(
    () => allReviews.filter((r) => cafeById(r.cafeId)),
    [allReviews] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const feed = useMemo(() => {
    const score = (r) => {
      const place = cafeById(r.cafeId) || {};
      const rec = recommendScore(place);
      const likes = Math.min(likeCountFor(r.id), 30) / 30;
      const fr = friendSet.has(r.user) ? 1 : 0;
      const ageDays = now ? (now - (r.createdAt || now)) / 86400000 : 0;
      const recency = Math.max(0, 1 - ageDays / 30);
      return rec * 1.0 + likes * 0.5 + fr * 0.6 + recency * 0.5;
    };
    return [...posts].sort((a, b) => score(b) - score(a));
  }, [posts, recommendScore, friendSet, now]); // eslint-disable-line react-hooks/exhaustive-deps

  const followingFeed = useMemo(
    () => posts.filter((r) => following.includes(r.user)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [posts, following] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const nearFeed = useMemo(() => {
    if (!userLoc) return [];
    return posts
      .map((r) => {
        const c = cafeById(r.cafeId);
        return { r, d: c && c.lat != null ? distanceKm(userLoc, { lat: c.lat, lng: c.lng }) : null };
      })
      .filter((x) => x.d != null)
      .sort((a, b) => a.d - b.d)
      .map((x) => x.r);
  }, [posts, userLoc]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = tab === "feed" ? feed : tab === "following" ? followingFeed : nearFeed;

  return (
    <div className="px-5 pb-32">
      <LogoHeader
        left={<HeaderIconButton icon="menu" label="Menu" onClick={() => go("lists")} />}
        right={<HeaderIconButton icon="people" label="Friends" onClick={() => go("social")} />}
      >
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
      </LogoHeader>

      {tab === "nearby" && !userLoc ? (
        <div className="mt-6 rounded-[28px] border border-line bg-card p-6 text-center shadow-soft">
          <Icon name="near" size={30} className="mx-auto text-gold" />
          <h4 className="mt-2 serif text-2xl text-espresso">See what's around you</h4>
          <p className="mt-1 text-sm text-brown/70">Turn on location to find posts and places closest to you.</p>
          <PrimaryButton className="mt-4" onClick={requestLocation}>Enable location</PrimaryButton>
        </div>
      ) : list.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-line bg-card p-6 text-center shadow-soft">
          {tab === "following" ? (
            <>
              <h4 className="serif text-2xl text-espresso">Follow people with taste.</h4>
              <p className="mt-1 text-sm text-brown/70">Follow others to see their posts here first.</p>
              <PrimaryButton className="mt-4" onClick={() => go("social")}>Find people to follow</PrimaryButton>
            </>
          ) : (
            <p className="py-6 text-sm text-brown/70">No posts yet — be the first to rank a place.</p>
          )}
        </div>
      ) : (
        <div key={tab} className="-mx-5 mt-4 flex flex-col gap-4">
          {list.map((r) => (
            <FeedPost key={r.id} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}
