// Server-side Google Places import endpoint.
// Uses the official Google Places API (Text Search) when GOOGLE_MAPS_API_KEY is set.
// Falls back to simulated results (from seed) so the admin tools work without a key.

import { NextResponse } from "next/server";
import { CAFES } from "@/lib/seed";

const CAFE_TYPE_HINTS = ["cafe", "coffee", "matcha", "brunch", "bakery", "dessert", "tea", "roaster"];
const FINE_HINTS = ["fine dining", "tasting", "michelin", "chef", "lounge", "rooftop", "steak", "omakase", "brasserie", "grill"];

function looksLikeCafe(name = "", types = []) {
  const n = name.toLowerCase();
  const t = types.join(" ").toLowerCase();
  return CAFE_TYPE_HINTS.some((h) => n.includes(h) || t.includes(h)) ||
    types.includes("cafe") || types.includes("coffee_shop") || types.includes("bakery");
}

// Suggest a curated category for the admin to confirm. Premium restaurants only.
function guessCategory(name = "", types = [], priceLevel) {
  const n = name.toLowerCase();
  const t = types.join(" ").toLowerCase();
  if (looksLikeCafe(name, types)) return "cafe";
  const fineSignal = FINE_HINTS.some((h) => n.includes(h)) || ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE", 4].includes(priceLevel);
  if ((t.includes("restaurant") || types.includes("fine_dining_restaurant")) && fineSignal) return "fine_dining";
  return null; // not curated — admin can reject
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { emirate = "Dubai", area = "", type = "cafe", radius = 5000 } = body;
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    // Simulated import — return a sample drawn from seed data.
    const sample = CAFES
      .filter((c) => (area ? c.area.toLowerCase().includes(area.toLowerCase()) : true))
      .slice(0, 8)
      .map((c) => ({
        google_place_id: "seed_" + c.id,
        name: c.name,
        formatted_address: c.address,
        area: c.area,
        emirate,
        lat: c.lat,
        lng: c.lng,
        primary_type: c.category === "fine_dining" ? "restaurant" : "cafe",
        types: c.category === "fine_dining" ? ["restaurant", "fine_dining_restaurant"] : ["cafe", "coffee_shop"],
        google_rating: c.rating,
        google_rating_count: c.reviews,
        price_level: c.price,
        is_cafe: c.category !== "fine_dining",
        place_category: c.category || "cafe",
      }));
    return NextResponse.json({ simulated: true, query: `${type} in ${area || emirate}`, results: sample });
  }

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus",
      },
      body: JSON.stringify({
        textQuery: `${type} in ${area ? area + ", " : ""}${emirate}, UAE`,
        maxResultCount: 20,
        regionCode: "AE",
      }),
    });
    const data = await res.json();
    const results = (data.places || [])
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map((p) => ({
        google_place_id: p.id,
        name: p.displayName?.text,
        formatted_address: p.formattedAddress,
        area,
        emirate,
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        primary_type: p.primaryType,
        types: p.types || [],
        google_rating: p.rating,
        google_rating_count: p.userRatingCount,
        price_level: p.priceLevel,
        phone: p.nationalPhoneNumber,
        website: p.websiteUri,
        google_maps_url: p.googleMapsUri,
        is_cafe: looksLikeCafe(p.displayName?.text, p.types),
        place_category: guessCategory(p.displayName?.text, p.types, p.priceLevel),
      }));
    return NextResponse.json({ simulated: false, query: `${type} in ${area || emirate}`, results });
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 500 });
  }
}
