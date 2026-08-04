import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { isBlocked, getBlockedIds } from "@/server/users/blockService";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { rideId, passengerId } = body;
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

  // A ride can have several passengers, each with their own conversation
  // with the driver. A passenger always has exactly one conversation for a
  // given ride, so "some participant = me" is unambiguous for them — but
  // the driver is in every one of that ride's conversations, so the driver
  // must say which passenger they mean.
  const otherUserId = isDriver ? passengerId : ride.driverId;
  if (isDriver && !otherUserId) {
    return NextResponse.json({ error: "passengerId is required when the driver starts a conversation" }, { status: 400 });
  }
  if (isDriver) {
    const hasBooking = await prisma.booking.findFirst({
      where: { rideId, passengerId: otherUserId, status: { in: ["PENDING", "ACCEPTED", "COMPLETED"] } },
    });
    if (!hasBooking) {
      return NextResponse.json({ error: "That passenger has no booking on this ride" }, { status: 403 });
    }
  }

  if (await isBlocked(user.id, otherUserId)) {
    return NextResponse.json({ error: "You can't message this user" }, { status: 403 });
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      rideId,
      participants: { some: { userId: user.id } },
      AND: { participants: { some: { userId: otherUserId } } },
    },
    include: { participants: true },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        rideId,
        participants: { create: [{ userId: user.id }, { userId: otherUserId }] },
      },
      include: { participants: true },
    });
  }

  return NextResponse.json({ conversation });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Mutual: hide threads with anyone the user blocked, or who blocked the
  // user, matching the same block relationship already enforced on sending
  // new messages and on search results.
  const blockedIds = await getBlockedIds(user.id);
  const blockedByIds = (
    await prisma.blockedUser.findMany({ where: { blockedId: user.id }, select: { blockerId: true } })
  ).map((r: { blockerId: string }) => r.blockerId);
  const excludedUserIds = [...new Set([...blockedIds, ...blockedByIds])];

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: user.id } },
      ...(excludedUserIds.length > 0 && {
        NOT: { participants: { some: { userId: { in: excludedUserIds } } } },
      }),
    },
    include: {
      ride: { select: { originLabel: true, destinationLabel: true, departureAt: true } },
      participants: { include: { user: { select: { firstName: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ conversations });
}
