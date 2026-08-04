export const metadata = { title: "Privacy Policy — Covoit TN" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-neutral-700">
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Privacy Policy</h1>
      <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        Placeholder content, not legal advice. This page must be reviewed and finalized by Tunisian
        counsel before public launch — it does not yet reflect binding commitments under
        Loi organique n°2004-63 (data protection) or any other applicable law.
      </p>

      <h2 className="mt-4 font-medium text-neutral-900">What we collect</h2>
      <p>
        Phone number, name, and profile details you provide; ride, booking, and message data
        needed to operate the carpooling service; and technical data (device, IP) for security and
        fraud prevention.
      </p>

      <h2 className="mt-4 font-medium text-neutral-900">Why we collect it</h2>
      <p>
        To create your account, match drivers and passengers, process bookings, send WhatsApp OTP
        codes, and operate safety features such as reporting and admin moderation.
      </p>

      <h2 className="mt-4 font-medium text-neutral-900">Sharing</h2>
      <p>
        Your first name, rating, and vehicle details are shared with the other party on a booking.
        Your phone number is never shown publicly. We do not sell personal data.
      </p>

      <h2 className="mt-4 font-medium text-neutral-900">Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your data by contacting the
        platform administrator.
      </p>
    </main>
  );
}
