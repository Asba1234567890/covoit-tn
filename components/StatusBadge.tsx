// Booking (and similar async-action) status pill — one consistent visual
// per state so "pending" reads as a real state, not a stuck/broken screen
// (design spec §1 "Booking feedback", §3.4 "Badges & trust cluster").
export type StatusTone = "pending" | "success" | "error" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  pending: "bg-warning/15 text-warning-dark",
  success: "bg-success/15 text-success-dark",
  error: "bg-error/12 text-error-dark",
  neutral: "bg-neutral-100 text-ink-secondary",
};

export default function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}
