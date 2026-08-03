import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest, canOperate } from "@/server/admin/adminAuth";
import { logAdminAction } from "@/server/admin/auditLog";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const rides = await prisma.ride.findMany({
    where: status ? { status } : undefined,
    include: {
      driver: { select: { firstName: true, phone: true } },
      vehicle: { select: { make: true, model: true } },
      bookings: { select: { id: true, status: true } },
    },
    orderBy: { departureAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ rides });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  if (!canOperate(admin.role)) return NextResponse.json({ error: "Insufficient role" }, { status: 403 });

  const body = await req.json();
  const { rideId, action, reason } = body;
  if (!rideId || action !== "cancel") return NextResponse.json({ error: "rideId and action=cancel are required" }, { status: 400 });

  const ride = await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { rideId, status: { in: ["PENDING", "ACCEPTED"] } },
      data: { status: "CANCELLED_BY_DRIVER", cancelledAt: new Date(), cancellationReason: reason ?? "Cancelled by admin" },
    });
    return tx.ride.update({ where: { id: rideId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  });

  await logAdminAction({ adminUserId: admin.adminId, action: "ride:cancel", metadata: { rideId, reason } });
  return NextResponse.json({ ride });
}
