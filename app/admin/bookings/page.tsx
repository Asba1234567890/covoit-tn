"use client";

import { useEffect, useState } from "react";

interface AdminBookingRow {
  id: string;
  status: string;
  seatsBooked: number;
  createdAt: string;
  ride: { originLabel: string; destinationLabel: string; departureAt: string };
  passenger: { firstName: string; phone: string };
  payment: { status: string; amountGross: string } | null;
}

const STATUS_FILTERS = ["", "PENDING", "ACCEPTED", "COMPLETED", "CANCELLED_BY_PASSENGER", "CANCELLED_BY_DRIVER", "NO_SHOW"];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/bookings${status ? `?status=${status}` : ""}`)
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Bookings</h1>
      <div className="mb-4 flex flex-wrap gap-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`rounded-lg border px-3 py-1 text-xs ${status === s ? "bg-black text-white" : ""}`}
            onClick={() => setStatus(s)}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-xl border bg-white p-4">
            <p className="font-medium">
              {b.ride.originLabel} → {b.ride.destinationLabel}
            </p>
            <p className="text-xs text-neutral-500">
              {b.passenger.firstName} ({b.passenger.phone}) · {b.seatsBooked} seat(s) · {new Date(b.ride.departureAt).toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">
              status: {b.status} · payment: {b.payment ? `${b.payment.status} (${b.payment.amountGross} TND)` : "none"}
            </p>
          </div>
        ))}
        {bookings.length === 0 && !loading && <p className="text-sm text-neutral-500">No bookings found.</p>}
      </div>
    </div>
  );
}
