"use client";

import { useState } from "react";
import { cafeById } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Icon } from "../Icons";
import { Avatar, CafeImage, GhostButton, EmptyState } from "../UI";
import { LogoHeader } from "../Chrome";

export default function Social() {
  const { openCafe, openUser, following, toggleFollow, go, reviews, profiles, getProfile, tasteMatchWith } = useStore();
  const { user: me } = useAuth();
  const [tab, setTab] = useState("Activity");
  const [userQ, setUserQ] = useState("");

  // Activity = recent reviews from people you follow (and you).
  const activity = reviews
    .filter((r) => r.user === me?.id || following.includes(r.user))
    .slice(0, 30);

  // People you can follow = everyone except you, filtered by the username search.
  const people = Object.values(profiles)
    .filter((p) => p.id !== me?.id)
    .filter((p) => {
      if (!userQ.trim()) return true;
      const s = userQ.trim().toLowerCase().replace(/^@/, "");
      return (p.username || "").toLowerCase().replace(/^@/, "").includes(s) || (p.name || "").toLowerCase().includes(s);
    });

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
          {["Activity", "People", "You"].map((t) => (
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
          {activity.length === 0 ? (
            <EmptyState
              icon="people"
              title="No activity yet"
              sub="Follow people, and their reviews show up here. Be the first to rank a café!"
            />
          ) : (
            activity.map((r) => {
              const u = getProfile(r.user);
              const c = cafeById(r.cafeId);
              if (!c) return null;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl2 border border-line bg-card p-3 shadow-card">
                  <button onClick={() => openUser(u.id)}>
                    <Avatar user={u} size={42} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-espresso">
                      <span className="font-semibold">{u.name}</span>{" "}
                      <span className="text-brown/70">ranked ({r.overall.toFixed(1)})</span>
                    </p>
                    <p className="truncate text-sm font-medium text-espresso">{c.name}</p>
                    <p className="text-xs text-brown/60">{c.area} · {r.time} ago</p>
                  </div>
                  <button onClick={() => openCafe(c.id)}>
                    <CafeImage src={c.images[0]} alt={c.name} seed={c.id} query={`${c.name}, ${c.area}`} className="h-14 w-14" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "People" && (
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 shadow-card">
            <Icon name="search" size={18} className="text-brown/60" />
            <input
              value={userQ}
              onChange={(e) => setUserQ(e.target.value)}
              placeholder="Find people by username"
              className="w-full bg-transparent text-sm text-espresso placeholder:text-brown/50 focus:outline-none"
            />
            {userQ && (
              <button onClick={() => setUserQ("")} className="text-brown/50">
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
          {people.length === 0 ? (
            <EmptyState icon="people" title="No one found" sub="No users match that username yet." />
          ) : (
            people.map((u) => {
              const isFollowing = following.includes(u.id);
              return (
                <div key={u.id} className="flex items-center gap-3 rounded-xl2 border border-line bg-card p-3 shadow-card">
                  <button onClick={() => openUser(u.id)}>
                    <Avatar user={u} size={46} />
                  </button>
                  <button onClick={() => openUser(u.id)} className="min-w-0 flex-1 text-left">
                    <p className="serif text-xl text-espresso">{u.name}</p>
                    <p className="text-xs text-gold">{tasteMatchWith(u.id)}% taste match</p>
                    {u.taste && <p className="truncate text-xs text-brown/70">{u.taste}</p>}
                  </button>
                  <GhostButton className="!px-4 !py-2 text-xs" active={isFollowing} onClick={() => toggleFollow(u.id)}>
                    {isFollowing ? "Following" : "Follow"}
                  </GhostButton>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "You" && (
        <div className="mt-4">
          <div className="rounded-xl2 border border-line bg-card p-5 text-center shadow-card">
            <p className="serif text-2xl text-espresso">Your activity</p>
            <p className="mt-1 text-sm text-brown/70">
              Save and rank cafés — people who follow you will see it here.
            </p>
            <GhostButton className="mt-4" onClick={() => go("rank")}>
              Rank a café
            </GhostButton>
          </div>
        </div>
      )}
    </div>
  );
}
