// Reverse-geocode lat/lng → city name, using Google Geocoding (server-side key).
import { NextResponse } from "next/server";

export async function GET(req) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!lat || !lng || !key) return NextResponse.json({ city: null });
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality|administrative_area_level_1&key=${key}`
    );
    const data = await res.json();
    const comps = data.results?.[0]?.address_components || [];
    const locality = comps.find((c) => c.types.includes("locality"));
    const admin = comps.find((c) => c.types.includes("administrative_area_level_1"));
    return NextResponse.json({ city: locality?.long_name || admin?.long_name || null });
  } catch {
    return NextResponse.json({ city: null });
  }
}
