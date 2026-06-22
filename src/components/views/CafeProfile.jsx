"use client";

import { useEffect, useState } from "react";
import { personalityFor, bestTimeFor, crowdFor, menuFor, isFineDining, prettyDomain } from "@/lib/seed";
import { getBestBookingMethod, reservationStatus } from "@/lib/booking";
import { useStore } from "@/lib/store";
import { Icon } from "../Icons";
import { Avatar, Tag, CafeImage, PrimaryButton, GhostButton, Stars, SippBadges } from "../UI";
import { CafeCard } from "../CafeCard";
import { ShareCard } from "../ShareCard";
import MenuSheet from "../MenuSheet";

const PHOTOS_ENABLED = process.env.NEXT_PUBLIC_PLACES_PHOTOS === "1";

function ActionPill({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-4 py-3 text-xs transition ${
        active ? "border-gold bg-gold/10 text-espresso" : "border-line bg-card text-brown"
      }`}
    >
      <span className={active ? "text-gold" : "text-espresso"}>
        <Icon name={icon} size={20} fill={active && (icon === "heart" || icon === "bookmark") ? "currentColor" : "none"} />
      </span>
      {label}
    </button>
  );
}

function AddToListSheet({ cafeId, onClose }) {
  const { lists, addToList } = useStore();
  const myLists = lists.filter((l) => l.owner === "me");
  return (
    <div className="fixed inset-0 z-[1600] flex items-end justify-center bg-espresso/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[460px] animate-sheetUp rounded-t-xl3 border border-line bg-card p-5 pb-10 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-beige" />
        <h3 className="serif text-3xl text-espresso">Add to list</h3>
        <div className="mt-4 space-y-2">
          {myLists.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                addToList(l.id, cafeId);
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-ivory px-4 py-3 text-left"
            >
              <span className="text-sm text-espresso">{l.title}</span>
              <span className="text-xs text-brown/60">
                {l.cafeIds.includes(cafeId) ? "Added" : `${l.cafeIds.length} places`}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CafeProfile({ cafeId }) {
  const { closeCafe, getStatus, toggleSave, toggleWant, toggleBeen, toggleLoved, toggleNotFor, goRank, ranks, reviews, getProfile, openUser, cafes, cafeById, reserve } = useStore();
  const cafe = cafeById(cafeId);
  const cafeReviews = reviews.filter((r) => r.cafeId === cafeId);
  const friendThoughts = cafeReviews.filter((r) => r.scope === "friend");
  const community = cafeReviews.filter((r) => r.scope === "public");
  const [listSheet, setListSheet] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gallery, setGallery] = useState(0);
  const [realPhotos, setRealPhotos] = useState([]);
  const touchX = useState({ x: 0 })[0];

  // Fetch several real photos for the swipeable gallery.
  useEffect(() => {
    if (!PHOTOS_ENABLED || !cafe) return;
    let cancelled = false;
    fetch(`/api/places/photo?q=${encodeURIComponent(`${cafe.name}, ${cafe.area}`)}&n=6`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.urls?.length) {
          setRealPhotos(d.urls);
          setGallery(0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cafeId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cafe) return null;
  const status = getStatus(cafe.id);
  const myRank = ranks[cafe.id];
  const personality = personalityFor(cafe);
  const galleryImages = realPhotos.length ? realPhotos : cafe.images;
  const idx = Math.min(gallery, galleryImages.length - 1);

  function onTouchStart(e) {
    touchX.x = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchX.x;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setGallery((g) => Math.min(galleryImages.length - 1, g + 1));
    else setGallery((g) => Math.max(0, g - 1));
  }
  const fine = isFineDining(cafe);
  const bookingMethod = getBestBookingMethod(cafe);
  const resStatus = reservationStatus(cafe);
  const menuPreview = menuFor(cafe)[0] || { items: [] };

  // Similar = same category + shared tags (prefer same city).
  const similar = cafes
    .filter((c) => c.id !== cafe.id && c.category === cafe.category && c.tags.some((t) => cafe.tags.includes(t)))
    .sort((a, b) => (a.city === cafe.city ? -1 : 1) - (b.city === cafe.city ? -1 : 1))
    .slice(0, 6);

  return (
    <div className={`fixed inset-0 z-[1500] animate-fadeJustIn bg-cream no-scrollbar ${listSheet || shareOpen || menuOpen ? "overflow-hidden" : "overflow-y-auto"}`}>
      {/* Hero */}
      <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <CafeImage
          key={idx}
          src={galleryImages[idx]}
          alt={cafe.name}
          seed={cafe.id}
          rounded="rounded-none"
          className="h-72 w-full"
        />
        <button
          onClick={closeCafe}
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-cream/90 text-espresso shadow-card backdrop-blur"
        >
          <Icon name="back" size={20} />
        </button>
        <div className="absolute right-4 top-4 flex gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-cream/90 text-espresso shadow-card backdrop-blur"
          >
            <Icon name="share" size={18} />
          </button>
          <button
            onClick={() => toggleSave(cafe.id)}
            className="grid h-10 w-10 place-items-center rounded-full bg-cream/90 shadow-card backdrop-blur"
          >
            <span className={status.saved ? "text-gold" : "text-espresso"}>
              <Icon name="heart" size={20} fill={status.saved ? "currentColor" : "none"} />
            </span>
          </button>
        </div>
        {galleryImages.length > 1 && (
          <>
            {/* photo counter */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-espresso/70 px-2.5 py-1 text-[11px] font-medium text-cream backdrop-blur">
              <Icon name="grid" size={11} /> {idx + 1} / {galleryImages.length}
            </div>
            {/* tap arrows */}
            {idx > 0 && (
              <button
                onClick={() => setGallery((g) => Math.max(0, g - 1))}
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-cream/85 text-espresso shadow-card backdrop-blur"
                aria-label="Previous photo"
              >
                <Icon name="back" size={18} />
              </button>
            )}
            {idx < galleryImages.length - 1 && (
              <button
                onClick={() => setGallery((g) => Math.min(galleryImages.length - 1, g + 1))}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-cream/85 text-espresso shadow-card backdrop-blur"
                aria-label="Next photo"
              >
                <Icon name="back" size={18} className="rotate-180" />
              </button>
            )}
          </>
        )}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {galleryImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setGallery(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-cream" : "w-1.5 bg-cream/60"}`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[460px] px-5 pb-28">
        <div className="-mt-8 rounded-xl3 border border-line bg-card p-5 shadow-float">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="serif text-4xl leading-none text-espresso">{cafe.name}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-brown/80">
                <Icon name="pin" size={14} /> {fine ? "Fine Dining" : "Café"} · {cafe.area}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-ivory px-3 py-2 text-center">
              <p className="serif text-2xl leading-none text-gold">{cafe.sippScore.toFixed(1)}</p>
              <p className="text-[9px] uppercase tracking-wide text-brown/60">Sipp Score</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-gold">
              <Icon name="star" size={14} fill="currentColor" /> {cafe.rating}
            </span>
            <span className="text-brown/50">({cafe.reviews})</span>
            <span className="text-brown/40">·</span>
            <span className="text-brown/80">{"$".repeat(cafe.price)}</span>
            <span className="text-brown/40">·</span>
            <span className={cafe.openNow ? "text-green-700/80" : "text-red-700/70"}>
              {cafe.openNow ? "Open now" : "Closed"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cafe.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
          {(cafe.hasSippStar || cafe.isSippRated) && <SippBadges place={cafe} className="mt-3" />}
        </div>

        {/* Actions */}
        <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
          <ActionPill icon="heart" label="Save" active={status.saved} onClick={() => toggleSave(cafe.id)} />
          <ActionPill icon="bookmark" label="Want to Try" active={status.want} onClick={() => toggleWant(cafe.id)} />
          <ActionPill icon="check" label="Been Here" active={status.been} onClick={() => toggleBeen(cafe.id)} />
          <ActionPill icon="star" label="Loved It" active={status.loved} onClick={() => toggleLoved(cafe.id)} />
          <ActionPill icon="x" label="Not for Me" active={status.notfor} onClick={() => toggleNotFor(cafe.id)} />
          <ActionPill icon="trophy" label="Rank" active={!!myRank} onClick={() => goRank(cafe.id)} />
          <ActionPill icon="list" label="Add to List" onClick={() => setListSheet(true)} />
        </div>

        {/* Reserve */}
        {bookingMethod ? (
          <div className="mt-4">
            <PrimaryButton className="w-full !py-3.5 text-base" onClick={() => reserve(cafe)}>
              <Icon name="cup" size={18} /> {fine ? "Reserve Table" : "Reserve"}
            </PrimaryButton>
            <p className="mt-1.5 text-center text-xs text-brown/65">
              {resStatus}{cafe.depositRequired ? " · Deposit may be required" : ""}
            </p>
          </div>
        ) : cafe.walkInOnly ? (
          <p className="mt-4 rounded-xl2 border border-line bg-card px-4 py-3 text-center text-sm text-brown/70 shadow-card">
            Walk-in only
          </p>
        ) : null}

        {myRank && (
          <div className="mt-4 rounded-xl2 border border-gold/40 bg-gold/5 p-4">
            <p className="text-xs uppercase tracking-wide text-gold">Your ranking</p>
            <div className="mt-1 flex items-center justify-between">
              <Stars value={Math.round(myRank.overall / 2)} />
              <span className="serif text-2xl text-espresso">{myRank.overall.toFixed(1)}</span>
            </div>
            {myRank.review && <p className="mt-1 text-sm text-brown/80">“{myRank.review}”</p>}
          </div>
        )}

        {/* Info */}
        <div className="mt-4 space-y-2 rounded-xl2 border border-line bg-card p-4 text-sm shadow-card">
          <p className="text-brown/90">{cafe.blurb}</p>
          <div className="grid grid-cols-1 gap-2 pt-2">
            {cafe.hours && <Row icon="clock" text={`Open ${cafe.hours}`} />}
            <Row icon="pin" text={cafe.address} />
            {cafe.phone && <Row icon="phone" text={cafe.phone} />}
            {cafe.website && <Row icon="globe" text={prettyDomain(cafe.website)} />}
          </div>
          <div className="flex gap-2 pt-2">
            <PrimaryButton
              className="flex-1 !py-2.5"
              onClick={() =>
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${cafe.lat},${cafe.lng}`, "_blank")
              }
            >
              <Icon name="directions" size={16} /> Directions
            </PrimaryButton>
            {cafe.website && (
              <GhostButton
                className="!px-4 !py-2.5"
                onClick={() => window.open(cafe.website.startsWith("http") ? cafe.website : `https://${cafe.website}`, "_blank")}
              >
                Website
              </GhostButton>
            )}
          </div>
        </div>

        {/* Sipp Rating */}
        <h3 className="mb-3 mt-6 serif text-2xl text-espresso">
          Sipp <span className="gold-italic">rating</span>
        </h3>
        <div className="space-y-3 rounded-xl2 border border-line bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-brown/80">Community Score</span>
            <span className="serif text-2xl leading-none text-espresso">{(cafe.communityScore ?? cafe.sippScore ?? 0).toFixed(1)}</span>
          </div>
          {cafe.isSippRated && (
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="inline-flex items-center gap-2 text-sm text-brown/80">
                <span className="rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold">Sipp Rated</span>
              </span>
              <span className="serif text-2xl leading-none text-gold">{(cafe.sippRatedScore ?? cafe.communityScore ?? cafe.sippScore ?? 0).toFixed(1)}</span>
            </div>
          )}
          {cafe.hasSippStar && (
            <div className="flex items-start gap-2 border-t border-line pt-3">
              <span className="rounded-full bg-espresso px-2.5 py-1 text-[10px] font-semibold text-gold">★ Sipp Star</span>
              <span className="text-xs text-brown/70">Awarded to places we believe are truly worth your time.</span>
            </div>
          )}
          {cafe.sippNote && (
            <p className="border-t border-line pt-3 text-sm italic text-brown/85">“{cafe.sippNote}”</p>
          )}
          {(cafe.isSippRated || cafe.hasSippStar) && (
            <p className="text-[11px] text-brown/60">
              Reviewed by {cafe.sippReviewer || "Sipp"}
              {cafe.sippReviewDate
                ? " · " + new Date(cafe.sippReviewDate).toLocaleString("en", { month: "long", year: "numeric" })
                : ""}
            </p>
          )}
          {cafe.sippBreakdown && (
            <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
              {Object.entries(cafe.sippBreakdown).map(([k, v]) => (
                <span key={k} className="rounded-full bg-ivory border border-line px-2.5 py-1 text-[11px] text-brown">
                  {k} {Number(v).toFixed(1)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Personality score */}
        <h3 className="mb-3 mt-6 serif text-2xl text-espresso">
          Personality <span className="gold-italic">score</span>
        </h3>
        <div className="space-y-2.5 rounded-xl2 border border-line bg-card p-4 shadow-card">
          {Object.entries(personality).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm text-brown/80">{k}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-beige/60">
                <span className="block h-full rounded-full bg-gold" style={{ width: `${(v / 10) * 100}%` }} />
              </span>
              <span className="w-9 shrink-0 text-right serif text-lg leading-none text-espresso">{v.toFixed(1)}</span>
            </div>
          ))}
        </div>

        {/* Best time + Crowd */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl2 border border-line bg-card p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-brown/55">
              <Icon name="clock" size={13} /> Best time to go
            </p>
            <p className="mt-1.5 serif text-xl leading-tight text-espresso">{bestTimeFor(cafe)}</p>
          </div>
          <div className="rounded-xl2 border border-line bg-card p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-brown/55">
              <Icon name="people" size={13} /> Crowd level
            </p>
            <p className="mt-1.5 serif text-xl leading-tight text-espresso">{crowdFor(cafe)}</p>
            <p className="mt-0.5 text-[11px] text-brown/60">Usually quiet before 11 AM.</p>
          </div>
        </div>

        {/* Menu (cafés) */}
        {!fine && (
          <>
            <div className="mb-2 mt-6 flex items-end justify-between">
              <h3 className="serif text-2xl text-espresso">
                The <span className="gold-italic">menu</span>
              </h3>
              <button onClick={() => setMenuOpen(true)} className="text-xs font-medium text-gold">
                View full menu
              </button>
            </div>
            <button
              onClick={() => setMenuOpen(true)}
              className="block w-full overflow-hidden rounded-xl2 border border-line bg-card text-left shadow-card"
            >
              {menuPreview.items.slice(0, 4).map((it, i) => (
                <div key={it.name} className={`flex items-center justify-between px-4 py-3 ${i ? "border-t border-line" : ""}`}>
                  <span className="text-sm text-espresso">{it.name}</span>
                  <span className="serif text-lg text-gold">{it.price} <span className="text-xs text-brown/60">AED</span></span>
                </div>
              ))}
              <div className="border-t border-line px-4 py-2.5 text-center text-xs font-medium text-gold">
                View full menu →
              </div>
            </button>
          </>
        )}

        {/* Menu (fine dining) — real scraped menu if we have it, else link to the source */}
        {fine && (cafe.menu?.length || cafe.website || cafe.googleMapsUrl) && (
          <>
            <div className="mb-2 mt-6 flex items-end justify-between">
              <h3 className="serif text-2xl text-espresso">
                The <span className="gold-italic">menu</span>
              </h3>
              {cafe.menu?.length > 0 && (
                <button onClick={() => setMenuOpen(true)} className="text-xs font-medium text-gold">View full menu</button>
              )}
            </div>
            {cafe.menu?.length > 0 ? (
              <button onClick={() => setMenuOpen(true)} className="block w-full overflow-hidden rounded-xl2 border border-line bg-card text-left shadow-card">
                {(cafe.menu[0]?.items || []).slice(0, 4).map((it, i) => (
                  <div key={it.name} className={`flex items-center justify-between px-4 py-3 ${i ? "border-t border-line" : ""}`}>
                    <span className="text-sm text-espresso">{it.name}</span>
                    <span className="serif text-lg text-gold">{it.price} <span className="text-xs text-brown/60">AED</span></span>
                  </div>
                ))}
                <div className="border-t border-line px-4 py-2.5 text-center text-xs font-medium text-gold">View full menu →</div>
              </button>
            ) : (
              <button
                onClick={() =>
                  window.open(
                    cafe.website ? (cafe.website.startsWith("http") ? cafe.website : `https://${cafe.website}`) : cafe.googleMapsUrl,
                    "_blank"
                  )
                }
                className="flex w-full items-center justify-between rounded-xl2 border border-line bg-card px-4 py-4 text-left shadow-card"
              >
                <div>
                  <p className="serif text-lg leading-tight text-espresso">View the menu</p>
                  <p className="text-xs text-brown/65">{cafe.website ? `on ${prettyDomain(cafe.website)}` : "on Google"}</p>
                </div>
                <Icon name="globe" size={20} className="text-gold" />
              </button>
            )}
          </>
        )}

        {/* Why people love it */}
        <h3 className="mb-2 mt-6 serif text-2xl text-espresso">
          Why people <span className="gold-italic">love it</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {cafe.loved.map((l) => (
            <span key={l} className="rounded-full bg-ivory border border-line px-3 py-1.5 text-xs text-brown">
              {l}
            </span>
          ))}
        </div>

        {/* Friends thoughts */}
        {friendThoughts.length > 0 && (
          <>
            <h3 className="mb-2 mt-6 serif text-2xl text-espresso">
              Friends' <span className="gold-italic">thoughts</span>
            </h3>
            <div className="space-y-2.5">
              {friendThoughts.map((r) => {
                const u = getProfile(r.user);
                return (
                  <button key={r.id} onClick={() => openUser(u.id)} className="block w-full rounded-xl2 border border-line bg-card p-4 text-left shadow-card">
                    <div className="flex items-center gap-2">
                      <Avatar user={u} size={32} />
                      <span className="text-sm font-medium text-espresso">{u.name}</span>
                      <span className="ml-auto serif text-lg text-gold">{r.overall.toFixed(1)}</span>
                    </div>
                    {r.text && <p className="mt-2 text-sm text-brown/80">“{r.text}”</p>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Community reviews */}
        <h3 className="mb-2 mt-6 serif text-2xl text-espresso">Community reviews</h3>
        {community.length === 0 ? (
          <p className="rounded-xl2 border border-line bg-card p-4 text-center text-sm text-brown/65 shadow-card">
            No reviews yet — be the first to rank {cafe.name}.
          </p>
        ) : (
          <div className="space-y-2.5">
            {community.map((r) => {
              const u = getProfile(r.user);
              return (
                <button key={r.id} onClick={() => openUser(u.id)} className="block w-full rounded-xl2 border border-line bg-card p-4 text-left shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-espresso">{u.name}</span>
                    <span className="serif text-lg text-gold">{r.overall.toFixed(1)}</span>
                  </div>
                  {r.text && <p className="mt-1 text-sm text-brown/80">“{r.text}”</p>}
                </button>
              );
            })}
          </div>
        )}

        {/* Similar nearby */}
        <h3 className="mb-3 mt-6 serif text-2xl text-espresso">
          Similar <span className="gold-italic">nearby</span>
        </h3>
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
          {similar.map((c) => (
            <CafeCard key={c.id} cafe={c} />
          ))}
        </div>
      </div>

      {listSheet && <AddToListSheet cafeId={cafe.id} onClose={() => setListSheet(false)} />}
      {shareOpen && <ShareCard cafe={cafe} onClose={() => setShareOpen(false)} />}
      {menuOpen && <MenuSheet cafe={cafe} menu={cafe.menu?.length ? cafe.menu : undefined} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

function Row({ icon, text }) {
  return (
    <p className="flex items-center gap-2 text-brown/80">
      <span className="text-gold">
        <Icon name={icon} size={15} />
      </span>
      {text}
    </p>
  );
}
