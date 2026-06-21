"use client";

import { menuFor } from "@/lib/seed";
import { Icon } from "./Icons";

export default function MenuSheet({ cafe, onClose }) {
  const menu = menuFor(cafe);
  return (
    <div className="fixed inset-0 z-[1600] flex items-end justify-center bg-espresso/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-[460px] flex-col animate-sheetUp rounded-t-xl3 border border-line bg-cream pb-[max(env(safe-area-inset-bottom),14px)] shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-beige" />
          <div className="flex items-start justify-between">
            <div>
              <h3 className="serif text-3xl text-espresso">Menu</h3>
              <p className="text-sm text-brown/70">{cafe.name} · {cafe.area}</p>
            </div>
            <button onClick={onClose} className="text-brown/50">
              <Icon name="x" size={22} />
            </button>
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
          {menu.map((sec) => (
            <div key={sec.category} className="mb-5">
              <h4 className="mb-2 serif text-2xl text-espresso">
                {sec.category}
              </h4>
              <div className="overflow-hidden rounded-xl2 border border-line bg-card shadow-card">
                {sec.items.map((it, i) => (
                  <div
                    key={it.name}
                    className={`flex items-center justify-between px-4 py-3 ${i ? "border-t border-line" : ""}`}
                  >
                    <span className="text-sm text-espresso">{it.name}</span>
                    <span className="serif text-lg text-gold">
                      {it.price} <span className="text-xs text-brown/60">AED</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="pb-2 text-center text-[11px] text-brown/50">
            Sample menu · prices in AED and may vary in-store.
          </p>
        </div>
      </div>
    </div>
  );
}
