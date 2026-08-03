import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/server/admin/adminAuth";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const bookings = await prisma.booking.findMany({
    where: status ? { status } : undefined,
    include: {
      ride: { select: { originLabel: true, destinationLabel: true, departureAt: true } },
      passenger: { select: { firstName: true, phone: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ bookings });
}
