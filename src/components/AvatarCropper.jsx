"use client";

import { useEffect, useRef, useState } from "react";
import { PrimaryButton } from "./UI";

const FRAME = 280; // on-screen crop square
const OUT = 512; // exported resolution

// Drag to reposition, slider to zoom, crops to a square. Calls onDone(blob).
export default function AvatarCropper({ file, busy, onCancel, onDone }) {
  const [src, setSrc] = useState(null);
  const [img, setImg] = useState(null); // { w, h }
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const imgElRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const im = new Image();
    im.onload = () => {
      setImg({ w: im.naturalWidth, h: im.naturalHeight });
      setScale(1);
      setPos({ x: 0, y: 0 });
      imgElRef.current = im;
    };
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Size the image to "cover" the frame at scale 1.
  const baseScale = img ? FRAME / Math.min(img.w, img.h) : 1;
  const dispW = img ? img.w * baseScale * scale : FRAME;
  const dispH = img ? img.h * baseScale * scale : FRAME;

  // Keep the frame fully covered (no empty edges).
  function clampPos(p) {
    const maxX = Math.max(0, (dispW - FRAME) / 2);
    const maxY = Math.max(0, (dispH - FRAME) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) };
  }

  function onDown(e) {
    drag.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onMove(e) {
    if (!drag.current) return;
    setPos(clampPos({ x: drag.current.ox + (e.clientX - drag.current.px), y: drag.current.oy + (e.clientY - drag.current.py) }));
  }
  function onUp() {
    drag.current = null;
  }

  function exportBlob() {
    if (!img || !imgElRef.current) return;
    const f = baseScale * scale; // screen px per source px
    const sw = FRAME / f;
    const sx = img.w / 2 - (FRAME / 2 + pos.x) / f;
    const sy = img.h / 2 - (FRAME / 2 + pos.y) / f;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgElRef.current, sx, sy, sw, sw, 0, 0, OUT, OUT);
    canvas.toBlob((blob) => blob && onDone(blob), "image/jpeg", 0.9);
  }

  return (
    <div className="fixed inset-0 z-[1700] flex items-end justify-center bg-espresso/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-[460px] animate-sheetUp rounded-t-xl3 border border-line bg-card p-5 pb-8 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-beige" />
        <h3 className="serif text-2xl text-espresso">Position your photo</h3>
        <p className="mt-0.5 text-sm text-brown/70">Drag to move · slide to zoom.</p>

        <div
          className="relative mx-auto mt-4 touch-none overflow-hidden rounded-full border border-line bg-ivory"
          style={{ width: FRAME, height: FRAME, cursor: "grab" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                width: dispW,
                height: dispH,
                left: FRAME / 2 + pos.x - dispW / 2,
                top: FRAME / 2 + pos.y - dispH / 2,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={scale}
          onChange={(e) => {
            const s = Number(e.target.value);
            setScale(s);
            // re-clamp with the new scale
            const maxX = Math.max(0, (img.w * baseScale * s - FRAME) / 2);
            const maxY = Math.max(0, (img.h * baseScale * s - FRAME) / 2);
            setPos((p) => ({ x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) }));
          }}
          className="mt-5 w-full accent-gold"
        />

        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-full border border-line bg-ivory py-3 text-sm font-medium text-brown">
            Cancel
          </button>
          <PrimaryButton className="flex-1 !py-3" onClick={exportBlob} disabled={busy || !img}>
            {busy ? "Uploading…" : "Use photo"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
