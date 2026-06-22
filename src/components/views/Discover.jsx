"use client";

import MobileFeed from "./MobileFeed";
import ClassicHome from "./ClassicHome";

// Home: the Instagram-style feed on mobile, the classic discovery layout on desktop.
export default function Discover() {
  return (
    <>
      <div className="lg:hidden">
        <MobileFeed />
      </div>
      <div className="hidden lg:block">
        <ClassicHome />
      </div>
    </>
  );
}
