// Admin-only: control Tastemaker board badges.
// Actions: set_pick (Sipp Pick on/off), clear_badge, recalc (one), recalc_all.
// Admin-token gated; writes/recalcs with the service-role client.
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

  if (b.action === "recalc_all") {
    const { data, error } = await supabaseAdmin.rpc("recalc_all_board_scores");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: data });
  }

  if (!b.boardId) return NextResponse.json({ error: "Missing board." }, { status: 400 });

  if (b.action === "set_pick") {
    const { error } = await supabaseAdmin.from("lists").update({ sipp_pick: !!b.sippPick }).eq("id", b.boardId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (b.action === "clear_badge") {
    const { error } = await supabaseAdmin.from("lists").update({ sipp_pick: false, badge_status: "none" }).eq("id", b.boardId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, board: { id: b.boardId, badge_status: "none", sipp_pick: false } });
  }

  // Recalc this board so the badge reflects the change immediately.
  const { error: rErr } = await supabaseAdmin.rpc("recalc_board_score", { bid: b.boardId });
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  const { data: row } = await supabaseAdmin
    .from("lists")
    .select("id,badge_status,board_score,sipp_pick,saves_count,views_count,place_clicks_count")
    .eq("id", b.boardId)
    .maybeSingle();
  return NextResponse.json({ ok: true, board: row });
}
