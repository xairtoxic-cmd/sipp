"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { categoryLabel } from "@/lib/seed";
import { Icon } from "./Icons";
import { Avatar, CafeImage, Tag } from "./UI";
import { HeartButton } from "./CafeCard";

// Great-circle distance in km between two {lat,lng} points.
export function distanceKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function fmtDist(km) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

// Instagram-style, image-forward post for the Home feed.
export function FeedPost({ review }) {
  const {
    getProfile, cafeById, openCafe, openUser, following, toggleFollow,
    reviewLikes, toggleReviewLike, likeCountFor, comments, setCommentReviewId,
    getStatus, toggleSave, openShare, userLoc,
  } = useStore();
  const user = getProfile(review.user);
  const cafe = cafeById(review.cafeId);
  if (!cafe) return null;
  const img = review.photo || cafe.images?.[0];
  const liked = !!reviewLikes[review.id];
  const saved = getStatus(cafe.id).saved;
  const isFollowing = following.includes(user.id);
  const dist = userLoc && cafe.lat != null ? fmtDist(distanceKm(userLoc, { lat: cafe.lat, lng: cafe.lng })) : null;
  const score = (review.overall ?? cafe.sippScore ?? 0).toFixed(1);
  const commentCount = comments[review.id]?.length || 0;

  return (
    <article className="overflow-hidden border-y border-line bg-card animate-rise sm:rounded-3xl sm:border sm:shadow-card">
      {/* header */}
      <div className="flex items-center gap-3 p-3">
        <button onClick={() => openUser(user.id)}>
          <Avatar user={user} size={40} ring />
        </button>
        <button onClick={() => openUser(user.id)} className="min-w-0 flex-1 text-left">
          <p className="serif text-base leading-tight text-espresso">{user.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-brown/60">
            <span className="truncate">{cafe.area}</span>
            {dist && (
              <span className="flex shrink-0 items-center gap-0.5 text-gold">
                <Icon name="pin" size={11} /> {dist}
              </span>
            )}
          </p>
        </button>
        <button
          onClick={() => toggleFollow(user.id)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition active:scale-95 ${
            isFollowing ? "border border-line bg-ivory text-brown" : "bg-espresso text-cream"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>

      {/* image */}
      <button onClick={() => openCafe(cafe.id)} className="relative block w-full">
        <CafeImage
          src={img}
          alt={cafe.name}
          seed={cafe.id}
          query={review.photo ? undefined : `${cafe.name}, ${cafe.area}`}
          rounded="rounded-none"
          className="aspect-[4/5] w-full"
        />
        <span className="absolute left-3 top-3 rounded-2xl bg-espresso/90 px-2.5 py-1 serif text-2xl font-bold leading-none text-cream backdrop-blur-sm">
          {score}
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/85 via-espresso/20 to-transparent p-4 pt-12 text-left">
          <span className="block serif text-2xl leading-tight text-cream drop-shadow">{cafe.name}</span>
          <span className="text-xs text-cream/85">{categoryLabel(cafe)} · {cafe.area}</span>
        </span>
      </button>

      {/* actions */}
      <div className="flex items-center gap-5 px-4 pt-3 text-espresso">
        <button onClick={() => toggleReviewLike(review.id)} className="flex items-center transition active:scale-90">
          <span key={liked ? "on" : "off"} className={liked ? "animate-heartBurst" : ""}>
            <Icon name="heart" size={24} fill={liked ? "currentColor" : "none"} className={liked ? "text-[#B3415B]" : ""} />
          </span>
        </button>
        <button onClick={() => setCommentReviewId(review.id)} className="flex items-center gap-1.5 text-sm transition active:scale-90">
          <Icon name="chat" size={23} />
        </button>
        <button onClick={() => openShare(cafe.id)} className="flex items-center gap-1.5 text-sm transition active:scale-90">
          <Icon name="send" size={22} />
        </button>
        <button onClick={() => toggleSave(cafe.id)} className={`ml-auto transition active:scale-90 ${saved ? "text-gold" : ""}`}>
          <Icon name="bookmark" size={23} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* meta + caption */}
      <div className="px-4 pb-4 pt-2">
        {likeCountFor(review.id) > 0 && (
          <p className="text-sm font-semibold text-espresso">{likeCountFor(review.id).toLocaleString()} likes</p>
        )}
        <p className="mt-0.5 text-sm leading-snug text-espresso/90">
          <button onClick={() => openUser(user.id)} className="font-semibold">{user.name}</button> {review.text}
        </p>
        {commentCount > 0 && (
          <button onClick={() => setCommentReviewId(review.id)} className="mt-1 text-xs text-brown/55">
            View {commentCount === 1 ? "1 comment" : `all ${commentCount} comments`}
          </button>
        )}
      </div>
    </article>
  );
}

const hashNum = (s) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

// Sample the top of the photo to decide white-on-photo vs white-banner-black-text.
function useTopBrightness(src) {
  const [mode, setMode] = useState("dark");
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 24;
        c.height = 12;
        const ctx = c.getContext("2d");
        const sh = Math.max(1, Math.floor(im.naturalHeight * 0.4));
        ctx.drawImage(im, 0, 0, im.naturalWidth, sh, 0, 0, 24, 12);
        const d = ctx.getImageData(0, 0, 24, 12).data;
        let sum = 0;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          n++;
        }
        if (!cancelled) setMode(sum / n > 165 ? "light" : "dark");
      } catch {
        if (!cancelled) setMode("dark");
      }
    };
    im.onerror = () => !cancelled && setMode("dark");
    im.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return mode;
}

