"use client";

import { useState } from "react";

export default function BookRideButton({ rideId, seatsAvailable }: { rideId: string; seatsAvailable: number }) {
  const [seats, setSeats] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function book() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/rides/${rideId}/book`, {
        method: "POST",
        body: JSON.stringify({ seats }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/signup";
          return;
        }
        throw new Error(data.error ?? "Could not book this ride");
      }
      window.location.href = "/my-bookings";
    } catch (e) {
      setResult((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (seatsAvailable === 0) {
    return (
      <button className="w-full rounded-lg bg-black py-3 text-white opacity-50" disabled>
        Fully booked
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {seatsAvailable > 1 && (
        <select
          className="rounded-lg border px-3 py-2"
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
        >
          {Array.from({ length: seatsAvailable }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} seat{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      )}
      <button
        className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-50"
        disabled={submitting}
        onClick={book}
      >
        {submitting ? "Booking…" : "Book a seat"}
      </button>
      {result && <p className="text-sm text-red-600">{result}</p>}
    </div>
  );
}
