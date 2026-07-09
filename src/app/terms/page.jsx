// Static terms of service — required for App Store / Play Store listing.
export const metadata = {
  title: "Terms of Service — Sipp",
  description: "The rules for using Sipp.",
};

const S = ({ title, children }) => (
  <section className="mt-10">
    <h2 className="font-semibold text-[17px] text-[#2F241E]">{title}</h2>
    <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#5C4F45]">{children}</div>
  </section>
);

export default function Terms() {
  return (
    <main className="min-h-screen bg-[#F7F1E8]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <a href="/" className="font-serif text-3xl font-bold text-[#2F241E]">sipp</a>
        <h1 className="mt-8 font-semibold text-3xl text-[#2F241E]">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#7A6A5F]">Effective 8 July 2026</p>

        <p className="mt-6 text-[15px] leading-relaxed text-[#5C4F45]">
          These terms are an agreement between you and Sipp (“we”, “us”) covering your use of the
          Sipp app and website (joinsipp.com). By creating an account or using Sipp, you agree to them.
        </p>

        <S title="Your account">
          <p>You must be at least 13 years old to use Sipp. Keep your login credentials safe — you’re responsible for activity on your account. One account per person; don’t impersonate others.</p>
        </S>

        <S title="Your content">
          <p>You own the reviews, photos, videos, and boards you post. By posting, you grant us a worldwide, non-exclusive, royalty-free licence to host, display, and distribute that content within Sipp (for example, showing your review to other users, or using your photo as a board cover). This licence ends when you delete the content or your account, except where content has been shared by others (for example a copied board) or as needed for backups.</p>
          <p>Only post content you have the right to share. Reviews should reflect your genuine experience — no paid or fake reviews.</p>
        </S>

        <S title="Acceptable use">
          <p>Don’t use Sipp to post anything unlawful, hateful, harassing, or sexually explicit; don’t spam, scrape, or harvest data; don’t attempt to break, overload, or reverse-engineer the service; don’t use Sipp to advertise without our written permission. We may remove content or suspend accounts that violate these rules.</p>
        </S>

        <S title="Place information">
          <p>Café and restaurant details (hours, locations, photos, ratings) come from third-party sources and our community, and can be wrong or out of date. Always double-check before you travel. Sipp scores and rankings are opinions, not guarantees of quality or safety.</p>
        </S>

        <S title="Our service">
          <p>Sipp is provided “as is”, without warranties of any kind. We work hard to keep it available and accurate, but we don’t promise uninterrupted or error-free operation. To the fullest extent permitted by law, we are not liable for indirect or consequential damages arising from your use of Sipp, and our total liability is limited to the amount you paid us in the past 12 months (currently: nothing — Sipp is free).</p>
        </S>

        <S title="Termination">
          <p>You can stop using Sipp and request account deletion at any time (email <a className="text-[#C49A5A] underline" href="mailto:canada@surayyagroup.com">canada@surayyagroup.com</a>). We may suspend or terminate accounts that break these terms.</p>
        </S>

        <S title="Changes and governing law">
          <p>We may update these terms; material changes will be reflected on this page with a new effective date. These terms are governed by the laws of Ontario, Canada.</p>
        </S>

        <S title="Contact">
          <p>Questions? Email <a className="text-[#C49A5A] underline" href="mailto:canada@surayyagroup.com">canada@surayyagroup.com</a>.</p>
        </S>

        <p className="mt-12 text-sm text-[#7A6A5F]">
          See also our <a className="text-[#C49A5A] underline" href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}
