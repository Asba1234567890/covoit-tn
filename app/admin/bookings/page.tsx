"use client";

import { useEffect, useState } from "react";
import StatusBadge, { type StatusTone } from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

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
const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  ACCEPTED: "success",
  COMPLETED: "success",
  CANCELLED_BY_PASSENGER: "neutral",
  CANCELLED_BY_DRIVER: "neutral",
  NO_SHOW: "error",
};

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
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Bookings</h1>
      <div className="mb-4 flex flex-wrap gap-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              status === s ? "bg-primary text-white" : "border border-neutral-200 text-ink-secondary"
            }`}
            onClick={() => setStatus(s)}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-ink">
                {b.ride.originLabel} → {b.ride.destinationLabel}
              </p>
              <StatusBadge label={b.status} tone={STATUS_TONE[b.status] ?? "neutral"} />
            </div>
            <p className="mt-0.5 text-xs text-ink-secondary">
              {b.passenger.firstName} ({b.passenger.phone}) · {b.seatsBooked} seat(s) · {new Date(b.ride.departureAt).toLocaleString()}
            </p>
            <p className="text-xs text-ink-secondary">payment: {b.payment ? `${b.payment.status} (${b.payment.amountGross} TND)` : "none"}</p>
          </div>
        ))}
        {bookings.length === 0 && !loading && <EmptyState message="No bookings found." />}
      </div>
    </div>
  );
}
