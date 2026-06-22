"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Icon } from "../Icons";
import { Avatar, Tag, GhostButton, PrimaryButton, CafeImage, EmptyState } from "../UI";
import { SavedRow } from "../CafeCard";
import { LogoHeader, HeaderIconButton } from "../Chrome";

const MiniCafeMap = dynamic(() => import("../MiniCafeMap"), { ssr: false });

// Distinct, on-brand colours for the personal map.
const STATUS_COLOR = { saved: "#C9A227", want: "#C2674A", been: "#2B2118", loved: "#B3415B" };

const TASTE_BADGE_LABELS = {
  Matcha: "Matcha lover", "Hidden Gems": "Hidden gem hunter", "Hidden Gem": "Hidden gem hunter",
  "Fine Dining": "Fine dining", "Date Night": "Date night spots", Quiet: "Quiet cafés",
  "Specialty Coffee": "Coffee lover", Brunch: "Brunch person", Dessert: "Dessert lover",
  Minimal: "Minimalist", Luxury: "Luxury taste", Rooftop: "Rooftop fan", Waterfront: "Waterfront",
  "Laptop Friendly": "Café worker", "Tasting Menu": "Tasting menus", Aesthetic: "Aesthetic spots",
};
function topTasteBadges(tasteScores = {}) {
  return Object.entries(tasteScores)
    .filter(([, v]) => v >= 60)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => TASTE_BADGE_LABELS[t] || t);
}

function NewListModal({ onClose }) {
  const { createList } = useStore();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [pub, setPub] = useState(true);
  return (
    <div className="fixed inset-0 z-[1600] flex items-end justify-center bg-espresso/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[460px] animate-sheetUp rounded-t-xl3 border border-line bg-card p-5 pb-10 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-beige" />
        <h3 className="serif text-3xl text-espresso">New list</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="List title, e.g. Aesthetic Cafés"
          className="mt-4 w-full rounded-xl border border-line bg-ivory px-3 py-3 text-sm focus:border-gold focus:outline-none"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="Description"
          className="mt-3 w-full resize-none rounded-xl border border-line bg-ivory px-3 py-3 text-sm focus:border-gold focus:outline-none"
        />
        <button
          onClick={() => setPub((v) => !v)}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-line bg-ivory px-3 py-3 text-sm"
        >
          <span className="flex items-center gap-2 text-brown">
            <Icon name={pub ? "globe" : "lock"} size={16} /> {pub ? "Public" : "Private"}
          </span>
          <span className={`h-6 w-11 rounded-full p-0.5 transition ${pub ? "bg-gold" : "bg-beige"}`}>
            <span className={`block h-5 w-5 rounded-full bg-white transition ${pub ? "translate-x-5" : ""}`} />
          </span>
        </button>
        <PrimaryButton
          className="mt-4 w-full !py-3.5"
          onClick={() => {
            if (!title.trim()) return;
            createList({ title, desc, isPublic: pub });
            onClose();
          }}
        >
          Create list
        </PrimaryButton>
      </div>
    </div>
  );
}

const PREF_NAMES = {
  tobys: "Toby's Estate",
  koncrete: "Koncrete",
  "espresso-lab": "The Espresso Lab",
  orto: "Orto",
  "friends-avenue": "Friends Avenue",
  brix: "Brix",
};

