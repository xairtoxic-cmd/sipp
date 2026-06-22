"use client";

import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Icon } from "../Icons";
import { Avatar, GhostButton, PrimaryButton, EmptyState } from "../UI";
import { ReviewCard } from "../ReviewCard";

export default function UserProfile({ userId }) {
  const { closeUser, following, toggleFollow, getProfile, reviews, tasteMatchWith, toast } = useStore();
  const { user: me } = useAuth();
  const isMe = userId === me?.id;
  const user = getProfile(userId);
  const isFollowing = following.includes(userId);
  const userReviews = reviews.filter((r) => r.user === userId);

  function shareProfile() {
    const link = typeof window !== "undefined" ? window.location.origin : "https://joinsipp.com";
    const data = { title: `${user.name} on Sipp`, text: `Check out ${user.name} (${user.username}) on Sipp`, url: link };
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share(data).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => toast("Link copied ✓"), () => toast("Link copied ✓"));
    } else {
      toast("Link copied ✓");
    }
  }

  return (
    <div className="fixed inset-0 z-[1500] overflow-y-auto bg-cream no-scrollbar">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-cream/85 px-5 py-3 backdrop-blur">
        <button onClick={closeUser} className="text-espresso">
          <Icon name="back" size={22} />
        </button>
        <span className="serif text-xl lowercase text-espresso">sipp</span>
      </div>

      <div className="mx-auto max-w-[460px] px-5 pb-28">
        <div className="flex flex-col items-center pt-4 text-center">
          <Avatar user={user} size={84} ring />
          <h1 className="mt-3 flex items-center gap-1 serif text-4xl text-espresso">
            {user.name} {user.sparkle && <span className="text-gold">✨</span>}
          </h1>
          <p className="text-sm text-gold">{user.username}</p>
          {!isMe && (
            <p className="mt-2 serif text-xl text-espresso">
              <span className="gold-italic">{tasteMatchWith(userId)}%</span> taste match
            </p>
          )}
          {user.taste && (
            <span className="mt-2 rounded-full bg-gold/12 px-3 py-1 text-xs font-medium text-gold">{user.taste}</span>
          )}
          {user.bio && <p className="mt-2 max-w-xs text-sm text-brown/80">“{user.bio}”</p>}
        </div>

        {!isMe && (
          <div className="mt-5 flex gap-2">
            {isFollowing ? (
              <GhostButton className="flex-1" active onClick={() => toggleFollow(userId)}>
                Following
              </GhostButton>
            ) : (
              <PrimaryButton className="flex-1" onClick={() => toggleFollow(userId)}>
                Follow
              </PrimaryButton>
            )}
            <GhostButton className="!px-5" onClick={shareProfile} aria-label="Share profile">
              <Icon name="send" size={16} />
            </GhostButton>
          </div>
        )}

        <h3 className="mb-3 mt-7 serif text-2xl text-espresso">
          {user.name}'s <span className="gold-italic">reviews</span>
        </h3>
        {userReviews.length === 0 ? (
          <EmptyState icon="chat" title="No reviews yet" sub={`When ${user.name} reviews a café, it'll show up here.`} />
        ) : (
          <div className="space-y-4">
            {userReviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
