// Dashed-border empty state, matching the shape used across search results,
// bookings, messages, notifications, etc. (design spec §3.4).
export default function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-neutral-300 p-6 text-center text-sm text-ink-secondary">
      <p>{message}</p>
      {action && <div className="mt-2 font-semibold text-primary">{action}</div>}
    </div>
  );
}
