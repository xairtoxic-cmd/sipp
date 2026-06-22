// Admin-only: list recent posts (reviews) and delete any of them.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { data: reviews, error } = await supabaseAdmin
    .from("reviews")
    .select("id, user_id, place_id, overall, review_text, created_at, photo_urls")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set(reviews.map((r) => r.user_id))];
  const placeIds = [...new Set(reviews.map((r) => r.place_id))];
  const { data: profs } = await supabaseAdmin.from("profiles").select("id, name, username").in("id", userIds);
  const { data: places } = await supabaseAdmin.from("places").select("id, name").in("id", placeIds);
  const pmap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  const plmap = Object.fromEntries((places || []).map((p) => [p.id, p.name]));

  const out = reviews.map((r) => ({
    id: r.id,
    text: r.review_text || "",
    overall: r.overall,
    createdAt: r.created_at,
    photo: (r.photo_urls || [])[0] || null,
    author: pmap[r.user_id]?.name || pmap[r.user_id]?.username || "Someone",
    place: plmap[r.place_id] || r.place_id,
  }));
  return NextResponse.json({ reviews: out });
}

export async function DELETE(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { error } = await supabaseAdmin.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
