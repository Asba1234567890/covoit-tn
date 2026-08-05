"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";
import ReportForm from "@/components/ReportForm";
import StatusBadge, { type StatusTone } from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { buttonClasses } from "@/lib/ui";

interface Booking {
  id: string;
  seatsBooked: number;
  status: string;
  hasReviewed: boolean;
  ride: {
    id: string;
    originLabel: string;
    destinationLabel: string;
    departureAt: string;
    pricePerSeat: string;
    status: string;
    driver: { id: string; firstName: string };
    vehicle: { make: string; model: string; color: string };
  };
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Awaiting driver approval",
  ACCEPTED: "Confirmed",
  DECLINED: "Declined by driver",
  COMPLETED: "Completed",
  CANCELLED_BY_DRIVER: "Cancelled by driver",
  CANCELLED_BY_PASSENGER: "Cancelled",
};

// Distinct, honest visual per async state — spec §1 "Booking feedback":
// pending shouldn't read as broken, and each state gets its own color.
const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  ACCEPTED: "success",
  DECLINED: "error",
  COMPLETED: "success",
  CANCELLED_BY_DRIVER: "neutral",
  CANCELLED_BY_PASSENGER: "neutral",
};

function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ bookingId, stars, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit review");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 rounded-control bg-neutral-50 p-3">
      <p className="mb-1 text-xs font-medium text-ink">Rate your driver</p>
      <div className="flex gap-1 text-lg">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => setStars(s)} className={s <= stars ? "text-accent" : "text-neutral-300"}>
            ★
          </button>
        ))}
      </div>
      <textarea
        className="mt-2 w-full rounded-control border border-neutral-200 px-2 py-1 text-sm"
        rows={2}
        placeholder="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="text-xs text-error-dark">{error}</p>}
      <button className={buttonClasses("primary", "mt-2 px-3 py-1.5 text-xs")} disabled={submitting} onClick={submit}>
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}

export default function MyBookingsPage() {
  const currentUser = useRequireAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  function load() {
    fetch("/api/bookings/mine")
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []));
  }

  useEffect(() => {
    if (!currentUser) return;
    load();
  }, [currentUser]);

  async function cancel(bookingId: string) {
    if (!confirm("Cancel this booking?")) return;
    setBusy(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST", body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not cancel booking");
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!currentUser) {
    return <p className="px-4 py-6 text-sm text-ink-secondary">Loading…</p>;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 font-display text-lg font-bold text-ink">My bookings</h1>

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/rides/${b.ride.id}`} className="font-semibold text-ink hover:underline">
                {b.ride.originLabel} → {b.ride.destinationLabel}
              </Link>
              <StatusBadge label={STATUS_LABEL[b.status] ?? b.status} tone={STATUS_TONE[b.status] ?? "neutral"} />
            </div>
            <p className="mt-1 text-sm text-ink-secondary">
              {new Date(b.ride.departureAt).toLocaleString()} · with {b.ride.driver.firstName}
            </p>
            <p className="text-sm text-ink-secondary">
              {b.seatsBooked} seat(s) · {b.ride.pricePerSeat} TND/seat
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {["PENDING", "ACCEPTED"].includes(b.status) && (
                <button className={buttonClasses("destructive", "px-2.5 py-1.5 text-xs")} disabled={busy === b.id} onClick={() => cancel(b.id)}>
                  Cancel booking
                </button>
              )}
              <Link href={`/messages?rideId=${b.ride.id}`} className={buttonClasses("secondary", "px-2.5 py-1.5 text-xs")}>
                Message driver
              </Link>
              {b.status === "COMPLETED" && !b.hasReviewed && reviewingId !== b.id && (
                <button className={buttonClasses("secondary", "px-2.5 py-1.5 text-xs")} onClick={() => setReviewingId(b.id)}>
                  Leave a review
                </button>
              )}
              {b.status === "COMPLETED" && b.hasReviewed && <StatusBadge label="Reviewed" tone="success" />}
            </div>

            {reviewingId === b.id && (
              <ReviewForm
                bookingId={b.id}
                onDone={() => {
                  setReviewingId(null);
                  load();
                }}
              />
            )}

            <div className="mt-2">
              <ReportForm reportedUserId={b.ride.driver.id} rideId={b.ride.id} />
            </div>
          </div>
        ))}
        {bookings.length === 0 && <EmptyState message="No bookings yet. Go find a ride!" />}
      </div>
    </main>
  );
}
