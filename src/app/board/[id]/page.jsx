// Public share page for a board: joinsipp.com/board/<id>
// Server-rendered from Supabase REST with the anon key — RLS means only
// public boards resolve; private ones fall through to the empty state.
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(path) {
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: H, next: { revalidate: 300 } });
    return r.ok ? r.json() : [];
  } catch { return []; }
}

// WhatsApp drops og:image over ~600KB — serve a 600px variant of lh3/unsplash URLs.
function ogSize(u) {
  if (!u) return u;
  if (u.includes("googleusercontent.com")) { const i = u.lastIndexOf("="); return i > 0 ? `${u.slice(0, i)}=w600-h600` : u; }
  if (u.includes("images.unsplash.com")) return `${u.split("?")[0]}?w=600&q=70&auto=format`;
  return u;
}

export async function generateMetadata({ params }) {
  const [b] = await rest(`lists?id=eq.${params.id}&select=title,emoji,cover_image_url,user_id`);
  if (!b) return { title: "Board — Sipp" };
  let img = b.cover_image_url;
  if (!img) {
    const items = await rest(`list_items?list_id=eq.${params.id}&select=place_id&limit=1`);
    if (items[0]) {
      const [p] = await rest(`places?id=eq.${items[0].place_id}&select=image_url`);
      img = p?.image_url;
    }
  }
  const title = `${b.emoji ? b.emoji + " " : ""}${b.title} — Sipp`;
  const description = "A board of places worth visiting, on Sipp.";
  img = ogSize(img);
  return {
    title,
    description,
    openGraph: { title, description, images: img ? [{ url: img, width: 600, height: 600 }] : [], siteName: "Sipp" },
    twitter: { card: "summary_large_image", title, description, images: img ? [img] : [] },
  };
}

export default async function BoardShare({ params }) {
  const [board] = await rest(`lists?id=eq.${params.id}&select=id,title,emoji,description,user_id,is_public`);
  if (!board) {
    return (
      <main className="min-h-screen bg-[#F7F1E8] flex items-center justify-center px-6">
        <div className="text-center">
          <a href="/" className="font-serif text-4xl font-bold text-[#2F241E]">sipp</a>
          <p className="mt-4 text-[#7A6A5F]">This board is private or no longer exists.</p>
        </div>
      </main>
    );
  }
  const [owner] = await rest(`profiles?id=eq.${board.user_id}&select=name,username`);
  const items = await rest(`list_items?list_id=eq.${board.id}&select=place_id`);
  const ids = items.map((i) => `"${i.place_id}"`).join(",");
  const places = ids ? await rest(`places?id=in.(${ids})&select=id,name,area,city,image_url&limit=30`) : [];

  return (
    <main className="min-h-screen bg-[#F7F1E8]">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <a href="/" className="font-serif text-3xl font-bold text-[#2F241E]">sipp</a>
        <h1 className="mt-8 font-semibold text-3xl text-[#2F241E]">{board.emoji ? `${board.emoji} ` : ""}{board.title}</h1>
        <p className="mt-2 text-sm text-[#7A6A5F]">
          A board by {owner?.name || "a Sipp member"} · {places.length} place{places.length === 1 ? "" : "s"}
        </p>
        {board.description ? <p className="mt-3 text-[15px] text-[#5C4F45]">{board.description}</p> : null}

        <div className="mt-8 grid grid-cols-2 gap-4">
          {places.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-[#E6D8C5] bg-[#FFFDF8]">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="h-36 w-full object-cover" /> : <div className="h-36 w-full bg-[#E8DBC6]" />}
              <div className="p-3">
                <p className="font-medium text-[15px] text-[#2F241E] leading-tight">{p.name}</p>
                <p className="mt-1 text-xs text-[#7A6A5F]">{p.area}{p.city ? ` · ${p.city}` : ""}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[#E6D8C5] bg-[#FFFDF8] p-6 text-center">
          <p className="font-semibold text-lg text-[#2F241E]">Save this board in Sipp</p>
          <p className="mt-1 text-sm text-[#7A6A5F]">Discover, save and rank cafés with people who have taste.</p>
          <a href="/" className="mt-4 inline-block rounded-full bg-[#C49A5A] px-7 py-3 font-semibold text-[#F7F1E8]">Get Sipp</a>
        </div>
      </div>
    </main>
  );
}
