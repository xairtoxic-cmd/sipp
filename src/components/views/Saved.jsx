"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "../Icons";
import { Chip, EmptyState, CafeImage } from "../UI";
import { SavedRow } from "../CafeCard";
import { LogoHeader } from "../Chrome";

const TABS = ["All", "Lists", "Want to Try", "Been Here"];

export default function Saved() {
  const { saves, lists, getStatus, go, setOpenListId, cafes, cafeById } = useStore();
  const [tab, setTab] = useState("All");

  const flagged = (flag) => cafes.filter((c) => getStatus(c.id)[flag]);
  const anySaved = cafes.filter((c) => {
    const s = getStatus(c.id);
    return s.saved || s.liked || s.want || s.been || s.loved;
  });

  const myLists = lists.filter((l) => l.owner === "me");

  function statusLabel(c) {
    const s = getStatus(c.id);
    if (s.loved) return "Loved It";
    if (s.been) return "Been Here";
    if (s.want) return "Want to Try";
    if (s.saved) return "Saved";
    if (s.liked) return "Liked";
    return null;
  }

  let body;
  if (tab === "Lists") {
    body = (
      <div className="grid grid-cols-2 gap-3">
        {myLists.map((l) => {
          const cover = cafeById(l.cover);
          return (
            <button
              key={l.id}
              onClick={() => {
                setOpenListId(l.id);
              }}
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
        <button
          onClick={() => go("profile")}
          className="grid min-h-[140px] place-items-center rounded-xl2 border border-dashed border-gold/50 bg-ivory text-gold"
        >
          <span className="flex flex-col items-center gap-1 text-sm">
            <Icon name="plus" size={22} /> New list
          </span>
        </button>
      </div>
    );
  } else {
    let list;
    if (tab === "All") list = anySaved;
    else if (tab === "Cafés") list = flagged("saved").filter((c) => c.category !== "fine_dining");
    else if (tab === "Fine Dining") list = flagged("saved").filter((c) => c.category === "fine_dining");
    else if (tab === "Want to Try") list = flagged("want");
    else if (tab === "Been Here") list = flagged("been");
    else list = anySaved;

    body =
      list.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Nothing here yet"
          sub="Tap the heart on any café and it'll be saved beautifully in one place."
        />
      ) : (
        <div className="space-y-2.5">
          {list.map((c) => (
            <SavedRow key={c.id} cafe={c} statusLabel={statusLabel(c)} />
          ))}
        </div>
      );
  }

  return (
    <div className="px-5 pb-32">
      <LogoHeader>
        <h1 className="mt-2 px-1 serif text-4xl text-espresso">
          Saved <span className="gold-italic">spots</span>
        </h1>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {TABS.map((t) => (
            <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </LogoHeader>
      <div className="mt-4">{body}</div>
    </div>
  );
}
