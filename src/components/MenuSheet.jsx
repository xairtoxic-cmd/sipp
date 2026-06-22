"use client";

import { menuFor } from "@/lib/seed";
import { Icon } from "./Icons";
import { useBodyScrollLock } from "./UI";

export default function MenuSheet({ cafe, menu: menuProp, onClose }) {
  useBodyScrollLock();
  const raw = Array.isArray(menuProp) && menuProp.length ? menuProp : menuFor(cafe);
  // Normalise: support both { category } and { section }, guard items.
  const menu = (Array.isArray(raw) ? raw : []).map((s, i) => ({
    title: s.category || s.section || "Menu",
    items: Array.isArray(s.items) ? s.items : [],
    key: s.category || s.section || `sec-${i}`,
  }));
  const real = Array.isArray(menuProp) && menuProp.length > 0;
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

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {menu.map((sec) => (
            <div key={sec.key} className="mb-5">
              <h4 className="mb-2 serif text-2xl text-espresso">{sec.title}</h4>
              <div className="overflow-hidden rounded-xl2 border border-line bg-card shadow-card">
                {sec.items.map((it, i) => (
                  <div
                    key={`${it.name}-${i}`}
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
            {real ? "From the restaurant's website · prices in AED, may be out of date." : "Sample menu · prices in AED and may vary in-store."}
          </p>
        </div>
      </div>
    </div>
  );
}
