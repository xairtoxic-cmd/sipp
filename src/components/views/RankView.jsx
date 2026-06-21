"use client";

import { useEffect, useMemo, useState } from "react";
import { CAFES, cafeById, VIBE_TAGS, CROWD_LEVELS, BEST_TIMES } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { Icon } from "../Icons";
import { CafeImage, PrimaryButton, GhostButton, Tag } from "../UI";
import { LogoHeader } from "../Chrome";

// Core scores drive the auto-calculated Overall.
const CORE_SUBS = [
  ["drink", "Coffee / Drinks"],
  ["food", "Food"],
  ["vibe", "Vibe"],
  ["service", "Service"],
  ["value", "Value"],
];
const EXTRA_SUBS = [
  ["work", "Work-friendly"],
  ["aesthetic", "Aesthetic"],
];

const TAG_OPTIONS = VIBE_TAGS;

const PROMPTS = [
  "What did you order?",
  "How was the vibe?",
  "Best for?",
  "Good for working?",
  "Worth the price?",
  "How busy was it?",
];

function Slider({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-brown/80">{label}</span>
        <span className="serif text-lg text-gold">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#b9935a]"
      />
    </div>
  );
}

export default function RankView() {
  const { prefillRankId, setPrefillRankId, ranks, saveRank, openCafe } = useStore();
  const [selectedId, setSelectedId] = useState(prefillRankId || null);
  const [q, setQ] = useState("");

  const [subs, setSubs] = useState({ drink: 8, food: 8, vibe: 8, service: 8, value: 8, work: 8, aesthetic: 8 });
  const [showMore, setShowMore] = useState(false);
  // Overall is auto-calculated from the core scores.
  const overall = Math.round(((subs.drink + subs.food + subs.vibe + subs.service + subs.value) / 5) * 10) / 10;
  const [bestItem, setBestItem] = useState("");
  const [again, setAgain] = useState(true);
  const [review, setReview] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [tags, setTags] = useState([]);
  const [crowd, setCrowd] = useState("Moderate");
  const [bestTime, setBestTime] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (prefillRankId) {
      setSelectedId(prefillRankId);
      setPrefillRankId(null);
    }
  }, [prefillRankId, setPrefillRankId]);

  const cafe = selectedId ? cafeById(selectedId) : null;

  const matches = useMemo(() => {
    if (!q.trim()) return CAFES.slice(0, 6);
    const s = q.toLowerCase();
    return CAFES.filter((c) => c.name.toLowerCase().includes(s) || c.area.toLowerCase().includes(s)).slice(0, 8);
  }, [q]);

  function toggleTag(t) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function addPrompt(p) {
    setReview((r) => (r ? `${r}\n${p} ` : `${p} `));
  }

  function submit() {
    saveRank(selectedId, {
      overall,
      ...subs,
      bestItem,
      again,
      review,
      visitDate,
      tags,
      crowd,
      bestTime,
    });
    setDone(true);
  }

  function reset() {
    setSelectedId(null);
    setDone(false);
    setSubs({ drink: 8, food: 8, vibe: 8, service: 8, value: 8, work: 8, aesthetic: 8 });
    setShowMore(false);
    setBestItem("");
    setReview("");
    setVisitDate("");
    setTags([]);
    setCrowd("Moderate");
    setBestTime("");
    setQ("");
  }

  if (done && cafe) {
    return (
      <div className="px-5 pb-32">
        <LogoHeader />
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gold text-cream shadow-float animate-pop">
            <Icon name="check" size={36} />
          </div>
          <h1 className="mt-5 serif text-4xl text-espresso">Added to your café map.</h1>
          <p className="mt-2 text-sm text-brown/70">
            {cafe.name} is now ranked <span className="text-gold">{overall.toFixed(1)}</span> in your list.
          </p>
          <div className="mt-6 flex gap-2">
            <GhostButton onClick={() => openCafe(cafe.id)}>View café</GhostButton>
            <PrimaryButton onClick={reset}>Rank another</PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-32">
      <LogoHeader>
        <h1 className="mt-2 px-1 serif text-4xl text-espresso">
          Rank a <span className="gold-italic">café</span>
        </h1>
      </LogoHeader>

      {!cafe ? (
        <div className="mt-4">
          <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-3 shadow-card">
            <Icon name="search" size={18} className="text-brown/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a café you visited"
              className="w-full bg-transparent text-sm text-espresso placeholder:text-brown/50 focus:outline-none"
            />
          </div>
          <p className="mt-4 px-1 text-xs uppercase tracking-wider text-brown/50">Tap to select</p>
          <div className="mt-2 space-y-2.5">
            {matches.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex w-full items-center gap-3 rounded-xl2 border border-line bg-card p-3 text-left shadow-card"
              >
                <CafeImage src={c.images[0]} alt={c.name} seed={c.id} className="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <h4 className="serif text-xl text-espresso">{c.name}</h4>
                  <p className="truncate text-xs text-brown/70">{c.area}</p>
                </div>
                {ranks[c.id] && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">Ranked</span>}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 rounded-xl2 border border-line bg-card p-3 shadow-card">
            <CafeImage src={cafe.images[0]} alt={cafe.name} seed={cafe.id} className="h-16 w-16" />
            <div className="flex-1">
              <h3 className="serif text-2xl text-espresso">{cafe.name}</h3>
              <p className="text-xs text-brown/70">{cafe.area}</p>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-brown/50">
              <Icon name="x" size={20} />
            </button>
          </div>

          {/* Auto-calculated overall */}
          <div className="flex items-center justify-between rounded-xl2 border border-line bg-card p-4 shadow-card">
            <div>
              <span className="serif text-2xl text-espresso">Overall</span>
              <p className="text-[11px] text-brown/60">Auto-calculated from your scores</p>
            </div>
            <span className="serif text-5xl font-bold leading-none text-gold">{overall.toFixed(1)}</span>
          </div>

          {/* Core scores */}
          <div className="grid grid-cols-1 gap-4 rounded-xl2 border border-line bg-card p-4 shadow-card">
            {CORE_SUBS.map(([key, label]) => (
              <Slider key={key} label={label} value={subs[key]} onChange={(v) => setSubs((s) => ({ ...s, [key]: v }))} />
            ))}
          </div>

          {/* Review */}
          <div className="rounded-xl2 border border-line bg-card p-4 shadow-card">
            <label className="text-sm text-brown/80">Your review</label>
            <div className="no-scrollbar -mx-1 mt-1.5 mb-2 flex gap-1.5 overflow-x-auto px-1">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => addPrompt(p)}
                  className="shrink-0 rounded-full border border-line bg-ivory px-3 py-1.5 text-xs text-brown hover:border-gold/60"
                >
                  {p}
                </button>
              ))}
            </div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
              placeholder="Amazing matcha and cozy vibes…"
              className="w-full resize-none rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm text-espresso placeholder:text-brown/40 focus:border-gold focus:outline-none"
            />
            <input
              value={bestItem}
              onChange={(e) => setBestItem(e.target.value)}
              placeholder="Best item tried (optional)"
              className="mt-2 w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm text-espresso placeholder:text-brown/40 focus:border-gold focus:outline-none"
            />
          </div>

          {/* Vibe tags */}
          <div className="rounded-xl2 border border-line bg-card p-4 shadow-card">
            <p className="mb-2 text-sm text-brown/80">Vibe tags</p>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    tags.includes(t) ? "bg-espresso text-cream" : "border border-line bg-ivory text-brown"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Optional extras */}
          <button
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl2 border border-line bg-card px-4 py-3 text-sm text-brown shadow-card"
          >
            <span>More details (optional)</span>
            <Icon name="back" size={16} className={showMore ? "-rotate-90" : "rotate-[270deg]"} />
          </button>

          {showMore && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 gap-4 rounded-xl2 border border-line bg-card p-4 shadow-card">
                {EXTRA_SUBS.map(([key, label]) => (
                  <Slider key={key} label={label} value={subs[key]} onChange={(v) => setSubs((s) => ({ ...s, [key]: v }))} />
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brown/80">Would you go again?</span>
                  <div className="flex gap-2">
                    <button onClick={() => setAgain(true)} className={`rounded-full px-4 py-1.5 text-sm ${again ? "bg-espresso text-cream" : "border border-line bg-ivory text-brown"}`}>Yes</button>
                    <button onClick={() => setAgain(false)} className={`rounded-full px-4 py-1.5 text-sm ${!again ? "bg-espresso text-cream" : "border border-line bg-ivory text-brown"}`}>No</button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl2 border border-line bg-card p-4 shadow-card">
                <p className="text-sm text-brown/80">How busy was it?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CROWD_LEVELS.map((c) => (
                    <button key={c} onClick={() => setCrowd(c)} className={`rounded-full px-3.5 py-1.5 text-xs ${crowd === c ? "bg-espresso text-cream" : "border border-line bg-ivory text-brown"}`}>{c}</button>
                  ))}
                </div>
                <p className="mt-4 text-sm text-brown/80">Best time to go</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BEST_TIMES.map((t) => (
                    <button key={t} onClick={() => setBestTime((v) => (v === t ? "" : t))} className={`rounded-full px-3.5 py-1.5 text-xs ${bestTime === t ? "bg-espresso text-cream" : "border border-line bg-ivory text-brown"}`}>{t}</button>
                  ))}
                </div>
                <label className="mt-4 block text-sm text-brown/80">Visit date</label>
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-ivory px-3 py-2.5 text-sm text-espresso focus:border-gold focus:outline-none" />
              </div>
            </div>
          )}

          <PrimaryButton className="w-full !py-4 text-base" onClick={submit}>
            Add to my café map
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
