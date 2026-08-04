"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";
import ReportForm from "@/components/ReportForm";

interface Booking {
  id: string;
  seatsBooked: number;
  status: string;
  passenger: { id: string; firstName: string; phone: string };
}

interface Ride {
  id: string;
  originLabel: string;
  destinationLabel: string;
  departureAt: string;
  status: string;
  seatsAvailable: number;
  seatsTotal: number;
  pricePerSeat: string;
  vehicle: { make: string; model: string; color: string };
  bookings: Booking[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Requested",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  COMPLETED: "Completed",
  CANCELLED_BY_DRIVER: "Cancelled by driver",
  CANCELLED_BY_PASSENGER: "Cancelled by passenger",
};

export default function MyRidesPage() {
  const currentUser = useRequireAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/rides/mine")
      .then((r) => r.json())
      .then((d) => setRides(d.rides ?? []));
  }

  useEffect(() => {
    if (!currentUser) return;
    load();
  }, [currentUser]);

  async function respond(bookingId: string, decision: "ACCEPTED" | "DECLINED") {
    setBusy(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/respond`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not respond to booking");
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function rideAction(rideId: string, action: "start" | "complete" | "cancel") {
    if (action === "cancel" && !confirm("Cancel this ride? All pending/accepted bookings will be cancelled.")) return;
    setBusy(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/${action}`, { method: "POST", body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
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
      <h1 className="mb-4 text-xl font-semibold">My rides</h1>

      <div className="flex flex-col gap-4">
        {rides.map((ride) => (
          <div key={ride.id} className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {ride.originLabel} → {ride.destinationLabel}
              </p>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{ride.status}</span>
            </div>
            <p className="text-sm text-neutral-600">
              {new Date(ride.departureAt).toLocaleString()} · {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model}
            </p>
            <p className="text-sm text-neutral-600">
              {ride.seatsAvailable}/{ride.seatsTotal} seats free · {ride.pricePerSeat} TND/seat
            </p>

            {ride.status === "SCHEDULED" && (
              <div className="mt-2 flex gap-2 text-xs">
                <button className="rounded-lg border px-2 py-1" disabled={busy === ride.id} onClick={() => rideAction(ride.id, "start")}>
                  Start ride
                </button>
                <button className="rounded-lg border border-red-300 px-2 py-1 text-red-700" disabled={busy === ride.id} onClick={() => rideAction(ride.id, "cancel")}>
                  Cancel ride
                </button>
              </div>
            )}
            {ride.status === "IN_PROGRESS" && (
              <div className="mt-2 flex gap-2 text-xs">
                <button className="rounded-lg border px-2 py-1" disabled={busy === ride.id} onClick={() => rideAction(ride.id, "complete")}>
                  Mark completed
                </button>
              </div>
            )}

            {ride.bookings.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                {ride.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p>
                        {b.passenger.firstName} · {b.seatsBooked} seat(s)
                      </p>
                      <p className="text-xs text-neutral-500">{STATUS_LABEL[b.status] ?? b.status}</p>
                    </div>
                    <div className="flex gap-1">
                      {b.status === "PENDING" && (
                        <>
                          <button
                            className="rounded-lg bg-black px-2 py-1 text-xs text-white disabled:opacity-50"
                            disabled={busy === b.id}
                            onClick={() => respond(b.id, "ACCEPTED")}
                          >
                            Accept
                          </button>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                            disabled={busy === b.id}
                            onClick={() => respond(b.id, "DECLINED")}
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {["PENDING", "ACCEPTED", "COMPLETED"].includes(b.status) && (
                        <Link
                          href={`/messages?rideId=${ride.id}&passengerId=${b.passenger.id}`}
                          className="rounded-lg border px-2 py-1 text-xs"
                        >
                          Message
                        </Link>
                      )}
                    </div>
                    <div className="mt-1">
                      <ReportForm reportedUserId={b.passenger.id} rideId={ride.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {rides.length === 0 && <p className="text-sm text-neutral-500">You haven't published any rides yet.</p>}
      </div>
    </main>
  );
}
