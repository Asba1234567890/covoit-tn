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

const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: "Requested",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  COMPLETED: "Completed",
  CANCELLED_BY_DRIVER: "Cancelled by driver",
  CANCELLED_BY_PASSENGER: "Cancelled by passenger",
};

const BOOKING_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  ACCEPTED: "success",
  DECLINED: "error",
  COMPLETED: "success",
  CANCELLED_BY_DRIVER: "neutral",
  CANCELLED_BY_PASSENGER: "neutral",
};

const RIDE_STATUS_TONE: Record<string, StatusTone> = {
  SCHEDULED: "neutral",
  IN_PROGRESS: "pending",
  COMPLETED: "success",
  CANCELLED: "error",
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
    return <p className="px-4 py-6 text-sm text-ink-secondary">Loading…</p>;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 font-display text-lg font-bold text-ink">My rides</h1>

      <div className="flex flex-col gap-4">
        {rides.map((ride) => (
          <div key={ride.id} className="rounded-card bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-ink">
                {ride.originLabel} → {ride.destinationLabel}
              </p>
              <StatusBadge label={ride.status} tone={RIDE_STATUS_TONE[ride.status] ?? "neutral"} />
            </div>
            <p className="text-sm text-ink-secondary">
              {new Date(ride.departureAt).toLocaleString()} · {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model}
            </p>
            <p className="text-sm text-ink-secondary">
              {ride.seatsAvailable}/{ride.seatsTotal} seats free · {ride.pricePerSeat} TND/seat
            </p>

            {ride.status === "SCHEDULED" && (
              <div className="mt-2 flex gap-2">
                <button className={buttonClasses("secondary", "px-2.5 py-1.5 text-xs")} disabled={busy === ride.id} onClick={() => rideAction(ride.id, "start")}>
                  Start ride
                </button>
                <button className={buttonClasses("destructive", "px-2.5 py-1.5 text-xs")} disabled={busy === ride.id} onClick={() => rideAction(ride.id, "cancel")}>
                  Cancel ride
                </button>
              </div>
            )}
            {ride.status === "IN_PROGRESS" && (
              <div className="mt-2 flex gap-2">
                <button className={buttonClasses("primary", "px-2.5 py-1.5 text-xs")} disabled={busy === ride.id} onClick={() => rideAction(ride.id, "complete")}>
                  Mark completed
                </button>
              </div>
            )}

            {ride.bookings.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3">
                {ride.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="text-ink">
                        {b.passenger.firstName} · {b.seatsBooked} seat(s)
                      </p>
                      <div className="mt-0.5">
                        <StatusBadge label={BOOKING_STATUS_LABEL[b.status] ?? b.status} tone={BOOKING_STATUS_TONE[b.status] ?? "neutral"} />
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {b.status === "PENDING" && (
                        <>
                          <button
                            className={buttonClasses("primary", "px-2.5 py-1.5 text-xs")}
                            disabled={busy === b.id}
                            onClick={() => respond(b.id, "ACCEPTED")}
                          >
                            Accept
                          </button>
                          <button
                            className={buttonClasses("secondary", "px-2.5 py-1.5 text-xs")}
                            disabled={busy === b.id}
                            onClick={() => respond(b.id, "DECLINED")}
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {["PENDING", "ACCEPTED", "COMPLETED"].includes(b.status) && (
                        <Link href={`/messages?rideId=${ride.id}&passengerId=${b.passenger.id}`} className={buttonClasses("secondary", "px-2.5 py-1.5 text-xs")}>
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
        {rides.length === 0 && <EmptyState message="You haven't published any rides yet." />}
      </div>
    </main>
  );
}
