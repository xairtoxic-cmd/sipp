"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { CAFES as SEED_CAFES, featuresFor } from "./seed";
import { getBestBookingMethod } from "./booking";
import {
  EVENT_WEIGHTS,
  applyEventToProfile,
  calculateRecommendationScore,
  getRecommendationReasons,
  tasteMatchScore,
  tasteFromReviews,
} from "./recommend";
import { useAuth } from "./auth";

// Seed cafés (fallback for orphaned ids / empty DB) given the same full field set
// as DB places so nothing downstream crashes on missing fields.
const SEED_PLACES = SEED_CAFES.map((c) => ({
  city: c.city || "Dubai",
  communityScore: c.sippScore,
  sippRatedScore: null,
  isSippRated: false,
  hasSippStar: false,
  sippReviewDate: null,
  sippReviewer: null,
  sippNote: null,
  sippBreakdown: null,
  sippPhotos: [],
  acceptsReservations: false,
  bookingProvider: null,
  bookingUrl: null,
  bookingPhone: null,
  bookingWhatsapp: null,
  reservationNotes: null,
  depositRequired: false,
  walkInOnly: true,
  bookingCtaEnabled: false,
  menu: null,
  menuSource: null,
  googleMapsUrl: "",
  ...c,
}));

// Map a DB `places` row to the shape the UI expects.
function placeFromRow(r) {
  const area = r.area || r.city || "Dubai";
  const tags = r.tags || [];
  return {
    id: r.id,
    name: r.name,
    area,
    city: r.city || "Dubai",
    emirate: r.emirate || "",
    lat: r.lat,
    lng: r.lng,
    rating: Number(r.google_rating) || 0,
    reviews: r.rating_count || 0,
    sippScore: Number(r.sipp_score) || 0,
    price: r.price_level || 2,
    tags,
    category: r.category || "cafe",
    openNow: r.open_now ?? true,
    hours: r.hours || "",
    address: `${r.area ? r.area + ", " : ""}${r.city || "Dubai"}`,
    phone: r.phone || "",
    website: r.website || "",
    googleMapsUrl: r.google_maps_url || "",
    loved: tags.slice(0, 3).map((t) => `Great ${t.toLowerCase()}`),
    blurb: r.blurb || `${r.name} — a ${(tags[0] || "café").toLowerCase()} favourite in ${area}.`,
    images: r.image_url ? [r.image_url] : [],
    activity: `Loved in ${area}`,
    features: featuresFor({ id: r.id, tags }),
    // Sipp rating layer
    communityScore: Number(r.community_score ?? r.sipp_score) || 0,
    sippRatedScore: r.sipp_rated_score != null ? Number(r.sipp_rated_score) : null,
    isSippRated: !!r.is_sipp_rated,
    hasSippStar: !!r.has_sipp_star,
    sippReviewDate: r.sipp_review_date || null,
    sippReviewer: r.sipp_reviewer_id || null,
    sippNote: r.sipp_public_note || null,
    sippBreakdown: r.sipp_rating_breakdown || null,
    sippPhotos: r.sipp_rating_photos || [],
    // Booking
    acceptsReservations: !!r.accepts_reservations,
    bookingProvider: r.booking_provider || null,
    bookingUrl: r.booking_url || null,
    bookingPhone: r.booking_phone || null,
    bookingWhatsapp: r.booking_whatsapp || null,
    reservationNotes: r.reservation_notes || null,
    depositRequired: !!r.deposit_required,
    walkInOnly: !!r.walk_in_only,
    bookingCtaEnabled: !!r.booking_cta_enabled,
    menu: r.menu || null,
    menuSource: r.menu_source || null,
  };
}

const StoreContext = createContext(null);

