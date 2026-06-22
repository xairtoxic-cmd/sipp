"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icons";

export function Logo({ size = "text-3xl" }) {
  return <span className={`serif ${size} lowercase tracking-tight text-espresso`}>sipp</span>;
}

export function LogoHeader({ children, left, right }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > last && y > 80) setHidden(true);
      else if (y < last - 4) setHidden(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 -mx-5 mb-1 bg-cream/80 px-5 pb-2 pt-3 backdrop-blur-md transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="relative flex items-center justify-center">
        {left && <div className="absolute left-0">{left}</div>}
        {/* Sidebar already shows the brand on desktop — keep the row height, hide the duplicate logo. */}
        <span className="lg:invisible">
          <Logo />
        </span>
        {right && <div className="absolute right-0">{right}</div>}
      </div>
      {children}
    </header>
  );
}

export function HeaderIconButton({ icon, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-espresso shadow-card"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

const TABS = [
  { id: "discover", label: "Home", icon: "home" },
  { id: "explore", label: "Discover", icon: "compass" },
  { id: "rank", label: "Rank", icon: "trophy", center: true },
  { id: "map", label: "Map", icon: "pin" },
  { id: "profile", label: "Profile", icon: "user" },
];

// Desktop/laptop side rail (replaces the bottom bar at lg+).
const SIDEBAR_TABS = [
  { id: "discover", label: "Home", icon: "home" },
  { id: "explore", label: "Discover", icon: "compass" },
  { id: "map", label: "Map", icon: "pin" },
  { id: "rank", label: "Rank", icon: "trophy" },
  { id: "saved", label: "Saved", icon: "bookmark" },
  { id: "profile", label: "Profile", icon: "user" },
];

export function Sidebar() {
  const { tab, go } = useStore();
  return (
    <aside className="sticky top-0 z-[1200] hidden h-[100dvh] w-[244px] shrink-0 flex-col border-r border-line bg-cream/70 px-4 py-7 backdrop-blur-md lg:flex">
      <div className="px-3">
        <Logo size="text-[2.6rem]" />
      </div>
      <nav className="mt-10 flex flex-col gap-1.5">
        {SIDEBAR_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-left transition ${
                active ? "bg-espresso text-cream shadow-card" : "text-brown hover:bg-ivory"
              }`}
            >
              <Icon name={t.icon} size={22} fill={active && t.id === "saved" ? "currentColor" : "none"} />
              <span className={`text-[15px] ${active ? "font-semibold" : "font-medium"}`}>{t.label}</span>
            </button>
          );
        })}
      </nav>
      <p className="mt-auto px-3 text-[11px] text-brown/45">Cafés by day. Fine dining by night.</p>
    </aside>
  );
}

export function BottomNav() {
  const { tab, go } = useStore();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[1200] flex justify-center lg:hidden">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[460px] items-end justify-around rounded-t-xl3 border border-b-0 border-line bg-cream/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 shadow-float backdrop-blur-md">
        {TABS.map((t) => {
          const active = tab === t.id;
          if (t.center) {
            return (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className="-mt-7 flex flex-col items-center gap-1"
                aria-label={t.label}
              >
                <span
                  className={`grid h-14 w-14 place-items-center rounded-full border-4 border-cream shadow-float transition ${
                    active ? "bg-espresso text-cream" : "bg-gold text-cream"
                  }`}
                >
                  <Icon name={t.icon} size={24} />
                </span>
                <span className={`text-[10px] ${active ? "text-espresso" : "text-brown/60"}`}>{t.label}</span>
              </button>
            );
          }
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className="flex flex-1 flex-col items-center gap-1 py-1"
              aria-label={t.label}
            >
              <span className={active ? "text-espresso" : "text-brown/50"}>
                <Icon name={t.icon} size={22} fill={active && (t.id === "saved") ? "currentColor" : "none"} />
              </span>
              <span className={`text-[10px] ${active ? "font-medium text-espresso" : "text-brown/55"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[1700] flex flex-col items-center gap-2 px-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto animate-pop rounded-full bg-espresso px-5 py-3 text-sm font-medium text-cream shadow-float"
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