export default function Profile() {
  const { me, ranks, savedIds, lists, getStatus, setOpenListId, openCafe, cafes, cafeById, tasteScores } = useStore();
  const { user, signOut, updateProfile } = useAuth();
  const [tab, setTab] = useState("Top 5");
  const [modal, setModal] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const displayName = user?.name || me.name;
  const username = user?.username || me.username;
  const bio = user?.bio || me.bio;
  const meUser = { name: displayName, avatar: me.avatar, avatarUrl: user?.avatarUrl };
  const prefs = Array.isArray(user?.prefCafe) ? user.prefCafe : user?.prefCafe ? [user.prefCafe] : [];
  const favSpot = prefs.map((p) => PREF_NAMES[p] || p).join(" · ");
  const tasteTags = user?.tasteTags?.length ? user.tasteTags : me.tasteTags;
  // Friendly badges derived from the learned taste profile (no raw behaviour shown).
  const tasteBadges = topTasteBadges(tasteScores);

  // Personal café map: one pin per café with a status (loved > been > want > saved).
  const mapPoints = cafes.map((c) => {
    const s = getStatus(c.id);
    const key = s.loved ? "loved" : s.been ? "been" : s.want ? "want" : s.saved ? "saved" : null;
    return key ? { id: c.id, lat: c.lat, lng: c.lng, color: STATUS_COLOR[key] } : null;
  }).filter(Boolean);

  const ranked = Object.entries(ranks)
    .map(([id, r]) => ({ cafe: cafeById(id), r }))
    .filter((x) => x.cafe)
    .sort((a, b) => b.r.overall - a.r.overall);

  const myLists = lists.filter((l) => l.owner === "me");
  const savedCafes = cafes.filter((c) => getStatus(c.id).saved);

  const TABS = ["Top 5", "Saved", "Lists", "Reviews"];

  return (
    <div className="px-5 pb-32">
      <LogoHeader right={<HeaderIconButton icon="edit" label="Edit profile" onClick={() => setEditOpen(true)} />} />
      <div className="mt-4 flex flex-col items-center text-center">
        <Avatar user={meUser} size={88} ring />
        <h1 className="mt-3 serif text-4xl text-espresso">{displayName}</h1>
        <p className="text-sm text-gold">{username}</p>
        <p className="mt-2 max-w-xs text-sm text-brown/80">“{bio}”</p>
        {favSpot && (
          <p className="mt-2 rounded-full bg-gold/12 px-3 py-1 text-xs font-medium text-gold">
            <Icon name="cup" size={12} className="mr-1 inline" /> Favourites: {favSpot}
          </p>
        )}
      </div>

      <div className="mt-5 flex justify-center gap-6 text-center">
        {[
          [savedIds.length, "Saved"],
          [ranked.length, "Ranked"],
          [me.followers, "Followers"],
          [me.following, "Following"],
        ].map(([n, l]) => (
          <div key={l}>
            <p className="serif text-2xl text-espresso">{n}</p>
            <p className="text-xs text-brown/60">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl2 border border-line bg-card p-4 shadow-card">
        <p className="text-xs uppercase tracking-wider text-brown/50">Favourite areas</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {me.favoriteAreas.map((a) => (
            <Tag key={a}>{a}</Tag>
          ))}
        </div>
        <p className="mt-3 text-xs uppercase tracking-wider text-brown/50">Taste tags</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {tasteTags.map((a) => (
            <span key={a} className="rounded-full bg-gold/12 px-2.5 py-1 text-[11px] font-medium text-gold">
              {a}
            </span>
          ))}
        </div>
        {tasteBadges.length > 0 && (
          <>
            <p className="mt-3 text-xs uppercase tracking-wider text-brown/50">Sipp learned</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tasteBadges.map((b) => (
                <span key={b} className="rounded-full border border-line bg-ivory px-2.5 py-1 text-[11px] font-medium text-espresso">
                  {b}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* My café map */}
      <div className="mt-5">
        <h3 className="mb-2 px-1 serif text-2xl text-espresso">
          My taste <span className="gold-italic">map</span>
        </h3>
        <MiniCafeMap points={mapPoints} onPick={(id) => openCafe(id)} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-brown/70">
          {[
            ["Saved", STATUS_COLOR.saved],
            ["Want to try", STATUS_COLOR.want],
            ["Been here", STATUS_COLOR.been],
            ["Loved", STATUS_COLOR.loved],
          ].map(([l, c]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {l}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <GhostButton className="w-full" onClick={() => setModal(true)}>
          <Icon name="plus" size={16} /> New list
        </GhostButton>
      </div>

      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-2 pb-2 text-sm transition ${
              tab === t ? "border-gold font-medium text-espresso" : "border-transparent text-brown/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "Top 5" &&
          (ranked.length === 0 ? (
            <EmptyState icon="trophy" title="No rankings yet" sub="Rank a café and your personal top list builds itself." />
          ) : (
            <div className="space-y-2.5">
              {ranked.slice(0, 5).map(({ cafe, r }, i) => (
                <SavedRow key={cafe.id} cafe={cafe} statusLabel={`#${i + 1} · ${r.overall.toFixed(1)}`} />
              ))}
            </div>
          ))}

        {tab === "Saved" &&
          (savedCafes.length === 0 ? (
            <EmptyState icon="bookmark" title="Nothing saved yet" sub="Your saved spots will live here." />
          ) : (
            <div className="space-y-2.5">
              {savedCafes.map((c) => (
                <SavedRow key={c.id} cafe={c} />
              ))}
            </div>
          ))}

        {tab === "Lists" && (
          <div className="grid grid-cols-2 gap-3">
            {myLists.map((l) => {
              const cover = cafeById(l.cover);
              return (
                <button
                  key={l.id}
                  onClick={() => setOpenListId(l.id)}
                  className="overflow-hidden rounded-xl2 border border-line bg-card text-left shadow-card"
                >
                  <CafeImage src={cover?.images[0]} alt={l.title} seed={l.id} rounded="rounded-none" className="h-24 w-full" />
                  <div className="p-3">
                    <h4 className="serif text-lg leading-tight text-espresso">{l.title}</h4>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-brown/70">
                      {!l.public && <Icon name="lock" size={11} />} {l.cafeIds.length} places
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === "Reviews" &&
          (ranked.length === 0 ? (
            <EmptyState icon="star" title="No reviews yet" sub="Reviews you write appear here." />
          ) : (
            <div className="space-y-3">
              {ranked.map(({ cafe, r }) => (
                <div key={cafe.id} className="rounded-xl2 border border-line bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <h4 className="serif text-xl text-espresso">{cafe.name}</h4>
                    <span className="serif text-lg text-gold">{r.overall.toFixed(1)}</span>
                  </div>
                  {r.review && <p className="mt-1 text-sm text-brown/80">“{r.review}”</p>}
                  {r.bestItem && <p className="mt-1 text-xs text-gold">Best: {r.bestItem}</p>}
                </div>
              ))}
            </div>
          ))}
      </div>

      {(user?.email || "").toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase() && (
        <a
          href="/admin"
          className="mx-auto mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-espresso px-5 py-3 text-sm font-medium text-cream shadow-card"
        >
          <Icon name="sliders" size={16} /> Open admin dashboard
        </a>
      )}

      <button onClick={signOut} className="mx-auto mt-6 block text-sm font-medium text-brown/60">
        Sign out
      </button>

      {modal && <NewListModal onClose={() => setModal(false)} />}
      {editOpen && (
        <EditProfileModal
          current={{ name: displayName, bio, avatarUrl: user?.avatarUrl, avatar: me.avatar, email: user?.email, city: user?.city }}
          onSave={(patch) => {
            updateProfile(patch);
            setEditOpen(false);
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}

const ALL_CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain", "Al Ain", "London", "Toronto", "New York", "Riyadh", "Doha", "Paris"];

function EditProfileModal({ current, onSave, onClose }) {
  const [name, setName] = useState(current.name || "");
  const [bio, setBio] = useState(current.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(current.avatarUrl || null);
  const [city, setCity] = useState(current.city || "Dubai");

  function pickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-[1600] flex items-end justify-center bg-espresso/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[460px] animate-sheetUp rounded-t-xl3 border border-line bg-card p-5 pb-10 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-beige" />
        <h3 className="serif text-3xl text-espresso">Edit profile</h3>

        <div className="mt-4 flex flex-col items-center">
          <Avatar user={{ name, avatar: current.avatar, avatarUrl }} size={88} ring />
          <label className="mt-3 cursor-pointer rounded-full border border-line bg-ivory px-4 py-2 text-xs font-medium text-gold">
            Change photo
            <input type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
          </label>
          {avatarUrl && (
            <button onClick={() => setAvatarUrl(null)} className="mt-1 text-[11px] text-brown/55">
              Remove photo
            </button>
          )}
        </div>

        <label className="mt-5 block text-sm text-brown/80">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-ivory px-3 py-3 text-sm focus:border-gold focus:outline-none"
        />
        <label className="mt-3 block text-sm text-brown/80">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={140}
          placeholder="Matcha, brunch, hidden gems."
          className="mt-1 w-full resize-none rounded-xl border border-line bg-ivory px-3 py-3 text-sm focus:border-gold focus:outline-none"
        />

        <label className="mt-3 block text-sm text-brown/80">City</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-ivory px-3 py-3 text-sm focus:border-gold focus:outline-none"
        >
          {ALL_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {current.email && (
          <>
            <label className="mt-3 block text-sm text-brown/80">Email</label>
            <div className="mt-1 flex items-center justify-between rounded-xl border border-line bg-beige/40 px-3 py-3 text-sm text-brown/70">
              <span className="truncate">{current.email}</span>
              <span className="ml-2 shrink-0 text-[11px] text-brown/40">can't change</span>
            </div>
          </>
        )}

        <PrimaryButton
          className="mt-5 w-full !py-3.5"
          onClick={() => onSave({ name: name.trim() || current.name, bio: bio.trim(), avatarUrl, city })}
        >
          Save changes
        </PrimaryButton>
      </div>
    </div>
  );
}
