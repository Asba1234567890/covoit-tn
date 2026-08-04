"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";
import ReportForm from "@/components/ReportForm";

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
    <div className="mt-2 rounded-lg bg-neutral-50 p-3">
      <p className="mb-1 text-xs font-medium">Rate your driver</p>
      <div className="flex gap-1 text-lg">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => setStars(s)} className={s <= stars ? "text-amber-500" : "text-neutral-300"}>
            ★
          </button>
        ))}
      </div>
      <textarea
        className="mt-2 w-full rounded-lg border px-2 py-1 text-sm"
        rows={2}
        placeholder="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        className="mt-2 rounded-lg bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50"
        disabled={submitting}
        onClick={submit}
      >
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
    return <p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">My bookings</h1>

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <Link href={`/rides/${b.ride.id}`} className="font-medium hover:underline">
                {b.ride.originLabel} → {b.ride.destinationLabel}
              </Link>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{STATUS_LABEL[b.status] ?? b.status}</span>
            </div>
            <p className="text-sm text-neutral-600">
              {new Date(b.ride.departureAt).toLocaleString()} · with {b.ride.driver.firstName}
            </p>
            <p className="text-sm text-neutral-600">
              {b.seatsBooked} seat(s) · {b.ride.pricePerSeat} TND/seat
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {["PENDING", "ACCEPTED"].includes(b.status) && (
                <button
                  className="rounded-lg border border-red-300 px-2 py-1 text-red-700 disabled:opacity-50"
                  disabled={busy === b.id}
                  onClick={() => cancel(b.id)}
                >
                  Cancel booking
                </button>
              )}
              <Link href={`/messages?rideId=${b.ride.id}`} className="rounded-lg border px-2 py-1">
                Message driver
              </Link>
              {b.status === "COMPLETED" && !b.hasReviewed && reviewingId !== b.id && (
                <button className="rounded-lg border px-2 py-1" onClick={() => setReviewingId(b.id)}>
                  Leave a review
                </button>
              )}
              {b.status === "COMPLETED" && b.hasReviewed && (
                <span className="rounded-lg bg-green-50 px-2 py-1 text-green-700">Reviewed</span>
              )}
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
        {bookings.length === 0 && <p className="text-sm text-neutral-500">No bookings yet. Go find a ride!</p>}
      </div>
    </main>
  );
}
