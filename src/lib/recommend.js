// Rule-based recommendation + taste-learning engine for Sipp.
// Pure, modular functions — easy to swap for ML later. No UI here.

// Behavioral signal weights (from product spec).
export const EVENT_WEIGHTS = {
  view_place: 2,
  open_image: 3,
  open_map_pin: 4,
  like_review: 6,
  comment_review: 8,
  open_directions: 30,
  save_place: 10,
  want_to_try: 15,
  been_here: 12,
  add_to_list: 20,
  share_place: 25,
  follow_user: 15,
  loved_it: 30,
  rate_high: 25, // rating 8–10
  rate_mid: 0,
  // booking intent (strong positive)
  click_reserve: 35,
  open_external_booking: 40,
  call_restaurant: 35,
  whatsapp_booking: 35,
  native_booking_completed: 60,
  // negatives
  not_for_me: -35,
  rate_low: -30, // rating 1–4
  remove_save: -15,
  hide_place: -40,
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Fold an event into a tag-score map (0–100) + disliked tags.
export function applyEventToProfile(profile, place, weight) {
  const tagScores = { ...(profile.tagScores || {}) };
  const disliked = new Set(profile.dislikedTags || []);
  const tags = place?.tags || [];
  const step = weight * 0.5;
  for (const t of tags) {
    tagScores[t] = clamp((tagScores[t] || 40) + step, 0, 100);
    if (weight <= -25) disliked.add(t);
    else if (weight > 0) disliked.delete(t);
  }
  return { tagScores, dislikedTags: [...disliked] };
}

// How well a place matches the user's learned taste (0–1).
export function personalTasteMatch(place, tagScores = {}) {
  const tags = place?.tags || [];
  if (!tags.length) return 0.4;
  const scores = tags.map((t) => (t in tagScores ? tagScores[t] : 40));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return clamp(avg / 100, 0, 1);
}

// Quality from community score + review volume (0–1).
export function placeQualityScore(place) {
  const score = (place?.communityScore || place?.sippScore || 0) / 10;
  const vol = Math.min(1, (place?.reviews || 0) / 600);
  return clamp(score * 0.85 + vol * 0.15, 0, 1);
}

// Sipp editorial boost (0–1).
export function sippEditorialScore(place) {
  if (place?.hasSippStar) return 1;
  if (place?.isSippRated) return 0.6;
  return 0;
}

// Time / occasion fit (0–1).
export function contextScore(place, ctx = {}) {
  const tags = (place?.features || place?.tags || []).map((t) => t.toLowerCase());
  const has = (t) => tags.includes(t.toLowerCase());
  const cafe = place?.category === "cafe";
  const fine = place?.category === "fine_dining";
  const h = ctx.hour ?? 12;
  let s = 0.5;
  if (ctx.occasion === "date night") s = fine || has("date night") || has("romantic") ? 1 : 0.3;
  else if (ctx.occasion === "work" || ctx.occasion === "study") s = has("laptop friendly") || has("study") || has("quiet") ? 1 : 0.3;
  else if (ctx.occasion === "business dinner") s = has("business dinner") || fine ? 1 : 0.3;
  else if (h < 11) s = cafe ? 0.9 : 0.4; // morning coffee
  else if (h < 16) s = cafe ? 0.8 : 0.5; // afternoon
  else if (h < 22) s = fine ? 0.9 : has("late night") ? 0.7 : 0.5; // evening dining
  else s = has("late night") ? 1 : 0.4; // late night
  return clamp(s, 0, 1);
}

// Friends / similar-taste boost (0–1). friendSet = Set of place ids friends engaged with.
export function friendSignalScore(place, friendSet) {
  return friendSet && friendSet.has(place?.id) ? 1 : 0;
}

// Penalty (0–1) from disliked tags.
export function negativeSignalPenalty(place, dislikedTags = []) {
  const tags = place?.tags || [];
  if (!tags.length || !dislikedTags.length) return 0;
  const d = new Set(dislikedTags);
  const hits = tags.filter((t) => d.has(t)).length;
  return clamp(hits / tags.length, 0, 1);
}

// The blended recommendation score (0–1).
export function calculateRecommendationScore(place, ctx = {}) {
  const personal = personalTasteMatch(place, ctx.tagScores);
  const friend = friendSignalScore(place, ctx.friendSet);
  const quality = placeQualityScore(place);
  const editorial = sippEditorialScore(place);
  const context = contextScore(place, ctx);
  const penalty = negativeSignalPenalty(place, ctx.dislikedTags);
  const base = personal * 0.35 + friend * 0.2 + quality * 0.2 + editorial * 0.15 + context * 0.1;
  return clamp(base - penalty * 0.4, 0, 1);
}

// Short, friendly explanation labels (max 2).
export function getRecommendationReasons(place, ctx = {}) {
  const reasons = [];
  const ts = ctx.tagScores || {};
  const topTag = (place?.tags || [])
    .filter((t) => (ts[t] || 0) >= 60)
    .sort((a, b) => (ts[b] || 0) - (ts[a] || 0))[0];
  if (ctx.friendSet?.has(place?.id)) reasons.push("Loved by people with your taste");
  if (place?.hasSippStar) reasons.push("Sipp Star pick");
  else if (place?.isSippRated && reasons.length < 2) reasons.push("Sipp Rated");
  if (topTag && reasons.length < 2) reasons.push(`Because you like ${topTag.toLowerCase()}`);
  if (reasons.length < 1) {
    const h = ctx.hour ?? 12;
    if (place?.category === "fine_dining" && h >= 16) reasons.push("Great for tonight");
    else if (place?.category === "cafe" && h < 12) reasons.push("Great for your morning");
    else if ((place?.communityScore || 0) >= 9) reasons.push("Highly rated near you");
    else reasons.push("Worth a try");
  }
  return reasons.slice(0, 2);
}

// Taste match between two tag-score maps (0–100).
export function tasteMatchScore(myScores = {}, otherScores = {}) {
  const tags = new Set([...Object.keys(myScores), ...Object.keys(otherScores)]);
  if (!tags.size) return 70;
  let dot = 0, ma = 0, mb = 0;
  for (const t of tags) {
    const a = myScores[t] || 0, b = otherScores[t] || 0;
    dot += a * b; ma += a * a; mb += b * b;
  }
  if (!ma || !mb) return 72;
  const cos = dot / (Math.sqrt(ma) * Math.sqrt(mb)); // 0–1
  return Math.round(60 + cos * 38); // 60–98 range, friendly
}

// Derive a taste vector for a user from their reviews (place tags weighted by score).
export function tasteFromReviews(reviews, placeById) {
  const scores = {};
  for (const r of reviews) {
    const p = placeById(r.cafeId);
    if (!p) continue;
    const w = (r.overall || 7) >= 8 ? 12 : (r.overall || 7) <= 4 ? -10 : 4;
    for (const t of p.tags || []) scores[t] = clamp((scores[t] || 40) + w * 0.5, 0, 100);
  }
  return scores;
}
