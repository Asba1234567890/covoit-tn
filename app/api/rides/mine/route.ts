import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

// Driver's own published rides, each with its bookings (including the
// requesting passenger's name) so the "My rides" page can render booking
// requests and ride lifecycle actions without extra round-trips.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rides = await prisma.ride.findMany({
    where: { driverId: user.id },
    include: {
      vehicle: { select: { make: true, model: true, color: true } },
      bookings: {
        where: { status: { not: "CANCELLED_BY_PASSENGER" } },
        include: {
          passenger: { select: { id: true, firstName: true, phone: true } },
          reviews: { where: { authorId: user.id }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { departureAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    rides: rides.map((ride: (typeof rides)[number]) => ({
      ...ride,
      bookings: ride.bookings.map((b: (typeof ride.bookings)[number]) => ({
        ...b,
        hasReviewed: b.reviews.length > 0,
        reviews: undefined,
      })),
    })),
  });
}
