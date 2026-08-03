import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/server/admin/adminAuth";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const [
    userCount,
    driverCount,
    rideCount,
    completedRideCount,
    bookingCount,
    completedBookingCount,
    cancelledBookingCount,
    openReportCount,
    pendingReviewCount,
    payments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.driverProfile.count(),
    prisma.ride.count(),
    prisma.ride.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { status: { in: ["CANCELLED_BY_PASSENGER", "CANCELLED_BY_DRIVER"] } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.review.count({ where: { moderationStatus: "PENDING" } }),
    prisma.payment.aggregate({ _sum: { amountGross: true, platformFee: true } }),
  ]);

  const cancellationRate = bookingCount > 0 ? cancelledBookingCount / bookingCount : 0;

  return NextResponse.json({
    users: userCount,
    drivers: driverCount,
    rides: rideCount,
    completedRides: completedRideCount,
    bookings: bookingCount,
    completedBookings: completedBookingCount,
    cancellationRate,
    openReports: openReportCount,
    pendingReviews: pendingReviewCount,
    gmv: payments._sum.amountGross ?? 0,
    platformRevenue: payments._sum.platformFee ?? 0,
  });
}
