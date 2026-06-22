// Admin-only: roster of all users + who's active right now.
// "Active" = has produced an app event in the last 15 minutes (real activity).
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const users = list?.users || [];

  const { data: profs } = await supabaseAdmin.from("profiles").select("id, name, username, city, avatar_url");
  const pmap = Object.fromEntries((profs || []).map((p) => [p.id, p]));

  // Active in the last 15 minutes (from user_events).
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: ev } = await supabaseAdmin.from("user_events").select("user_id").gte("created_at", since).limit(5000);
  const activeIds = new Set((ev || []).map((e) => e.user_id));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const roster = users
    .map((u) => ({
      id: u.id,
      email: u.email,
      name: pmap[u.id]?.name || "",
      username: pmap[u.id]?.username || "",
      city: pmap[u.id]?.city || "",
      avatarUrl: pmap[u.id]?.avatar_url || null,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at || null,
      online: activeIds.has(u.id),
    }))
    .sort((a, b) => (b.online - a.online) || (new Date(b.lastSignIn || 0) - new Date(a.lastSignIn || 0)));

  const stats = {
    total: users.length,
    online: roster.filter((r) => r.online).length,
    newToday: users.filter((u) => new Date(u.created_at) >= todayStart).length,
  };
  return NextResponse.json({ stats, roster });
}
