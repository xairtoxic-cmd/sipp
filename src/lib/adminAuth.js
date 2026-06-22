// Server-side admin gate. Verifies the caller's Supabase access token belongs to
// the configured admin email, then admin routes use the service-role client.
import { supabaseAdmin } from "./supabaseAdmin";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

export async function requireAdmin(req) {
  if (!supabaseAdmin) return { error: "Backend not configured.", status: 500 };
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Not signed in.", status: 401 };
  const { data } = await supabaseAdmin.auth.getUser(token);
  const email = (data?.user?.email || "").toLowerCase();
  if (!email || email !== ADMIN_EMAIL) return { error: "Admins only.", status: 403 };
  return { ok: true, email, user: data.user };
}
