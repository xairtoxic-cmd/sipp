// Public share page for a member profile: joinsipp.com/u/<id>
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(path) {
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: H, next: { revalidate: 300 } });
    return r.ok ? r.json() : [];
  } catch { return []; }
}

export async function generateMetadata({ params }) {
  const [p] = await rest(`profiles?id=eq.${params.id}&select=name,avatar_url`);
  if (!p) return { title: "Profile — Sipp" };
  const title = `${p.name} — Sipp`;
  const description = `Follow ${p.name} on Sipp — cafés worth visiting, ranked by people with taste.`;
  const img = p.avatar_url || null;
  return {
    title,
    description,
    openGraph: { title, description, images: img ? [{ url: img, width: 400, height: 400 }] : [], siteName: "Sipp" },
    twitter: { card: "summary_large_image", title, description, images: img ? [img] : [] },
  };
}

export default async function ProfileShare({ params }) {
  const [p] = await rest(`profiles?id=eq.${params.id}&select=id,name,username,bio,avatar_url,verified`);
  if (!p) {
    return (
      <main className="min-h-screen bg-[#F7F1E8] flex items-center justify-center px-6">
        <div className="text-center">
          <a href="/" className="font-serif text-4xl font-bold text-[#2F241E]">sipp</a>
          <p className="mt-4 text-[#7A6A5F]">This profile doesn’t exist.</p>
        </div>
      </main>
    );
  }
  const boards = await rest(`lists?user_id=eq.${p.id}&is_public=eq.true&select=id,title,emoji&limit=12`);
  const reviews = await rest(`reviews?user_id=eq.${p.id}&select=id&limit=500`);

  return (
    <main className="min-h-screen bg-[#F7F1E8]">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <a href="/" className="font-serif text-3xl font-bold text-[#2F241E]">sipp</a>
        <div className="mt-10 flex items-center gap-5">
          {p.avatar_url
            ? <img src={p.avatar_url} alt={p.name} className="h-20 w-20 rounded-full object-cover border-2 border-[#E6D8C5]" />
            : <div className="h-20 w-20 rounded-full bg-[#C49A5A] flex items-center justify-center font-serif text-3xl font-bold text-[#F7F1E8]">{(p.name || "?").slice(0, 1).toUpperCase()}</div>}
          <div>
            <h1 className="font-semibold text-2xl text-[#2F241E]">{p.name}{p.verified ? " ★" : ""}</h1>
            {p.username ? <p className="text-sm text-[#7A6A5F]">@{p.username}</p> : null}
          </div>
        </div>
        {p.bio ? <p className="mt-4 text-[15px] text-[#5C4F45]">{p.bio}</p> : null}
        <p className="mt-3 text-sm text-[#7A6A5F]">{reviews.length} review{reviews.length === 1 ? "" : "s"} · {boards.length} public board{boards.length === 1 ? "" : "s"}</p>

        {boards.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {boards.map((b) => (
              <a key={b.id} href={`/board/${b.id}`} className="rounded-2xl border border-[#E6D8C5] bg-[#FFFDF8] p-4">
                <p className="font-medium text-[15px] text-[#2F241E]">{b.emoji ? `${b.emoji} ` : ""}{b.title}</p>
              </a>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-[#E6D8C5] bg-[#FFFDF8] p-6 text-center">
          <p className="font-semibold text-lg text-[#2F241E]">Follow {p.name} on Sipp</p>
          <p className="mt-1 text-sm text-[#7A6A5F]">Discover, save and rank cafés with people who have taste.</p>
          <a href="/" className="mt-4 inline-block rounded-full bg-[#C49A5A] px-7 py-3 font-semibold text-[#F7F1E8]">Get Sipp</a>
        </div>
      </div>
    </main>
  );
}
