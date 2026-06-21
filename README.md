# Sipp — Your Dubai café map

A premium, mobile-first social café discovery web app for Dubai & the UAE.
**Discover. Save. Rank. Share.** — for cafés, matcha spots, brunch dates, hidden gems and everything in between.

Built with **Next.js (App Router) + React + Tailwind CSS**, with integration points for **Supabase** (auth/DB) and the **Google Places API** (café import).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

The app is **fully functional out of the box** — no keys required:

- Rich Dubai café seed data
- Saves / Want to Try / Been Here / Likes, ranks, lists and follows persist in `localStorage`
- A real interactive map (Leaflet + light CartoDB tiles) with custom Sipp pins, clustering-style markers, a bottom sheet, "Search this area" and "Near me"
- Admin import tools at **/admin** (returns simulated Places results until a key is added)

## Wiring up the backend (optional)

Copy `.env.local.example` → `.env.local` and fill in:

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  Schema (suggested tables): `users, places, reviews, saves, lists, list_items, follows, activity, place_import_logs`.
- **Google Maps Platform**: `GOOGLE_MAPS_API_KEY` (server-side Places import via `src/app/api/places/import/route.js`)
  and optionally `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to swap Leaflet for Google Maps JS.

The `/api/places/import` route already calls the official **Places API (Text Search)** when a key is present and
flags non-café results so the admin can reject them — no scraping.

## Structure

```
src/
  app/
    layout.jsx          fonts, Leaflet CSS, store provider
    page.jsx            app shell: tabs + overlays
    admin/page.jsx      admin import dashboard
    api/places/import/  Google Places import (server)
  components/
    Chrome.jsx          logo header + bottom nav + toasts
    CafeCard.jsx        cafe cards + heart button
    UI.jsx              shared primitives
    Icons.jsx           thin-line icon set
    views/              Discover, MapView, Saved, RankView, Profile, Social, Lists, CafeProfile, ListDetail
  lib/
    seed.js             Dubai café + user + list seed data
    store.jsx           global state + localStorage persistence
```

## Design

Warm cream background, espresso-brown serif headings (Cormorant Garamond), muted-gold italic accents,
soft rounded cream cards, a faint Dubai skyline + palm-corner motif, and an app-style bottom nav.
