"use client";

import { useState } from "react";
import { FRIEND_ACTIVITY, USERS, cafeById, tasteMatchFor } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { Icon } from "../Icons";
import { Avatar, CafeImage, GhostButton } from "../UI";
import { LogoHeader } from "../Chrome";

const actionVerb = (a) => {
  if (a.action === "is at") return "is at";
  if (a.action === "ranked") return `ranked (${a.score})`;
  return "saved";
};

export default function Social() {
  const { openCafe, following, toggleFollow, go } = useStore();
  const [tab, setTab] = useState("Activity");

  return (
    <div className="px-5 pb-32">
      <LogoHeader>
        <div className="mt-2 flex items-center gap-2 px-1">
          <button onClick={() => go("discover")} className="text-espresso">
            <Icon name="back" size={22} />
          </button>
          <h1 className="serif text-4xl text-espresso">Friends</h1>
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {["Activity", "Following", "You"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm ${
                tab === t ? "bg-espresso text-cream" : "border border-line bg-card text-brown"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </LogoHeader>

      {tab === "Activity" && (
        <div className="mt-4 space-y-2.5">
          {FRIEND_ACTIVITY.map((a) => {
            const u = USERS[a.user] || { name: "You", avatar: "#B9935A" };
            const c = cafeById(a.cafeId);
            if (!c) return null;
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl2 border border-line bg-card p-3 shadow-card">
                <Avatar user={u} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-espresso">
                    <span className="font-semibold">{u.name}</span>{" "}
                    <span className="text-brown/70">{actionVerb(a)}</span>
                  </p>
                  <p className="truncate text-sm font-medium text-espresso">{c.name}</p>
                  <p className="text-xs text-brown/60">
                    {c.area} · {a.time} ago
                  </p>
                </div>
                <button onClick={() => openCafe(c.id)}>
                  <CafeImage src={c.images[0]} alt={c.name} seed={c.id} className="h-14 w-14" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Following" && (
        <div className="mt-4 space-y-2.5">
          {Object.values(USERS).map((u) => {
            const isFollowing = following.includes(u.id);
            return (
              <div key={u.id} className="flex items-center gap-3 rounded-xl2 border border-line bg-card p-3 shadow-card">
                <Avatar user={u} size={46} />
                <div className="flex-1">
                  <p className="serif text-xl text-espresso">{u.name}</p>
                  <p className="text-xs text-gold">{tasteMatchFor(u.id)}% taste match</p>
                  <p className="text-xs text-brown/70">{u.taste || u.bio}</p>
                </div>
                <GhostButton className="!px-4 !py-2 text-xs" active={isFollowing} onClick={() => toggleFollow(u.id)}>
                  {isFollowing ? "Following" : "Follow"}
                </GhostButton>
              </div>
            );
          })}
        </div>
      )}

      {tab === "You" && (
        <div className="mt-4 space-y-2.5">
          <div className="rounded-xl2 border border-line bg-card p-5 text-center shadow-card">
            <p className="serif text-2xl text-espresso">Your activity</p>
            <p className="mt-1 text-sm text-brown/70">
              Save and rank cafés — your friends will see it here, and you'll discover through people with taste.
            </p>
            <GhostButton className="mt-4" onClick={() => go("discover")}>
              Discover cafés
            </GhostButton>
          </div>
        </div>
      )}
    </div>
  );
}
