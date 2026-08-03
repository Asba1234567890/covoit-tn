import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { notify } from "@/server/notifications/notificationService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ride = await prisma.ride.findUnique({ where: { id: params.id } });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  if (ride.driverId !== user.id) {
    return NextResponse.json({ error: "Only the ride's driver can complete it" }, { status: 403 });
  }
  if (ride.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Only an in-progress ride can be completed" }, { status: 409 });
  }

  const { updated, completedBookings } = await prisma.$transaction(async (tx) => {
    const completedBookings = await tx.booking.findMany({
      where: { rideId: params.id, status: "ACCEPTED" },
      select: { id: true, passengerId: true },
    });
    // Only ACCEPTED bookings become COMPLETED — reviews are only ever
    // eligible against a COMPLETED booking, which is what makes them
    // legitimate-participant-only (spec's no-fake-reviews rule).
    await tx.booking.updateMany({
      where: { rideId: params.id, status: "ACCEPTED" },
      data: { status: "COMPLETED" },
    });
    const updated = await tx.ride.update({
      where: { id: params.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return { updated, completedBookings };
  });

  for (const b of completedBookings) {
    await notify(b.passengerId, "TRIP_COMPLETED", { rideId: params.id, bookingId: b.id });
    await notify(b.passengerId, "REVIEW_AVAILABLE", { rideId: params.id, bookingId: b.id, subjectId: ride.driverId });
    await notify(ride.driverId, "REVIEW_AVAILABLE", { rideId: params.id, bookingId: b.id, subjectId: b.passengerId });
  }
  if (completedBookings.length > 0) {
    await notify(ride.driverId, "TRIP_COMPLETED", { rideId: params.id });
  }

  return NextResponse.json({ ride: updated });
}

