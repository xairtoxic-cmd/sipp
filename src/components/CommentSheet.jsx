"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icons";
import { Avatar, useBodyScrollLock } from "./UI";

export default function CommentSheet() {
  const { commentReviewId, setCommentReviewId, comments, addComment, reviews, getProfile, cafeById } = useStore();
  const [text, setText] = useState("");
  useBodyScrollLock(!!commentReviewId);
  if (!commentReviewId) return null;

  const review = reviews.find((r) => r.id === commentReviewId);
  const cafe = review ? cafeById(review.cafeId) : null;
  const list = comments[commentReviewId] || [];
  const close = () => {
    setCommentReviewId(null);
    setText("");
  };

  return (
    <div className="fixed inset-0 z-[1600] flex items-end justify-center bg-espresso/30 backdrop-blur-sm" onClick={close}>
      <div
        className="flex max-h-[80vh] w-full max-w-[460px] flex-col animate-sheetUp rounded-t-xl3 border border-line bg-card pb-[max(env(safe-area-inset-bottom),12px)] shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-beige" />
          <div className="flex items-center justify-between">
            <h3 className="serif text-2xl text-espresso">Comments</h3>
            <button onClick={close} className="text-brown/50">
              <Icon name="x" size={20} />
            </button>
          </div>
          {cafe && <p className="mt-0.5 text-xs text-brown/60">on {cafe.name}</p>}
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-brown/60">Be the first to comment.</p>
          ) : (
            <div className="space-y-3">
              {list.map((c) => {
                const u = getProfile(c.user);
                return (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Avatar user={u} size={32} />
                    <div className="rounded-2xl rounded-tl-md border border-line bg-ivory px-3.5 py-2.5">
                      <p className="text-xs font-medium text-espresso">{u.name}</p>
                      <p className="text-sm text-espresso/85">{c.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 pt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addComment(commentReviewId, text);
                setText("");
              }
            }}
            placeholder="Add a comment…"
            className="flex-1 rounded-full border border-line bg-ivory px-4 py-2.5 text-sm text-espresso placeholder:text-brown/40 focus:border-gold focus:outline-none"
          />
          <button
            onClick={() => {
              addComment(commentReviewId, text);
              setText("");
            }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-espresso text-cream"
          >
            <Icon name="share" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
