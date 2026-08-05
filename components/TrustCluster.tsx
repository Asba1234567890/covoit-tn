import VerificationBadge from "./VerificationBadge";

interface TrustClusterProps {
  verificationLevel: number;
  rating: number;
  completedRidesCount: number;
  size?: "sm" | "md";
}

// Verification + rating + completed rides, rendered identically everywhere
// a driver appears (ride card, ride details, driver profile, chat header —
// design spec §2 "one trust pattern, everywhere" / §14 "build once, reuse").
export default function TrustCluster({ verificationLevel, rating, completedRidesCount, size = "md" }: TrustClusterProps) {
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${textSize}`}>
      <VerificationBadge verificationLevel={verificationLevel} />
      <span className="font-semibold text-accent-dark">★ {rating > 0 ? rating.toFixed(1) : "New"}</span>
      <span className="text-ink-secondary">
        {completedRidesCount} ride{completedRidesCount === 1 ? "" : "s"} completed
      </span>
    </div>
  );
}
