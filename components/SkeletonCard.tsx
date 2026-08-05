// Loading placeholder shaped like a ride/result card, not a spinner — design
// spec §1 "Perceived speed": skeletons matched to the final layout.
export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-card bg-white p-4 shadow-card" aria-hidden>
      <div className="mb-2 h-3 w-3/5 rounded bg-neutral-200" />
      <div className="mb-2 h-3 w-4/5 rounded bg-neutral-200" />
      <div className="h-3 w-2/5 rounded bg-neutral-200" />
    </div>
  );
}
