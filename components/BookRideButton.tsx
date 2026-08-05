"use client";

import { useState } from "react";
import { buttonClasses } from "@/lib/ui";

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
      <button className={buttonClasses("primary", "w-full")} disabled>
        Fully booked
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {seatsAvailable > 1 && (
        <select
          className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
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
      <button className={buttonClasses("primary", "w-full")} disabled={submitting} onClick={book}>
        {submitting ? "Sending request…" : "Request to book"}
      </button>
      {result && <p className="rounded-control bg-error/8 px-3 py-2 text-sm text-error-dark">{result}</p>}
    </div>
  );
}
