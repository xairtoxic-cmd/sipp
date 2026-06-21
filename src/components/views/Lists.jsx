"use client";

import { useStore } from "@/lib/store";
import { cafeById } from "@/lib/seed";
import { Icon } from "../Icons";
import { CafeImage } from "../UI";
import { LogoHeader } from "../Chrome";

export default function Lists() {
  const { lists, setOpenListId, go } = useStore();
  return (
    <div className="px-5 pb-32">
      <LogoHeader>
        <div className="mt-2 flex items-center gap-2 px-1">
          <button onClick={() => go("discover")} className="text-espresso">
            <Icon name="back" size={22} />
          </button>
          <h1 className="serif text-4xl text-espresso">
            Curated <span className="gold-italic">lists</span>
          </h1>
        </div>
      </LogoHeader>
      <p className="mt-2 px-1 text-sm text-brown/70">Your café journey, curated.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {lists.map((l) => {
          const cover = cafeById(l.cover);
          return (
            <button
              key={l.id}
              onClick={() => setOpenListId(l.id)}
              className="overflow-hidden rounded-xl2 border border-line bg-card text-left shadow-card transition active:scale-[0.99]"
            >
              <CafeImage src={cover?.images[0]} alt={l.title} seed={l.id} rounded="rounded-none" className="h-28 w-full" />
              <div className="p-3">
                <h4 className="serif text-lg leading-tight text-espresso">{l.title}</h4>
                <p className="mt-0.5 line-clamp-1 text-xs text-brown/70">{l.desc}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-gold">
                  {!l.public && <Icon name="lock" size={11} />} {l.cafeIds.length} places
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
