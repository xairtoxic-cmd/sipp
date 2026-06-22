import { personalityFor } from "@/lib/seed";

async function getPlace(slug) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/places?id=eq.${encodeURIComponent(slug)}&select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const rows = await res.json();
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const p = await getPlace(params.slug);
  if (!p) return { title: "Sipp" };
  return {
    title: `${p.name} — ${p.area || p.city} · Sipp`,
    description: `${p.name} scores ${Number(p.sipp_score).toFixed(1)} on Sipp. ${(p.tags || []).join(" · ")}.`,
  };
}

export default async function SharePlace({ params }) {
  const p = await getPlace(params.slug);

  if (!p) {
    return (
      <main className="mx-auto grid min-h-[100dvh] max-w-[460px] place-items-center px-6 text-center">
        <div>
          <span className="serif text-4xl lowercase text-espresso">sipp</span>
          <p className="mt-3 text-brown/70">That place isn’t on Sipp yet.</p>
          <a href="/" className="mt-4 inline-block rounded-full bg-espresso px-5 py-3 text-sm text-cream">Open Sipp</a>
        </div>
      </main>
    );
  }

  const cafe = { id: p.id, sippScore: Number(p.sipp_score) || 0, category: p.category || "cafe" };
  const personality = personalityFor(cafe);
  const isFine = p.category === "fine_dining";

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[460px] px-5 pb-12">
      <div className="relative -mx-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image_url || ""} alt={p.name} className="h-72 w-full bg-beige object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 to-transparent" />
        <div className="absolute left-5 top-4 serif text-2xl lowercase text-cream">sipp</div>
        <div className="absolute inset-x-5 bottom-5 text-cream">
          <div className="flex items-end justify-between">
            <h1 className="serif text-4xl leading-none">{p.name}</h1>
            <span className="serif text-5xl font-bold leading-none">{Number(p.sipp_score).toFixed(1)}</span>
          </div>
          <p className="mt-1 text-sm text-cream/85">{isFine ? "Fine Dining" : "Café"} · {p.area || p.city}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(p.tags || []).map((t) => (
          <span key={t} className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-brown">{t}</span>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-xl2 border border-line bg-card p-4 shadow-card">
        {Object.entries(personality).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm text-brown/80">{k}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-beige/60">
              <span className="block h-full rounded-full bg-gold" style={{ width: `${(v / 10) * 100}%` }} />
            </span>
            <span className="w-9 text-right serif text-lg text-espresso">{v.toFixed(1)}</span>
          </div>
        ))}
      </div>

      <a href="/" className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-espresso px-5 py-4 text-sm font-medium text-cream shadow-card">
        Open in Sipp
      </a>
    </main>
  );
}
