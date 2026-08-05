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
    // DriverProfile.completedRidesCount was otherwise never incremented
    // anywhere in the app — it stayed 0 forever despite being shown on the
    // ride details page and profile. Only count rides that actually carried
    // a passenger, matching the TRIP_COMPLETED notification condition below.
    if (completedBookings.length > 0) {
      await tx.driverProfile.update({
        where: { userId: ride.driverId },
        data: { completedRidesCount: { increment: 1 } },
      });
    }
    return { updated, completedBookings };
  });

  for (const b of completedBookings) {
    await notify(b.passengerId, "TRIP_COMPLETED", { rideId: params.id, bookingId: b.id });
    // role distinguishes which side of the review this is for — the
    // passenger reviews the driver via /my-bookings, but the driver reviews
    // the passenger via /my-rides, a different page with a different list.
    await notify(b.passengerId, "REVIEW_AVAILABLE", { rideId: params.id, bookingId: b.id, subjectId: ride.driverId, role: "passenger" });
    await notify(ride.driverId, "REVIEW_AVAILABLE", { rideId: params.id, bookingId: b.id, subjectId: b.passengerId, role: "driver" });
  }
  if (completedBookings.length > 0) {
    await notify(ride.driverId, "TRIP_COMPLETED", { rideId: params.id });
  }

  return NextResponse.json({ ride: updated });
}

