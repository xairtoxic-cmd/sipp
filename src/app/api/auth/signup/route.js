// Server-side signup that auto-confirms the account (no email confirmation needed).
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  const { name, username, email, password } = await req.json().catch(() => ({}));

  const handle = (username || "").trim().replace(/^@+/, "").toLowerCase();
  if (!name?.trim()) return NextResponse.json({ error: "Please enter your name." });
  if (!/^[a-z0-9._]{3,20}$/.test(handle)) return NextResponse.json({ error: "Username: 3–20 letters, numbers, . or _" });
  if (!/^\S+@\S+\.\S+$/.test(email || "")) return NextResponse.json({ error: "Enter a valid email." });
  if ((password || "").length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." });

  // Username taken?
  const { data: taken } = await supabaseAdmin.from("profiles").select("id").eq("username", "@" + handle).maybeSingle();
  if (taken) return NextResponse.json({ error: "That username is taken." });

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), username: "@" + handle },
  });
  if (error) {
    const msg = /already/i.test(error.message) ? "An account with that email already exists." : error.message;
    return NextResponse.json({ error: msg });
  }
  return NextResponse.json({ ok: true });
}
