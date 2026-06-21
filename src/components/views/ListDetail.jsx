"use client";

import { useStore } from "@/lib/store";
import { cafeById } from "@/lib/seed";
import { Icon } from "../Icons";
import { CafeImage, EmptyState } from "../UI";
import { SavedRow } from "../CafeCard";

export default function ListDetail({ listId }) {
  const { lists, setOpenListId, toast } = useStore();
  const list = lists.find((l) => l.id === listId);
  if (!list) return null;
  const cafes = list.cafeIds.map(cafeById).filter(Boolean);
  const cover = cafeById(list.cover);

  return (
    <div className="fixed inset-0 z-[1500] overflow-y-auto bg-cream no-scrollbar">
      <div className="relative">
        <CafeImage src={cover?.images[0]} alt={list.title} seed={list.id} rounded="rounded-none" className="h-56 w-full" />
        <button
          onClick={() => setOpenListId(null)}
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-cream/90 text-espresso shadow-card backdrop-blur"
        >
          <Icon name="back" size={20} />
        </button>
        <button
          onClick={() => toast("Share link copied ✓")}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-cream/90 text-espresso shadow-card backdrop-blur"
        >
          <Icon name="share" size={18} />
        </button>
      </div>
      <div className="relative z-10 mx-auto max-w-[460px] px-5 pb-24">
        <div className="-mt-8 rounded-xl3 border border-line bg-card p-5 shadow-float">
          <h1 className="serif text-3xl text-espresso">{list.title}</h1>
          <p className="mt-1 text-sm text-brown/80">{list.desc}</p>
          <p className="mt-2 flex items-center gap-1 text-xs text-gold">
            {!list.public && <Icon name="lock" size={12} />} {cafes.length} places · {list.public ? "Public" : "Private"}
          </p>
        </div>

        <div className="mt-4 space-y-2.5">
          {cafes.length === 0 ? (
            <EmptyState icon="list" title="Empty list" sub="Open a café and add it to this list." />
          ) : (
            cafes.map((c) => <SavedRow key={c.id} cafe={c} />)
          )}
        </div>
      </div>
    </div>
  );
}
