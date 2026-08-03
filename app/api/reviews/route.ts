import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { bookingId, stars, comment, categories } = body;

  if (!bookingId || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "bookingId and stars (1-5) are required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { ride: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Only a completed booking is reviewable — this is what makes the review
  // system resistant to fake/unrelated reviews (spec's review-integrity rules).
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "You can only review a completed trip" }, { status: 409 });
  }

  const isPassenger = booking.passengerId === user.id;
  const isDriver = booking.ride.driverId === user.id;
  if (!isPassenger && !isDriver) {
    return NextResponse.json({ error: "You were not a participant in this trip" }, { status: 403 });
  }

  const subjectId = isPassenger ? booking.ride.driverId : booking.passengerId;
  if (subjectId === user.id) {
    // Structurally shouldn't happen (driver can't book their own ride), but
    // guard explicitly against self-review anyway.
    return NextResponse.json({ error: "You can't review yourself" }, { status: 400 });
  }

  try {
    const review = await prisma.review.create({
      data: {
        bookingId,
        authorId: user.id,
        subjectId,
        stars,
        comment,
        categories,
      },
    });

    // Keep the driver's aggregate rating in sync when the review is about them.
    if (subjectId === booking.ride.driverId) {
      const agg = await prisma.review.aggregate({
        where: { subjectId, moderationStatus: { not: "REJECTED" } },
        _avg: { stars: true },
      });
      await prisma.driverProfile.update({
        where: { userId: subjectId },
        data: { rating: agg._avg.stars ?? 0 },
      });
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "You already reviewed this trip" }, { status: 409 });
    }
    throw e;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId is required" }, { status: 400 });

  const reviews = await prisma.review.findMany({
    where: { subjectId, moderationStatus: "APPROVED" },
    include: { author: { select: { firstName: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ reviews });
}
