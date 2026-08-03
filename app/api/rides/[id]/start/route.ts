import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ride = await prisma.ride.findUnique({ where: { id: params.id } });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  if (ride.driverId !== user.id) {
    return NextResponse.json({ error: "Only the ride's driver can start it" }, { status: 403 });
  }
  if (ride.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Only a scheduled ride can be started" }, { status: 409 });
  }

  const updated = await prisma.ride.update({
    where: { id: params.id },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });

  return NextResponse.json({ ride: updated });
}
