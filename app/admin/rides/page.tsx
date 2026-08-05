"use client";

import { useEffect, useState } from "react";
import StatusBadge, { type StatusTone } from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { buttonClasses } from "@/lib/ui";

interface AdminRideRow {
  id: string;
  originLabel: string;
  destinationLabel: string;
  departureAt: string;
  status: string;
  seatsAvailable: number;
  seatsTotal: number;
  pricePerSeat: string;
  driver: { firstName: string; phone: string };
  vehicle: { make: string; model: string };
  bookings: { id: string; status: string }[];
}

const STATUS_FILTERS = ["", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const STATUS_TONE: Record<string, StatusTone> = {
  SCHEDULED: "neutral",
  IN_PROGRESS: "pending",
  COMPLETED: "success",
  CANCELLED: "error",
};

export default function AdminRidesPage() {
  const [rides, setRides] = useState<AdminRideRow[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rides${status ? `?status=${status}` : ""}`);
      const data = await res.json();
      setRides(data.rides ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function cancelRide(rideId: string) {
    const reason = prompt("Reason for cancelling this ride?") ?? "Cancelled by admin";
    await fetch("/api/admin/rides", { method: "POST", body: JSON.stringify({ rideId, action: "cancel", reason }) });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Rides</h1>
      <div className="mb-4 flex gap-1 overflow-x-auto">
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
        {rides.map((r) => (
          <div key={r.id} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">
                    {r.originLabel} → {r.destinationLabel}
                  </p>
                  <StatusBadge label={r.status} tone={STATUS_TONE[r.status] ?? "neutral"} />
                </div>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {new Date(r.departureAt).toLocaleString()} · {r.driver.firstName} ({r.driver.phone}) · {r.vehicle.make} {r.vehicle.model}
                </p>
                <p className="text-xs text-ink-secondary">
                  {r.seatsAvailable}/{r.seatsTotal} seats · {r.pricePerSeat} TND/seat · {r.bookings.length} booking(s)
                </p>
              </div>
              {r.status === "SCHEDULED" && (
                <button className={buttonClasses("destructive", "shrink-0 px-2 py-1 text-xs")} onClick={() => cancelRide(r.id)}>
                  Cancel ride
                </button>
              )}
            </div>
          </div>
        ))}
        {rides.length === 0 && !loading && <EmptyState message="No rides found." />}
      </div>
    </div>
  );
}
