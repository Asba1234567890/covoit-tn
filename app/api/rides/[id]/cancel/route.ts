import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { notify } from "@/server/notifications/notificationService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reason = body.reason ?? "Cancelled by driver";

  const ride = await prisma.ride.findUnique({ where: { id: params.id } });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  if (ride.driverId !== user.id) {
    return NextResponse.json({ error: "Only the ride's driver can cancel it" }, { status: 403 });
  }
  if (ride.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Only scheduled rides can be cancelled" }, { status: 409 });
  }

  const { updated, affectedBookings } = await prisma.$transaction(async (tx) => {
    const affectedBookings = await tx.booking.findMany({
      where: { rideId: params.id, status: { in: ["PENDING", "ACCEPTED"] } },
      select: { id: true, passengerId: true },
    });
    // No refunds in V0 (no online payments) — just release seats and mark
    // affected bookings cancelled so passengers see accurate status.
    await tx.booking.updateMany({
      where: { rideId: params.id, status: { in: ["PENDING", "ACCEPTED"] } },
      data: { status: "CANCELLED_BY_DRIVER", cancelledAt: new Date(), cancellationReason: reason },
    });
    const updated = await tx.ride.update({ where: { id: params.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    return { updated, affectedBookings };
  });

  for (const b of affectedBookings) {
    await notify(b.passengerId, "RIDE_CANCELLED", { rideId: params.id, bookingId: b.id, reason });
  }

  return NextResponse.json({ ride: updated });
}

