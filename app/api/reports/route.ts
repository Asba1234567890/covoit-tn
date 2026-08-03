import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

const VALID_TYPES = ["SAFETY", "HARASSMENT", "NO_SHOW", "FRAUD", "VEHICLE_CONDITION", "OTHER"];

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { reportedUserId, rideId, type, description } = body;

  if (!type || !VALID_TYPES.includes(type) || !description) {
    return NextResponse.json({ error: "A valid type and description are required" }, { status: 400 });
  }
  if (!reportedUserId && !rideId) {
    return NextResponse.json({ error: "Either reportedUserId or rideId is required" }, { status: 400 });
  }
  if (reportedUserId === user.id) {
    return NextResponse.json({ error: "You can't report yourself" }, { status: 400 });
  }

  // If reporting in the context of a ride, confirm the reporter was actually
  // involved (driver or a passenger with a booking) — prevents drive-by
  // reports against rides/users the reporter never interacted with.
  if (rideId) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { bookings: { where: { passengerId: user.id }, select: { id: true } } },
    });
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    const isParticipant = ride.driverId === user.id || ride.bookings.length > 0;
    if (!isParticipant) {
      return NextResponse.json({ error: "You can only report a ride you were part of" }, { status: 403 });
    }
  }

  const report = await prisma.report.create({
    data: {
      reportingUserId: user.id,
      reportedUserId: reportedUserId ?? null,
      rideId: rideId ?? null,
      type,
      description,
      status: "OPEN",
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}

export async function GET(req: NextRequest) {
  // A user can see only the reports they filed themselves.
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const reports = await prisma.report.findMany({
    where: { reportingUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ reports });
}
