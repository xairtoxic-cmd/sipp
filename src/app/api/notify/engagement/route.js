import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const FROM = "Sipp <hello@joinsipp.com>";
const SITE = "https://joinsipp.com";

function emailHtml({ heading, line, cta }) {
  return `<div style="margin:0;padding:0;background:#F7F0E6;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F0E6;padding:32px 0;">
    <tr><td align="center">
      <table width="440" cellpadding="0" cellspacing="0" style="background:#FFF9F0;border:1px solid #EADFCB;border-radius:18px;overflow:hidden;">
        <tr><td style="background:#2B2118;padding:24px 0;text-align:center;">
          <span style="font-size:32px;font-weight:600;color:#F7F0E6;letter-spacing:0.5px;">sipp</span>
        </td></tr>
        <tr><td style="padding:30px 36px 6px;text-align:center;">
          <h1 style="margin:0;font-size:23px;color:#2B2118;font-weight:600;">${heading}</h1>
          <p style="margin:12px 0 0;font-size:15px;color:#6b5a47;font-family:Arial,sans-serif;line-height:1.5;">${line}</p>
        </td></tr>
        <tr><td style="padding:22px 36px 34px;text-align:center;">
          <a href="${SITE}" style="display:inline-block;background:#2B2118;color:#F7F0E6;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;padding:13px 28px;border-radius:999px;">${cta}</a>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9b8a76;font-family:Arial,sans-serif;">Sipp · Cafés &amp; fine dining · Dubai</p>
    </td></tr>
  </table>
</div>`;
}

const esc = (s) => String(s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Backend not configured." }, { status: 500 });

  // Verify the caller and identify who took the action.
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: who } = await supabaseAdmin.auth.getUser(token);
  const actorId = who?.user?.id;
  if (!actorId) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { type, reviewId, text } = await req.json().catch(() => ({}));
  if (!["like", "comment"].includes(type) || !reviewId) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Find the post's author.
  const { data: rev } = await supabaseAdmin
    .from("reviews")
    .select("user_id, place_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (!rev?.user_id) return NextResponse.json({ ok: true }); // nothing to notify
  if (rev.user_id === actorId) return NextResponse.json({ ok: true }); // don't email yourself

  // Author's email + actor/place names.
  const [{ data: authUser }, { data: actor }, place] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(rev.user_id),
    supabaseAdmin.from("profiles").select("name, username").eq("id", actorId).maybeSingle(),
    rev.place_id
      ? supabaseAdmin.from("places").select("name").eq("id", rev.place_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const email = authUser?.user?.email;
  if (!email) return NextResponse.json({ ok: true });

  const actorName = actor?.name || actor?.username || "Someone";
  const placeName = place?.data?.name || "your spot";

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ ok: true, skipped: "RESEND_API_KEY not set" });

  const subject = type === "like" ? `${actorName} liked your Sipp post` : `${actorName} replied to your Sipp post`;
  const heading = type === "like" ? "You got a like 🤍" : "New comment on your post 💬";
  const line =
    type === "like"
      ? `${esc(actorName)} liked your review of <strong>${esc(placeName)}</strong>.`
      : `${esc(actorName)} commented on your review of <strong>${esc(placeName)}</strong>:<br>“${esc((text || "").slice(0, 160))}”`;
  const cta = "Open Sipp";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, subject, html: emailHtml({ heading, line, cta }) }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: "send failed", detail: detail.slice(0, 300) }, { status: 502 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: "send error" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
