// Admin-only: set Sipp Rated / Sipp Star fields on a place.
// Verifies the caller is the configured admin (via their Supabase access token),
// then writes with the service-role client.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Backend not configured." }, { status: 500 });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: u } = await supabaseAdmin.auth.getUser(token);
  const email = (u?.user?.email || "").toLowerCase();
  if (!email || email !== ADMIN_EMAIL) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  if (!b.placeId) return NextResponse.json({ error: "Missing place." }, { status: 400 });

  const patch = {};
  const allow = [
    "is_sipp_rated", "sipp_rated_score", "has_sipp_star", "sipp_review_date",
    "sipp_reviewer_id", "sipp_public_note", "sipp_internal_note", "sipp_rating_breakdown", "sipp_rating_photos",
    // booking
    "accepts_reservations", "booking_provider", "booking_url", "booking_phone", "booking_whatsapp",
    "reservation_notes", "deposit_required", "walk_in_only", "booking_cta_enabled",
    // menu + picture
    "menu", "menu_source", "image_url",
  ];
  for (const k of allow) if (k in b) patch[k] = b[k] === "" ? null : b[k];

  const { error } = await supabaseAdmin.from("places").update(patch).eq("id", b.placeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
