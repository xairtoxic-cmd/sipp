// Admin-only: grant/revoke a member's verified badge.
// Verifies the caller is the configured admin (via their Supabase access token),
// then writes profiles.verified with the service-role client.
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
  if (!b.userId) return NextResponse.json({ error: "Missing user." }, { status: 400 });

  const { error } = await supabaseAdmin.from("profiles").update({ verified: !!b.verified }).eq("id", b.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