function ScorePill({ label, value }) {
  return (
    <span className="rounded-full bg-gold/12 px-2.5 py-1 text-[11px] font-medium text-gold">
      {label} {value.toFixed(1)}
    </span>
  );
}

function UserLine({ user, time }) {
  const { openUser } = useStore();
  if (!user) return null;
  return (
    <button onClick={() => openUser(user.id)} className="flex items-center gap-2.5 text-left">
      <Avatar user={user} size={42} />
      <div>
        <p className="flex items-center gap-1 serif text-xl leading-none text-espresso">
          {user.name} {user.sparkle && <span className="text-gold">✨</span>}
        </p>
        <p className="mt-1 text-xs text-brown/60">
          {user.username} · {time} ago
        </p>
      </div>
    </button>
  );
}

function ReviewActions({ review }) {
  const { reviewLikes, toggleReviewLike, comments, setCommentReviewId, getStatus, toggleSave, openShare } = useStore();
  const liked = reviewLikes[review.id];
  const commentCount = comments[review.id]?.length || 0;
  const saved = getStatus(review.cafeId).saved;

  const Item = ({ icon, label, active, onClick, fill }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-sm font-medium transition active:scale-95 ${active ? "text-gold" : "text-brown/75"}`}
    >
      <Icon name={icon} size={21} fill={active && fill ? "currentColor" : "none"} />
      {label}
    </button>
  );

  return (
    <div className="mt-3 flex items-center justify-between border-t border-line pt-3.5">
      <Item icon="heart" label={liked ? "Liked" : "Like"} active={liked} fill onClick={() => toggleReviewLike(review.id)} />
      <Item icon="chat" label={commentCount ? `Comment · ${commentCount}` : "Comment"} onClick={() => setCommentReviewId(review.id)} />
      <Item icon="bookmark" label={saved ? "Saved" : "Save"} active={saved} fill onClick={() => toggleSave(review.cafeId)} />
      <Item icon="send" label="Share" onClick={() => openShare(review.cafeId)} />
    </div>
  );
}

// Inner café preview used inside review cards
function CafePreview({ cafe, compact = false }) {
  const { openCafe } = useStore();
  return (
    <button
      onClick={() => openCafe(cafe.id)}
      className="mt-3 block w-full overflow-hidden rounded-xl2 border border-line bg-ivory text-left"
    >
      <div className="relative">
        <CafeImage src={cafe.images[0]} alt={cafe.name} seed={cafe.id} query={`${cafe.name}, ${cafe.area}`} rounded="rounded-none" className={compact ? "h-32 w-full" : "h-44 w-full"} />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-cream/85 px-2.5 py-1 text-xs font-medium text-espresso backdrop-blur">
          <Icon name="star" size={12} fill="currentColor" /> {cafe.rating}
        </div>
        <div className="absolute right-3 top-3">
          <HeartButton cafeId={cafe.id} size={15} />
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="serif text-xl leading-tight text-espresso">{cafe.name}</h4>
          <span className="serif text-base text-gold">Sipp {cafe.sippScore.toFixed(1)}</span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-brown/70">
          <Icon name="pin" size={12} /> {cafe.area}
        </p>
      </div>
    </button>
  );
}

export function ReviewCard({ review }) {
  const { openCafe, openUser, reviewLikes, likeCountFor, getProfile, cafeById } = useStore();
  const user = getProfile(review.user);
  const cafe = cafeById(review.cafeId);
  // The reviewer's own uploaded photo takes priority over the place's stock photo.
  const heroSrc = review.photo || cafe?.images?.[0];
  const mode = useTopBrightness(heroSrc);
  if (!cafe) return null;

  const tag = (review.tags && review.tags[0]) || cafe.tags[0];
  const liked = reviewLikes[review.id];
  const likeCount = likeCountFor(review.id);

  return (
    <article className="overflow-hidden rounded-[28px] border border-line bg-card shadow-soft">
      {/* 1. Photo with reviewer overlay (uploaded photo if there is one) */}
      <div className="relative cursor-pointer" onClick={() => openCafe(cafe.id)}>
        <CafeImage src={heroSrc} alt={cafe.name} seed={cafe.id} query={review.photo ? undefined : `${cafe.name}, ${cafe.area}`} rounded="rounded-none" className="h-80 w-full" />

        {mode === "dark" ? (
          <div className="absolute inset-x-0 top-0 flex items-center gap-2.5 bg-gradient-to-b from-black/55 via-black/25 to-transparent px-4 pb-6 pt-4 text-white">
            <button onClick={(e) => { e.stopPropagation(); openUser(user.id); }}>
              <Avatar user={user} size={38} ring />
            </button>
            <button onClick={(e) => { e.stopPropagation(); openUser(user.id); }} className="text-left">
              <p className="flex items-center gap-1 serif text-lg leading-none">
                {user.name} {user.sparkle && <span>✨</span>}
              </p>
              <p className="mt-1 text-[11px] text-white/85">
                {tag} · {review.time} ago
              </p>
            </button>
          </div>
        ) : (
          <div className="absolute inset-x-0 top-0 flex items-center gap-2.5 border-b border-black/5 bg-white/90 px-4 py-3 text-espresso backdrop-blur-sm">
            <button onClick={(e) => { e.stopPropagation(); openUser(user.id); }}>
              <Avatar user={user} size={38} ring />
            </button>
            <button onClick={(e) => { e.stopPropagation(); openUser(user.id); }} className="text-left">
              <p className="flex items-center gap-1 serif text-lg leading-none text-espresso">
                {user.name} {user.sparkle && <span className="text-gold">✨</span>}
              </p>
              <p className="mt-1 text-[11px] text-brown/70">
                {tag} · {review.time} ago
              </p>
            </button>
          </div>
        )}
      </div>

      {/* 2. Like · Comment · Save · Share */}
      <div className="px-4 pt-3">
        <ReviewActions review={review} />
      </div>

      {/* 3. Liked by */}
      {likeCount > 0 && (
        <p className="px-4 pt-2 text-xs text-brown/70">
          {liked ? "You" : "Liked"} {liked && likeCount > 1 ? `and ${likeCount - 1} others like this` : liked ? "like this" : `by ${likeCount}`}
        </p>
      )}

      {/* 4. Review text — reviewer name in bold, then the review */}
      {review.text && (
        <p className="px-4 pt-2 text-[15px] leading-relaxed text-espresso/90">
          <button onClick={() => openUser(user.id)} className="font-semibold text-espresso">{user.name}</button>{" "}
          {review.text}
        </p>
      )}

      {/* 5. Café + rating bottom right */}
      <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-2.5">
        <button onClick={() => openCafe(cafe.id)} className="flex items-center gap-1 text-left text-xs text-brown/70">
          <Icon name="pin" size={12} /> {cafe.name} · {cafe.area}
        </button>
        <span className="serif text-3xl font-bold leading-none text-espresso">{review.overall.toFixed(1)}</span>
      </div>
    </article>
  );
}

export function PublicReviewCard({ review }) {
  const { openUser, openCafe, following, toggleFollow, getStatus, toggleSave, getProfile, cafeById, openShare, reviewLikes, toggleReviewLike, likeCountFor, comments, setCommentReviewId } = useStore();
  const user = getProfile(review.user);
  const cafe = cafeById(review.cafeId);
  if (!cafe) return null;
  const isFollowing = following.includes(user.id);
  const saved = getStatus(cafe.id).saved;

  return (
    <article className="lift animate-rise rounded-[24px] border border-line bg-card p-3.5 shadow-card">
      <div className="flex items-center gap-3">
        <button onClick={() => openUser(user.id)}>
          <Avatar user={user} size={38} />
        </button>
        <button onClick={() => openUser(user.id)} className="min-w-0 flex-1 text-left">
          <p className="serif text-lg leading-none text-espresso">{user.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-brown/60">{user.taste}</p>
        </button>
        <button
          onClick={() => toggleFollow(user.id)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
            isFollowing ? "border border-line bg-ivory text-brown" : "bg-espresso text-cream"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        <button onClick={() => openCafe(cafe.id)} className="shrink-0">
          <CafeImage src={review.photo || cafe.images[0]} alt={cafe.name} seed={cafe.id} query={review.photo ? undefined : `${cafe.name}, ${cafe.area}`} className="h-20 w-20" />
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={() => openCafe(cafe.id)} className="block text-left">
            <h4 className="serif text-lg leading-tight text-espresso">{cafe.name}</h4>
            <p className="text-[11px] text-brown/70">{cafe.area}</p>
          </button>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-espresso/85">“{review.text}”</p>
        </div>
      </div>

      <span className="mt-3 inline-block rounded-full bg-gold/12 px-2.5 py-1 text-[11px] font-medium text-gold">
        {user.name} rated it {review.overall.toFixed(1)}
      </span>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
        <button
          onClick={() => toggleReviewLike(review.id)}
          className={`flex items-center gap-1.5 text-xs transition active:scale-95 ${reviewLikes[review.id] ? "text-gold" : "text-brown/70"}`}
        >
          <span key={reviewLikes[review.id] ? "on" : "off"} className={reviewLikes[review.id] ? "animate-heartBurst" : ""}>
            <Icon name="heart" size={16} fill={reviewLikes[review.id] ? "currentColor" : "none"} />
          </span>
          {likeCountFor(review.id) || "Like"}
        </button>
        <button onClick={() => setCommentReviewId(review.id)} className="flex items-center gap-1.5 text-xs text-brown/70 transition active:scale-95">
          <Icon name="chat" size={16} /> {comments[review.id]?.length || "Comment"}
        </button>
        <button onClick={() => toggleSave(cafe.id)} className={`flex items-center gap-1.5 text-xs transition active:scale-95 ${saved ? "text-gold" : "text-brown/70"}`}>
          <Icon name="bookmark" size={16} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}
        </button>
        <button onClick={() => openShare(cafe.id)} className="flex items-center gap-1.5 text-xs text-brown/70 transition active:scale-95">
          <Icon name="share" size={16} /> Share
        </button>
      </div>
    </article>
  );
}
