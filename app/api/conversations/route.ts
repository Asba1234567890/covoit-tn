import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { rideId } = body;
  if (!rideId) return NextResponse.json({ error: "rideId is required" }, { status: 400 });

  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: { bookings: { where: { passengerId: user.id, status: { in: ["PENDING", "ACCEPTED", "COMPLETED"] } } } },
  });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });

  const isDriver = ride.driverId === user.id;
  const isBookedPassenger = ride.bookings.length > 0;
  if (!isDriver && !isBookedPassenger) {
    return NextResponse.json({ error: "You need a booking on this ride to message the driver" }, { status: 403 });
  }

  // One conversation per (ride, passenger) pair — reuse if it already exists.
  let conversation = await prisma.conversation.findFirst({
    where: {
      rideId,
      participants: { some: { userId: user.id } },
    },
    include: { participants: true },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        rideId,
        participants: {
          create: [{ userId: user.id }, ...(isDriver ? [] : [{ userId: ride.driverId }])],
        },
      },
      include: { participants: true },
    });
  }

  return NextResponse.json({ conversation });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: {
      ride: { select: { originLabel: true, destinationLabel: true, departureAt: true } },
      participants: { include: { user: { select: { firstName: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ conversations });
}
