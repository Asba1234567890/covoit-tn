import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    where: { passengerId: user.id },
    include: {
      ride: {
        include: {
          driver: { select: { id: true, firstName: true } },
          vehicle: { select: { make: true, model: true, color: true } },
        },
      },
      reviews: { where: { authorId: user.id }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    bookings: bookings.map((b: (typeof bookings)[number]) => ({
      id: b.id,
      seatsBooked: b.seatsBooked,
      status: b.status,
      createdAt: b.createdAt,
      hasReviewed: b.reviews.length > 0,
      ride: {
        id: b.ride.id,
        originLabel: b.ride.originLabel,
        destinationLabel: b.ride.destinationLabel,
        departureAt: b.ride.departureAt,
        pricePerSeat: b.ride.pricePerSeat,
        status: b.ride.status,
        driver: b.ride.driver,
        vehicle: b.ride.vehicle,
      },
    })),
  });
}
