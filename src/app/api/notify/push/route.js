import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Push notification fan-out. The client only names the event type and target —
// the message text is built HERE from the verified actor's profile, so a
// malicious client can't spoof content. Sends via Expo's push API.
const MESSAGES = {
  like: (n) => ({ title: "New like ❤️", body: `${n} liked your review` }),
  comment: (n, t) => ({ title: "New comment 💬", body: `${n}: ${t}` }),
  reply: (n, t) => ({ title: "New reply ↩️", body: `${n} replied: ${t}` }),
  mention: (n) => ({ title: "You were mentioned", body: `${n} mentioned you in a comment` }),
  follow: (n) => ({ title: "New follower", body: `${n} started following you` }),
  board_save: (n, t) => ({ title: "Board saved 🔖", body: `${n} saved your board${t ? ` “${t}”` : ""}` }),
};

export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Backend not configured." }, { status: 500 });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: who } = await supabaseAdmin.auth.getUser(token);
  const actorId = who?.user?.id;
  if (!actorId) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { type, targetUserId, text } = await req.json().catch(() => ({}));
  if (!MESSAGES[type] || !targetUserId || targetUserId === actorId) {
    return NextResponse.json({ ok: false });
  }

  const [{ data: actor }, { data: tokens }] = await Promise.all([
    supabaseAdmin.from("profiles").select("name").eq("id", actorId).maybeSingle(),
    supabaseAdmin.from("push_tokens").select("token").eq("user_id", targetUserId),
  ]);
  if (!tokens?.length) return NextResponse.json({ ok: true, sent: 0 });

  const snippet = String(text || "").slice(0, 90);
  const msg = MESSAGES[type](actor?.name || "Someone", snippet);
  const payload = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    title: msg.title,
    body: msg.body,
    data: { type },
  }));

  const resp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);

  // Prune tokens Expo says are dead (uninstalled devices).
  try {
    const out = await resp?.json();
    const dead = (out?.data || [])
      .map((r, i) => (r.status === "error" && r.details?.error === "DeviceNotRegistered" ? tokens[i].token : null))
      .filter(Boolean);
    if (dead.length) await supabaseAdmin.from("push_tokens").delete().in("token", dead);
  } catch {}

  return NextResponse.json({ ok: true, sent: payload.length });
}
