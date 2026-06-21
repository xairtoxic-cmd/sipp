"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SEED_LISTS, ME } from "./seed";

const StoreContext = createContext(null);

const KEY = "sipp_state_v1";

const DEFAULT = {
  // placeId -> { saved, want, been, liked } booleans
  saves: {},
  // placeId -> review object
  ranks: {},
  // custom + seed lists
  lists: SEED_LISTS,
  // followed user ids
  following: ["leen", "omar", "yara"],
  // reviewId -> bool
  reviewLikes: {},
  // reviewId -> [{ text }]
  comments: {},
};

function load() {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed, lists: parsed.lists?.length ? parsed.lists : SEED_LISTS };
  } catch {
    return DEFAULT;
  }
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  // navigation
  const [tab, setTab] = useState("discover");
  const [openCafeId, setOpenCafeId] = useState(null);
  const [openListId, setOpenListId] = useState(null);
  const [openUserId, setOpenUserId] = useState(null);
  const [commentReviewId, setCommentReviewId] = useState(null);
  const [shareCafeId, setShareCafeId] = useState(null);
  const [prefillRankId, setPrefillRankId] = useState(null);

  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  function toast(msg) {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }

  // ---- saves ----
  function getStatus(placeId) {
    return state.saves[placeId] || {};
  }
  function toggleFlag(placeId, flag, labels) {
    setState((s) => {
      const cur = s.saves[placeId] || {};
      const next = { ...cur, [flag]: !cur[flag] };
      const on = next[flag];
      if (labels) toast(on ? labels.on : labels.off);
      return { ...s, saves: { ...s.saves, [placeId]: next } };
    });
  }
  const toggleSave = (id) => toggleFlag(id, "saved", { on: "Saved beautifully ✓", off: "Removed from saved" });
  const toggleLike = (id) => toggleFlag(id, "liked", { on: "Liked", off: "Unliked" });
  const toggleWant = (id) => toggleFlag(id, "want", { on: "Added to Want to Try", off: "Removed from Want to Try" });
  const toggleBeen = (id) => toggleFlag(id, "been", { on: "Marked as Been Here", off: "Removed from Been Here" });

  // Loved It / Not for Me are opposite sentiments — setting one clears the other.
  function setSentiment(placeId, flag) {
    setState((s) => {
      const cur = s.saves[placeId] || {};
      const on = !cur[flag];
      const other = flag === "loved" ? "notfor" : "loved";
      if (on) toast(flag === "loved" ? "Loved it ✓" : "Noted — not for you");
      return { ...s, saves: { ...s.saves, [placeId]: { ...cur, [flag]: on, [other]: on ? false : cur[other] } } };
    });
  }
  const toggleLoved = (id) => setSentiment(id, "loved");
  const toggleNotFor = (id) => setSentiment(id, "notfor");

  // ---- ranks ----
  function saveRank(placeId, review) {
    setState((s) => ({
      ...s,
      ranks: { ...s.ranks, [placeId]: { ...review, createdAt: review.createdAt || "just now" } },
      saves: { ...s.saves, [placeId]: { ...(s.saves[placeId] || {}), been: true } },
    }));
    toast("Added to your café map ✓");
  }

  // ---- lists ----
  function createList({ title, desc, isPublic, cover }) {
    const id = "u" + (state.lists.length + 1) + "_" + title.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 6);
    setState((s) => ({
      ...s,
      lists: [{ id, title, desc, cafeIds: [], cover: cover || null, public: isPublic, owner: "me" }, ...s.lists],
    }));
    toast("List created ✓");
    return id;
  }
  function addToList(listId, cafeId) {
    setState((s) => ({
      ...s,
      lists: s.lists.map((l) =>
        l.id === listId
          ? { ...l, cafeIds: l.cafeIds.includes(cafeId) ? l.cafeIds : [...l.cafeIds, cafeId], cover: l.cover || cafeId }
          : l
      ),
    }));
    toast("Added to list ✓");
  }
  function removeFromList(listId, cafeId) {
    setState((s) => ({
      ...s,
      lists: s.lists.map((l) => (l.id === listId ? { ...l, cafeIds: l.cafeIds.filter((c) => c !== cafeId) } : l)),
    }));
  }

  // ---- reviews (social feed) ----
  function toggleReviewLike(reviewId) {
    setState((s) => ({
      ...s,
      reviewLikes: { ...s.reviewLikes, [reviewId]: !s.reviewLikes[reviewId] },
    }));
  }
  function addComment(reviewId, text) {
    if (!text.trim()) return;
    setState((s) => ({
      ...s,
      comments: { ...s.comments, [reviewId]: [...(s.comments[reviewId] || []), { text: text.trim() }] },
    }));
    toast("Comment added ✓");
  }

  // ---- follows ----
  function toggleFollow(userId) {
    setState((s) => {
      const on = s.following.includes(userId);
      toast(on ? "Unfollowed" : "Following ✓");
      return { ...s, following: on ? s.following.filter((u) => u !== userId) : [...s.following, userId] };
    });
  }

  // ---- navigation helpers ----
  function openCafe(id) {
    setOpenCafeId(id);
  }
  function closeCafe() {
    setOpenCafeId(null);
  }
  function goRank(id) {
    setPrefillRankId(id || null);
    setOpenCafeId(null);
    setTab("rank");
  }
  function go(t) {
    setOpenCafeId(null);
    setOpenListId(null);
    setOpenUserId(null);
    setTab(t);
  }
  function openUser(id) {
    setOpenUserId(id);
  }
  function closeUser() {
    setOpenUserId(null);
  }
  function openShare(id) {
    setShareCafeId(id);
  }
  function closeShare() {
    setShareCafeId(null);
  }

  const savedIds = useMemo(
    () => Object.keys(state.saves).filter((id) => state.saves[id]?.saved),
    [state.saves]
  );

  const value = {
    hydrated,
    me: ME,
    ...state,
    getStatus,
    toggleSave,
    toggleLike,
    toggleWant,
    toggleBeen,
    toggleLoved,
    toggleNotFor,
    saveRank,
    createList,
    addToList,
    removeFromList,
    toggleFollow,
    toggleReviewLike,
    addComment,
    savedIds,
    // nav
    tab,
    setTab,
    go,
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
    openShare,
    closeShare,
    prefillRankId,
    setPrefillRankId,
    goRank,
    // toast
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
