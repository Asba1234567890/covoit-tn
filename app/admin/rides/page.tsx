"use client";

import { useEffect, useState } from "react";

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
  }, [status]);

  async function cancelRide(rideId: string) {
    const reason = prompt("Reason for cancelling this ride?") ?? "Cancelled by admin";
    await fetch("/api/admin/rides", { method: "POST", body: JSON.stringify({ rideId, action: "cancel", reason }) });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Rides</h1>
      <div className="mb-4 flex gap-1">
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
        {rides.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {r.originLabel} → {r.destinationLabel}
                </p>
                <p className="text-xs text-neutral-500">
                  {new Date(r.departureAt).toLocaleString()} · {r.driver.firstName} ({r.driver.phone}) · {r.vehicle.make} {r.vehicle.model}
                </p>
                <p className="text-xs text-neutral-500">
                  {r.seatsAvailable}/{r.seatsTotal} seats · {r.pricePerSeat} TND/seat · {r.bookings.length} booking(s) · status: {r.status}
                </p>
              </div>
              {r.status === "SCHEDULED" && (
                <button className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700" onClick={() => cancelRide(r.id)}>
                  Cancel ride
                </button>
              )}
            </div>
          </div>
        ))}
        {rides.length === 0 && !loading && <p className="text-sm text-neutral-500">No rides found.</p>}
      </div>
    </div>
  );
}
