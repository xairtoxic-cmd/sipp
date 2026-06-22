"use client";

import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { AuthScreen, Onboarding } from "@/components/Auth";
import { BottomNav, Toasts, Sidebar } from "@/components/Chrome";
import Discover from "@/components/views/Discover";
import Explore from "@/components/views/Explore";
import MapView from "@/components/views/MapView";
import Saved from "@/components/views/Saved";
import RankView from "@/components/views/RankView";
import Profile from "@/components/views/Profile";
import Social from "@/components/views/Social";
import Lists from "@/components/views/Lists";
import CafeProfile from "@/components/views/CafeProfile";
import ListDetail from "@/components/views/ListDetail";
import UserProfile from "@/components/views/UserProfile";
import CommentSheet from "@/components/CommentSheet";
import { ShareCard } from "@/components/ShareCard";

function PalmCorner() {
  return (
    <svg className="palm-corner" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="#2b2118" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round">
        {[...Array(9)].map((_, i) => {
          const a = (-10 + i * 14) * (Math.PI / 180);
          const x = 200 + Math.cos(a) * 150;
          const y = 40 + Math.sin(a) * 150;
          return <line key={i} x1="200" y1="40" x2={x} y2={y} />;
        })}
      </g>
    </svg>
  );
}

export default function Home() {
  const { tab, openCafeId, openListId, openUserId, shareCafeId, closeShare, cafeById } = useStore();
  const { hydrated, isAuthed, needsOnboarding } = useAuth();

  const isMap = tab === "map";

  if (!hydrated) {
    return (
      <main className="relative mx-auto grid min-h-[100dvh] w-full max-w-[460px] place-items-center bg-cream">
        <div className="app-bg" />
        <span className="serif text-4xl lowercase text-espresso/80">sipp</span>
      </main>
    );
  }
  if (!isAuthed) return <AuthScreen />;
  if (needsOnboarding) return <Onboarding />;

  return (
    <div className="lg:flex">
      <Sidebar />
      <main className="relative mx-auto min-h-[100dvh] w-full max-w-[460px] bg-cream sm:my-0 sm:shadow-float lg:mx-0 lg:max-w-none lg:flex-1 lg:shadow-none">
        <div className="app-bg" />
        <PalmCorner />

        {isMap ? (
          <MapView />
        ) : (
          <div key={tab} className="view-enter mx-auto min-h-[100dvh] w-full max-w-[460px] lg:max-w-[1200px]">
            {tab === "discover" && <Discover />}
            {tab === "explore" && <Explore />}
            {tab === "saved" && <Saved />}
            {tab === "rank" && <RankView />}
            {tab === "profile" && <Profile />}
            {tab === "social" && <Social />}
            {tab === "lists" && <Lists />}
          </div>
        )}

        {openCafeId && <CafeProfile key={openCafeId} cafeId={openCafeId} />}
        {openListId && <ListDetail listId={openListId} />}
        {openUserId && <UserProfile userId={openUserId} />}
        {shareCafeId && <ShareCard cafe={cafeById(shareCafeId)} onClose={closeShare} />}
        <CommentSheet />

        <BottomNav />
        <Toasts />
      </main>
    </div>
  );
}
