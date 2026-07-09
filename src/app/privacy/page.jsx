// Static privacy policy — required for App Store / Play Store listing.
export const metadata = {
  title: "Privacy Policy — Sipp",
  description: "How Sipp collects, uses, and protects your information.",
};

const S = ({ title, children }) => (
  <section className="mt-10">
    <h2 className="font-semibold text-[17px] text-[#2F241E]">{title}</h2>
    <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#5C4F45]">{children}</div>
  </section>
);

export default function Privacy() {
  return (
    <main className="min-h-screen bg-[#F7F1E8]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <a href="/" className="font-serif text-3xl font-bold text-[#2F241E]">sipp</a>
        <h1 className="mt-8 font-semibold text-3xl text-[#2F241E]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#7A6A5F]">Effective 8 July 2026</p>

        <p className="mt-6 text-[15px] leading-relaxed text-[#5C4F45]">
          Sipp (“we”, “us”) is a café and dining discovery app available on the web at joinsipp.com
          and as a mobile app. This policy explains what information we collect, how we use it, and
          the choices you have. The short version: we collect what the product needs to work, we
          don’t sell your data, and you can ask us to delete your account at any time.
        </p>

        <S title="Information we collect">
          <p><strong>Account details.</strong> When you sign up we collect your email address, name, and username. You can optionally add a profile photo, bio, and home city.</p>
          <p><strong>Content you create.</strong> Reviews, ratings, photos, videos, boards, comments, saves, and the people you follow. Reviews, public boards, and your profile are visible to other users — that’s the point of Sipp.</p>
          <p><strong>Location.</strong> With your permission, we use your device’s location to show cafés near you and to power distance-based features. We don’t track your location in the background or store a history of your movements.</p>
          <p><strong>Usage and device data.</strong> Basic technical information such as app version and device type, used to keep the app working and to fix problems.</p>
        </S>

        <S title="How we use it">
          <p>To provide and improve Sipp: showing places near you, ranking and recommendations, your café passport, boards and social features, and responding to reports or support requests. We may send transactional emails (for example a password reset, or a notification about activity on your content).</p>
          <p>We do <strong>not</strong> sell your personal information, and we don’t show third-party advertising.</p>
        </S>

        <S title="Where your data lives">
          <p>Your data is stored with <strong>Supabase</strong> (our database and authentication provider). Place information and photos are sourced from Google Maps Platform and other public sources. The app is delivered via Vercel (web) and Expo (mobile). Each of these providers processes data on our behalf under their own security and privacy commitments.</p>
        </S>

        <S title="Sharing">
          <p>Content you post publicly (reviews, public boards, profile) is visible to other users. Private boards are visible only to you (and collaborators you invite). We share data with the service providers above solely to operate Sipp, and we may disclose information if required by law.</p>
        </S>

        <S title="Your choices and rights">
          <p>You can edit your profile, delete your reviews and boards, and make boards private in the app. You can revoke location permission at any time in your device settings.</p>
          <p><strong>Account deletion.</strong> Email us at <a className="text-[#C49A5A] underline" href="mailto:canada@surayyagroup.com">canada@surayyagroup.com</a> from your account email and we will delete your account and associated personal data within 30 days.</p>
          <p>Depending on where you live (for example Canada’s PIPEDA, the EU’s GDPR, or the UAE’s data protection law), you may have additional rights to access, correct, or export your data — email us and we’ll help.</p>
        </S>

        <S title="Children">
          <p>Sipp is not directed to children under 13, and we don’t knowingly collect data from them. If you believe a child has created an account, contact us and we’ll remove it.</p>
        </S>

        <S title="Changes">
          <p>If we make material changes to this policy we’ll update this page and change the date above. Continued use of Sipp after changes means you accept the updated policy.</p>
        </S>

        <S title="Contact">
          <p>Questions? Email <a className="text-[#C49A5A] underline" href="mailto:canada@surayyagroup.com">canada@surayyagroup.com</a>.</p>
        </S>

        <p className="mt-12 text-sm text-[#7A6A5F]">
          See also our <a className="text-[#C49A5A] underline" href="/terms">Terms of Service</a>.
        </p>
      </div>
    </main>
  );
}
