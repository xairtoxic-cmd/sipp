import { CAFES, REVIEWS, USERS, personalityFor } from "@/lib/seed";

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=70`;

export function generateMetadata({ params }) {
  const cafe = CAFES.find((c) => c.id === params.slug);
  if (!cafe) return { title: "Sipp" };
  return {
    title: `${cafe.name} — ${cafe.area} · Sipp`,
    description: `${cafe.name} scores ${cafe.sippScore.toFixed(1)} on Sipp. ${cafe.tags.join(" · ")}.`,
  };
}

export default function SharePlace({ params }) {
  const cafe = CAFES.find((c) => c.id === params.slug);

  if (!cafe) {
    return (
      <main className="mx-auto grid min-h-[100dvh] max-w-[460px] place-items-center px-6 text-center">
        <div>
          <span className="serif text-4xl lowercase text-espresso">sipp</span>
          <p className="mt-3 text-brown/70">That café isn’t on Sipp yet.</p>
          <a href="/" className="mt-4 inline-block rounded-full bg-espresso px-5 py-3 text-sm text-cream">Open Sipp</a>
        </div>
      </main>
    );
  }

  const top = REVIEWS.filter((r) => r.cafeId === cafe.id).sort((a, b) => b.overall - a.overall)[0];
  const reviewer = top ? USERS[top.user] : null;
  const personality = personalityFor(cafe);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[460px] px-5 pb-12">
      <div className="relative -mx-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cafe.images?.[0] || img("1554118811-1e0d58224f24")} alt={cafe.name} className="h-72 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 to-transparent" />
        <div className="absolute left-5 top-4 serif text-2xl lowercase text-cream">sipp</div>
        <div className="absolute inset-x-5 bottom-5 text-cream">
          <div className="flex items-end justify-between">
            <h1 className="serif text-4xl leading-none">{cafe.name}</h1>
            <span className="serif text-5xl font-bold leading-none">{cafe.sippScore.toFixed(1)}</span>
          </div>
          <p className="mt-1 text-sm text-cream/85">{cafe.area}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {cafe.tags.map((t) => (
          <span key={t} className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-brown">{t}</span>
        ))}
      </div>

      {top && (
        <div className="mt-4 rounded-xl2 border border-line bg-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-gold">Highest-rated review</p>
          <p className="mt-1 text-sm text-espresso/90">“{top.text}”</p>
          <p className="mt-2 text-xs text-brown/70">{reviewer?.name} · {top.overall.toFixed(1)} ★</p>
        </div>
      )}

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

      <a
        href="/"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-espresso px-5 py-4 text-sm font-medium text-cream shadow-card"
      >
        Open in Sipp
      </a>
    </main>
  );
}
