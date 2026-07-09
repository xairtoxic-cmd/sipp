import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// In-app account deletion (Play Store / App Store requirement).
// Verifies the caller's session, wipes their content, then deletes the auth user.
export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Backend not configured." }, { status: 500 });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: who } = await supabaseAdmin.auth.getUser(token);
  const uid = who?.user?.id;
  if (!uid) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  try {
    // Items inside my boards first (no FK cascade assumptions).
    const { data: myLists } = await supabaseAdmin.from("lists").select("id").eq("user_id", uid);
    const listIds = (myLists || []).map((l) => l.id);
    if (listIds.length) {
      await supabaseAdmin.from("list_items").delete().in("list_id", listIds);
      await supabaseAdmin.from("list_saves").delete().in("list_id", listIds);
      await supabaseAdmin.from("board_collaborators").delete().in("board_id", listIds);
    }
    const tables = [
      ["review_likes", "user_id"], ["comments", "user_id"], ["reviews", "user_id"],
      ["saves", "user_id"], ["list_saves", "user_id"], ["board_collaborators", "user_id"],
      ["lists", "user_id"], ["checkins", "user_id"], ["push_tokens", "user_id"],
      ["passport_stamps", "user_id"], ["events", "user_id"],
      ["user_blocks", "blocker_id"], ["user_blocks", "blocked_id"],
      ["profiles", "id"],
    ];
    for (const [t, col] of tables) {
      try { await supabaseAdmin.from(t).delete().eq(col, uid); } catch {}
    }
    try { await supabaseAdmin.from("follows").delete().or(`follower_id.eq.${uid},following_id.eq.${uid}`); } catch {}
    await supabaseAdmin.auth.admin.deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Deletion failed — contact canada@surayyagroup.com." }, { status: 500 });
  }
}