const AVATAR_COLORS = ["#B9935A", "#9C7A52", "#5A4635", "#C7A06A", "#7D6244", "#A9855A", "#C0A072"];
function colorFor(id = "") {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function relTime(iso) {
  if (!iso) return "just now";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  return Math.floor(diff / 86400) + "d";
}
function profileFrom(row) {
  return {
    id: row.id,
    name: row.name || "Someone",
    username: row.username || "",
    avatar: colorFor(row.id),
    avatarUrl: row.avatar_url || null,
    tasteTags: row.taste_tags || [],
    taste: (row.taste_tags || []).join(" · "),
    sparkle: false,
  };
}

export function StoreProvider({ children }) {
  const { user, isAuthed } = useAuth();
  const meId = user?.id || null;

  // cloud data
  const [placeRows, setPlaceRows] = useState([]); // DB places
  const [profiles, setProfiles] = useState({}); // id -> profile
  const [allReviews, setAllReviews] = useState([]); // raw review rows
  const [mySaves, setMySaves] = useState({}); // placeId -> row
  const [rawLists, setRawLists] = useState([]); // list rows + items
  const [follows, setFollows] = useState([]); // {follower_id, following_id}
  const [likes, setLikes] = useState([]); // {user_id, review_id}
  const [commentRows, setCommentRows] = useState([]); // comment rows
  const [tasteScores, setTasteScores] = useState({}); // learned tag -> 0..100
  const [dislikedTags, setDislikedTags] = useState([]);

  // nav + ui
  const [tab, setTab] = useState("discover");
  const [openCafeId, setOpenCafeId] = useState(null);
  const [openListId, setOpenListId] = useState(null);
  const [openUserId, setOpenUserId] = useState(null);
  const [commentReviewId, setCommentReviewId] = useState(null);
  const [shareCafeId, setShareCafeId] = useState(null);
  const [sharePhoto, setSharePhoto] = useState(null);
  const [prefillRankId, setPrefillRankId] = useState(null);
  const [exploreQuery, setExploreQuery] = useState(null); // { kind:'area'|'category', value, label }
  const [userLoc, setUserLoc] = useState(null); // { lat, lng } once geolocation granted
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  function toast(msg) {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }

  const loadAll = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const [{ data: profs }, { data: revs }, { data: lists }, { data: items }, { data: fol }, { data: lk }, { data: cm }] =
      await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("lists").select("*").order("created_at", { ascending: false }),
        supabase.from("list_items").select("*"),
        supabase.from("follows").select("*"),
        supabase.from("review_likes").select("*"),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
      ]);
    const pmap = {};
    (profs || []).forEach((p) => (pmap[p.id] = profileFrom(p)));
    setProfiles(pmap);
    setAllReviews(revs || []);
    setFollows(fol || []);
    setLikes(lk || []);
    setCommentRows(cm || []);
    const itemsByList = {};
    (items || []).forEach((it) => (itemsByList[it.list_id] = [...(itemsByList[it.list_id] || []), it.place_id]));
    setRawLists((lists || []).map((l) => ({ ...l, cafeIds: itemsByList[l.id] || [] })));
  }, []);

  const loadMine = useCallback(async () => {
    if (!isSupabaseConfigured || !meId) {
      setMySaves({});
      return;
    }
    const { data } = await supabase.from("saves").select("*").eq("user_id", meId);
    const map = {};
    (data || []).forEach((s) => (map[s.place_id] = s));
    setMySaves(map);
    const { data: tp } = await supabase.from("user_taste_profiles").select("*").eq("user_id", meId).maybeSingle();
    setTasteScores(tp?.tag_scores || {});
    setDislikedTags(tp?.disliked_tags || []);
  }, [meId]);

  useEffect(() => {
    if (isAuthed) {
      loadAll();
      loadMine();
    } else {
      setProfiles({});
      setAllReviews([]);
      setMySaves({});
      setRawLists([]);
      setFollows([]);
      setLikes([]);
      setCommentRows([]);
      setTasteScores({});
      setDislikedTags([]);
    }
  }, [isAuthed, meId, loadAll, loadMine]);

  // Load the place catalogue from the DB (once); fall back to bundled seed.
  // Supabase caps each request at ~1000 rows, so page through the table to get
  // the full catalogue. Order by score with NULLs LAST so unrated imports never
  // crowd out the curated, scored places.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const all = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("places")
          .select("*")
          .eq("is_active", true)
          .order("sipp_score", { ascending: false, nullsFirst: false })
          .order("id", { ascending: true })
          .range(from, from + 999);
        if (error || !data || data.length === 0) break;
        all.push(...data);
        if (data.length < 1000) break;
      }
      if (!cancelled && all.length) setPlaceRows(all);
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- derived ----------
  // Sipp Score = the average of real member reviews for a place. A place with no
  // reviews yet has no score (null) — never a sample/seed number.
  const scoreByCafe = useMemo(() => {
    const agg = {};
    for (const r of allReviews) {
      const id = r.place_id;
      const v = Number(r.overall);
      if (!id || !(v > 0)) continue;
      const a = (agg[id] = agg[id] || { sum: 0, n: 0 });
      a.sum += v;
      a.n += 1;
    }
    const m = {};
    for (const id in agg) m[id] = { score: Math.round((agg[id].sum / agg[id].n) * 10) / 10, count: agg[id].n };
    return m;
  }, [allReviews]);

  const cafes = useMemo(() => {
    const base = placeRows.length ? placeRows.map(placeFromRow) : SEED_PLACES;
    return base.map((c) => {
      const agg = scoreByCafe[c.id];
      // Real review average, or null when nobody has reviewed it yet.
      return { ...c, reviewCount: agg ? agg.count : 0, sippScore: agg ? agg.score : null, communityScore: agg ? agg.score : null };
    });
  }, [placeRows, scoreByCafe]);
  const cafesById = useMemo(() => {
    const m = {};
    SEED_PLACES.forEach((c) => (m[c.id] = c)); // fallback so older seed-id reviews still resolve
    cafes.forEach((c) => (m[c.id] = c));
    return m;
  }, [cafes]);
  const cafeById = useCallback((id) => cafesById[id], [cafesById]);

  const myCity = user?.city || null;
  const cityCafes = useMemo(() => {
    if (!myCity) return cafes;
    const inCity = cafes.filter((c) => c.city === myCity);
    return inCity.length ? inCity : cafes; // graceful fallback if no places in that city yet
  }, [cafes, myCity]);
  // Approximate "you are here" = centroid of your city's places. Used for distances
  // when precise geolocation is denied/unavailable (e.g. non-HTTPS on a phone).
  const fallbackLoc = useMemo(() => {
    const pts = cityCafes.filter((c) => c.lat != null && c.lng != null);
    if (!pts.length) return null;
    const lat = pts.reduce((s, c) => s + c.lat, 0) / pts.length;
    const lng = pts.reduce((s, c) => s + c.lng, 0) / pts.length;
    return { lat, lng };
  }, [cityCafes]);
  const following = useMemo(
    () => follows.filter((f) => f.follower_id === meId).map((f) => f.following_id),
    [follows, meId]
  );
  const followerCount = useMemo(() => follows.filter((f) => f.following_id === meId).length, [follows, meId]);

  const getProfile = useCallback(
    (id) => (id === meId && user ? { ...profileFrom({ id: meId, name: user.name, username: user.username, taste_tags: user.tasteTags, avatar_url: user.avatarUrl }), sparkle: true } : profiles[id]) || { id, name: "Someone", avatar: colorFor(id || "x") },
    [profiles, meId, user]
  );

  // Feed reviews mapped to the shape the cards expect.
  const reviews = useMemo(
    () =>
      allReviews.map((r) => ({
        id: r.id,
        user: r.user_id,
        cafeId: r.place_id,
        text: r.review_text || "",
        overall: Number(r.overall) || 0,
        sub: { Vibe: Number(r.vibe) || 0, Coffee: Number(r.drink) || 0, Service: Number(r.service) || 0 },
        tags: r.vibe_tags || [],
        photos: r.photo_urls || [],
        photo: (r.photo_urls && r.photo_urls[0]) || null,
        time: relTime(r.created_at),
        createdAt: r.created_at,
        scope: r.user_id === meId || following.includes(r.user_id) ? "friend" : "public",
      })),
    [allReviews, following, meId]
  );

  // Places friends (or you) have engaged with → used as a "friend signal" boost.
  const friendSet = useMemo(
    () => new Set(reviews.filter((r) => r.user === meId || following.includes(r.user)).map((r) => r.cafeId)),
    [reviews, following, meId]
  );

  // --- taste-learning ---
  const tasteRef = useRef({ tagScores: {}, dislikedTags: [] });
  useEffect(() => {
    tasteRef.current = { tagScores: tasteScores, dislikedTags };
  }, [tasteScores, dislikedTags]);

  const track = useCallback(
    (placeId, eventType, metadata) => {
      if (!meId || !isSupabaseConfigured) return;
      const weight = EVENT_WEIGHTS[eventType] ?? 0;
      const place = placeId ? cafesById[placeId] : null;
      supabase
        .from("user_events")
        .insert({ user_id: meId, place_id: placeId || null, event_type: eventType, event_value: weight, tags: place?.tags || [], category: place?.category || null, metadata: metadata || null })
        .then(() => {});
      if (place && weight !== 0) {
        const next = applyEventToProfile(tasteRef.current, place, weight);
        tasteRef.current = next;
        setTasteScores(next.tagScores);
        setDislikedTags(next.dislikedTags);
        supabase
          .from("user_taste_profiles")
          .upsert({ user_id: meId, tag_scores: next.tagScores, disliked_tags: next.dislikedTags, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
          .then(() => {});
      }
    },
    [meId, cafesById]
  );

  // Recommendation helpers bound to the current user's data.
  const recommendScore = useCallback(
    (place, extra = {}) => calculateRecommendationScore(place, { tagScores: tasteScores, dislikedTags, friendSet, ...extra }),
    [tasteScores, dislikedTags, friendSet] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const recommendReasons = useCallback(
    (place, extra = {}) => getRecommendationReasons(place, { tagScores: tasteScores, friendSet, ...extra }),
    [tasteScores, friendSet] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const tasteMatchWith = useCallback(
    (userId) => tasteMatchScore(tasteScores, tasteFromReviews(reviews.filter((r) => r.user === userId), (id) => cafesById[id])),
    [tasteScores, reviews, cafesById]
  );

  // Recompute the taste profile from the full event history (admin tool).
  const rebuildTaste = useCallback(async () => {
    if (!meId || !isSupabaseConfigured) return;
    const { data } = await supabase.from("user_events").select("*").eq("user_id", meId).order("created_at", { ascending: true });
    let prof = { tagScores: {}, dislikedTags: [] };
    (data || []).forEach((e) => {
      if (e.tags?.length && e.event_value) prof = applyEventToProfile(prof, { tags: e.tags }, Number(e.event_value));
    });
    tasteRef.current = prof;
    setTasteScores(prof.tagScores);
    setDislikedTags(prof.dislikedTags);
    await supabase
      .from("user_taste_profiles")
      .upsert({ user_id: meId, tag_scores: prof.tagScores, disliked_tags: prof.dislikedTags, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    return data?.length || 0;
  }, [meId]);

  const ranks = useMemo(() => {
    const map = {};
    allReviews
      .filter((r) => r.user_id === meId)
      .forEach((r) => {
        map[r.place_id] = {
          overall: Number(r.overall) || 0,
          drink: Number(r.drink) || 0,
          food: Number(r.food) || 0,
          vibe: Number(r.vibe) || 0,
          service: Number(r.service) || 0,
          value: Number(r.value) || 0,
          work: Number(r.work) || 0,
          aesthetic: Number(r.aesthetic) || 0,
          ambience: Number(r.ambience) || 0,
          presentation: Number(r.presentation) || 0,
          dateNight: Number(r.date_night) || 0,
          review: r.review_text || "",
          bestItem: r.best_item || "",
          bestDish: r.best_dish || "",
          occasion: r.occasion || "",
          again: r.would_go_again,
          visitDate: r.visit_date,
          crowd: r.crowd_level,
          bestTime: r.best_time,
          tags: r.vibe_tags || [],
        };
      });
    return map;
  }, [allReviews, meId]);

  const lists = useMemo(
    () =>
      rawLists.map((l) => ({
        id: l.id,
        title: l.title,
        desc: l.description || "",
        cafeIds: l.cafeIds,
        cover: l.cover_place_id || l.cafeIds[0] || null,
        public: l.is_public,
        owner: l.user_id === meId ? "me" : l.user_id,
      })),
    [rawLists, meId]
  );

  const reviewLikes = useMemo(() => {
    const mine = {};
    likes.filter((l) => l.user_id === meId).forEach((l) => (mine[l.review_id] = true));
    return mine;
  }, [likes, meId]);
  const likeCountFor = useCallback((rid) => likes.filter((l) => l.review_id === rid).length, [likes]);

  const comments = useMemo(() => {
    const map = {};
    commentRows.forEach((c) => (map[c.review_id] = [...(map[c.review_id] || []), { id: c.id, text: c.text, user: c.user_id }]));
    return map;
  }, [commentRows]);

  const savedIds = useMemo(() => Object.keys(mySaves).filter((id) => mySaves[id]?.saved), [mySaves]);

  // ---------- mutations ----------
  function getStatus(placeId) {
    return mySaves[placeId] || {};
  }
  async function writeSave(placeId, patch, label) {
    if (!meId) return;
    const cur = mySaves[placeId] || { place_id: placeId, user_id: meId };
    const next = { ...cur, ...patch, user_id: meId, place_id: placeId };
    setMySaves((m) => ({ ...m, [placeId]: next })); // optimistic
    if (label) toast(label);
    await supabase.from("saves").upsert(
      {
        user_id: meId,
        place_id: placeId,
        saved: !!next.saved,
        want: !!next.want,
        been: !!next.been,
        loved: !!next.loved,
        notfor: !!next.notfor,
        liked: !!next.liked,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,place_id" }
    );
  }
  const toggleSave = (id) => {
    const on = !getStatus(id).saved;
    writeSave(id, { saved: on }, on ? "Saved beautifully ✓" : "Removed from saved");
    track(id, on ? "save_place" : "remove_save");
  };
  const toggleLike = (id) => writeSave(id, { liked: !getStatus(id).liked });
  const toggleWant = (id) => {
    const on = !getStatus(id).want;
    writeSave(id, { want: on }, on ? "Added to Want to Try" : "Removed");
    if (on) track(id, "want_to_try");
  };
  const toggleBeen = (id) => {
    const on = !getStatus(id).been;
    writeSave(id, { been: on }, on ? "Marked as Been Here" : "Removed");
    if (on) track(id, "been_here");
  };
  const toggleLoved = (id) => {
    const on = !getStatus(id).loved;
    writeSave(id, { loved: on, notfor: on ? false : getStatus(id).notfor }, on ? "Loved it ✓" : "Removed");
    if (on) track(id, "loved_it");
  };
  const toggleNotFor = (id) => {
    const on = !getStatus(id).notfor;
    writeSave(id, { notfor: on, loved: on ? false : getStatus(id).loved }, on ? "Noted — not for you" : "Removed");
    if (on) track(id, "not_for_me");
  };

  async function saveRank(placeId, r) {
    if (!meId) return;
    toast("Added to your café map ✓");
    await supabase.from("reviews").upsert(
      {
        user_id: meId,
        place_id: placeId,
        overall: r.overall,
        drink: r.drink,
        food: r.food,
        vibe: r.vibe,
        service: r.service,
        value: r.value,
        work: r.work,
        aesthetic: r.aesthetic,
        ambience: r.ambience,
        presentation: r.presentation,
        date_night: r.dateNight,
        review_text: r.review,
        best_item: r.bestItem,
        best_dish: r.bestDish,
        occasion: r.occasion,
        would_go_again: r.again,
        visit_date: r.visitDate || null,
        crowd_level: r.crowd,
        best_time: r.bestTime,
        vibe_tags: r.tags || [],
        photo_urls: r.photoUrls || [],
      },
      { onConflict: "user_id,place_id" }
    );
    await writeSave(placeId, { been: true });
    track(placeId, r.overall >= 8 ? "rate_high" : r.overall <= 4 ? "rate_low" : "rate_mid");
    await loadAll();
  }

  async function uploadReviewPhoto(file) {
    if (!meId || !file || !isSupabaseConfigured) return null;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
    const path = `${meId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("review-photos").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (error) return null;
    return supabase.storage.from("review-photos").getPublicUrl(path).data.publicUrl;
  }

  // Upload a cropped avatar blob to storage and return a public URL (so it shows
  // to everyone, not just locally as a base64 data URL).
  async function uploadAvatar(blob) {
    if (!meId || !blob || !isSupabaseConfigured) return null;
    const path = `avatars/${meId}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("review-photos").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) return null;
    return supabase.storage.from("review-photos").getPublicUrl(path).data.publicUrl;
  }

  async function createList({ title, desc, isPublic, cover }) {
    if (!meId) return;
    const { data } = await supabase
      .from("lists")
      .insert({ user_id: meId, title, description: desc, is_public: isPublic, cover_place_id: cover || null })
      .select("*")
      .maybeSingle();
    if (data) setRawLists((l) => [{ ...data, cafeIds: [] }, ...l]);
    toast("List created ✓");
    return data?.id;
  }
  async function addToList(listId, cafeId) {
    setRawLists((ls) => ls.map((l) => (l.id === listId && !l.cafeIds.includes(cafeId) ? { ...l, cafeIds: [...l.cafeIds, cafeId] } : l)));
    toast("Added to list ✓");
    track(cafeId, "add_to_list");
    await supabase.from("list_items").upsert({ list_id: listId, place_id: cafeId }, { onConflict: "list_id,place_id" });
  }
  async function removeFromList(listId, cafeId) {
    setRawLists((ls) => ls.map((l) => (l.id === listId ? { ...l, cafeIds: l.cafeIds.filter((c) => c !== cafeId) } : l)));
    await supabase.from("list_items").delete().eq("list_id", listId).eq("place_id", cafeId);
  }

  async function toggleFollow(userId) {
    if (!meId || userId === meId) return;
    const on = following.includes(userId);
    toast(on ? "Unfollowed" : "Following ✓");
    if (on) {
      setFollows((f) => f.filter((x) => !(x.follower_id === meId && x.following_id === userId)));
      await supabase.from("follows").delete().eq("follower_id", meId).eq("following_id", userId);
    } else {
      setFollows((f) => [...f, { follower_id: meId, following_id: userId }]);
      await supabase.from("follows").insert({ follower_id: meId, following_id: userId });
      track(null, "follow_user", { followed: userId });
    }
  }

  // Fire-and-forget: ask the server to email the post's author about a like/comment.
  // The server verifies the caller, skips self-actions, and looks up the author's email.
  async function notifyEngagement(type, reviewId, text) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) return;
      fetch("/api/notify/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, reviewId, text: text || "" }),
      }).catch(() => {});
    } catch {}
  }

  async function toggleReviewLike(reviewId) {
    if (!meId) return;
    const on = !!reviewLikes[reviewId];
    if (on) {
      setLikes((l) => l.filter((x) => !(x.user_id === meId && x.review_id === reviewId)));
      await supabase.from("review_likes").delete().eq("user_id", meId).eq("review_id", reviewId);
    } else {
      setLikes((l) => [...l, { user_id: meId, review_id: reviewId }]);
      await supabase.from("review_likes").insert({ user_id: meId, review_id: reviewId });
      const rev = reviews.find((r) => r.id === reviewId);
      if (rev) track(rev.cafeId, "like_review");
      notifyEngagement("like", reviewId);
    }
  }

  async function addComment(reviewId, text) {
    if (!meId || !text.trim()) return;
    const { data } = await supabase
      .from("comments")
      .insert({ review_id: reviewId, user_id: meId, text: text.trim() })
      .select("*")
      .maybeSingle();
    if (data) setCommentRows((c) => [...c, data]);
    const rev = reviews.find((r) => r.id === reviewId);
    if (rev) track(rev.cafeId, "comment_review");
    notifyEngagement("comment", reviewId, text.trim());
    toast("Comment added ✓");
  }

  // ---------- nav ----------
  function go(t) {
    setOpenCafeId(null);
    setOpenListId(null);
    setOpenUserId(null);
    if (t !== "explore") setExploreQuery(null);
    setTab(t);
  }
  // Jump to Explore showing a filtered set (by area/city or by category).
  function browse(query) {
    setOpenCafeId(null);
    setOpenListId(null);
    setOpenUserId(null);
    setExploreQuery(query);
    setTab("explore");
  }
  const clearExplore = () => setExploreQuery(null);
  // Ask the browser for the user's location (for "Near you" + distance on posts).
  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }
  const openCafe = (id) => {
    setOpenCafeId(id);
    track(id, "view_place");
  };
  const closeCafe = () => setOpenCafeId(null);
  const openUser = (id) => setOpenUserId(id);
  const closeUser = () => setOpenUserId(null);
  const openShare = (id, photo) => {
    track(id, "share_place");
    setSharePhoto(photo || null); // post's uploaded photo, if any
    setShareCafeId(id);
  };
  function reserve(place) {
    const m = getBestBookingMethod(place);
    if (!m) return;
    // log booking event (best-effort)
    if (meId && isSupabaseConfigured) {
      supabase
        .from("booking_events")
        .insert({ user_id: meId, place_id: place.id, booking_provider: place.bookingProvider || m.provider, booking_url: m.url, event_type: m.eventType })
        .then(() => {});
    }
    // strong algorithm signal
    track(place.id, m.trackType);
    if (typeof window !== "undefined") window.open(m.url, "_blank", "noopener");
  }
  const closeShare = () => { setShareCafeId(null); setSharePhoto(null); };
  function goRank(id) {
    setPrefillRankId(id || null);
    setOpenCafeId(null);
    setTab("rank");
  }

  const meObj = {
    name: user?.name || "You",
    username: user?.username || "",
    avatar: colorFor(meId || "me"),
    avatarUrl: user?.avatarUrl || null,
    bio: user?.bio || "",
    tasteTags: user?.tasteTags || [],
    favoriteAreas: [],
    followers: followerCount,
    following: following.length,
  };

  const value = {
    me: meObj,
    cafes,
    cafeById,
    cityCafes,
    myCity,
    profiles,
    getProfile,
    reviews,
    // taste-learning / recommendations
    tasteScores,
    dislikedTags,
    friendSet,
    recommendScore,
    recommendReasons,
    tasteMatchWith,
    rebuildTaste,
    track,
    saves: mySaves,
    getStatus,
    toggleSave,
    toggleLike,
    toggleWant,
    toggleBeen,
    toggleLoved,
    toggleNotFor,
    ranks,
    saveRank,
    uploadReviewPhoto,
    uploadAvatar,
    lists,
    createList,
    addToList,
    removeFromList,
    following,
    followerCount,
    toggleFollow,
    reviewLikes,
    likeCountFor,
    toggleReviewLike,
    comments,
    addComment,
    savedIds,
    // nav
    tab,
    setTab,
    go,
    exploreQuery,
    browse,
    clearExplore,
    userLoc: userLoc || fallbackLoc,
    requestLocation,
    openCafeId,
    openCafe,
    closeCafe,
    openListId,
    setOpenListId,
    openUserId,
    openUser,
    closeUser,
    commentReviewId,
    setCommentReviewId,
    shareCafeId,
    sharePhoto,
    openShare,
    closeShare,
    reserve,
    prefillRankId,
    setPrefillRankId,
    goRank,
    toast,
    toasts,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
