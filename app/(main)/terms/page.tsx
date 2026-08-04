export const metadata = { title: "Terms of Service — Covoit TN" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-neutral-700">
      <h1 className="mb-1 text-xl font-semibold text-neutral-900">Terms of Service</h1>
      <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        Placeholder content, not legal advice. This page must be reviewed and finalized by Tunisian
        counsel before public launch.
      </p>

      <h2 className="mt-4 font-medium text-neutral-900">What Covoit TN is</h2>
      <p>
        Covoit TN connects drivers with spare seats to passengers travelling the same route within
        Tunisia. Covoit TN is not a transportation carrier, taxi service, or employer of drivers.
        Drivers and passengers arrange their own trip; the platform facilitates the connection.
      </p>

      <h2 className="mt-4 font-medium text-neutral-900">No payments on the platform (V0)</h2>
      <p>
        In this version, all ride costs are settled directly between driver and passenger, in cash,
        outside the app. Covoit TN does not process payments and holds no funds on behalf of users.
      </p>

      <h2 className="mt-4 font-medium text-neutral-900">Conduct and safety</h2>
      <p>
        Users must provide accurate information, treat other users respectfully, and report unsafe
        or fraudulent behavior. Covoit TN may suspend or ban accounts that violate these terms.
      </p>

      <h2 className="mt-4 font-medium text-neutral-900">Liability</h2>
      <p>
        Covoit TN is provided "as is" during this early phase. To the extent permitted by law,
        Covoit TN is not liable for the conduct of drivers or passengers, or for the outcome of a
        trip arranged through the platform.
      </p>
    </main>
  );
}
