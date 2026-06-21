// Resolves a real café photo from the official Google Places Photos API.
// Returns { url } (a public googleusercontent URL — no key exposed) or { url: null }.
// Requires GOOGLE_MAPS_API_KEY. Without it, returns null so the UI keeps its stock image.

import { NextResponse } from "next/server";

const cache = new Map(); // query -> url | null

async function resolvePhoto(name, key) {
  const media = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=900&skipHttpRedirect=true&key=${key}`
  );
  const data = await media.json();
  return data.photoUri || null;
}

export async function GET(req) {
  const q = req.nextUrl.searchParams.get("q");
  const n = Math.min(6, Math.max(1, parseInt(req.nextUrl.searchParams.get("n") || "1", 10)));
  if (!q) return NextResponse.json({ url: null, urls: [] });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ url: null, urls: [] });

  const ck = `${q}|${n}`;
  if (cache.has(ck)) {
    const urls = cache.get(ck);
    return NextResponse.json({ url: urls[0] || null, urls });
  }

  try {
    // 1) Find the place + its photo references.
    const search = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.photos",
      },
      body: JSON.stringify({ textQuery: q + ", UAE", maxResultCount: 1, regionCode: "AE" }),
    });
    const data = await search.json();
    const names = (data.places?.[0]?.photos || []).slice(0, n).map((p) => p.name);
    if (!names.length) {
      cache.set(ck, []);
      return NextResponse.json({ url: null, urls: [] });
    }

    // 2) Resolve each photo to a public media URI.
    const resolved = await Promise.all(names.map((nm) => resolvePhoto(nm, key)));
    const urls = resolved.filter(Boolean);
    cache.set(ck, urls);
    return NextResponse.json({ url: urls[0] || null, urls });
  } catch (e) {
    cache.set(ck, []);
    return NextResponse.json({ url: null, urls: [], error: String(e) });
  }
}
