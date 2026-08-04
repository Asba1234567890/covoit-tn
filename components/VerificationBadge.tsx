// verificationLevel: 1 = phone-verified only, 2 = identity-verified,
// 3 = admin-approved driver (the only level that can publish rides —
// enforced server-side in app/api/rides/create/route.ts). Only level 3
// gets a visible badge; 1-2 are baseline expectations, not something to show.
export default function VerificationBadge({ verificationLevel }: { verificationLevel: number }) {
  if (verificationLevel < 3) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
        <path
          fillRule="evenodd"
          d="M10 1.5l2.5 1.5 3 .3.9 2.9L18.5 8 17 10.5l1.5 2.5-2.1 2.3-.9 2.9-3 .3L10 20l-2.5-1.5-3-.3-.9-2.9L1.5 13 3 10.5 1.5 8l2.1-2.3.9-2.9 3-.3L10 1.5zm3.7 6.3a1 1 0 00-1.4-1.4L9 9.6 7.7 8.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Verified driver
    </span>
  );
}
