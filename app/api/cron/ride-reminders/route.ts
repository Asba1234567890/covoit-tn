import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { notify } from "@/server/notifications/notificationService";

export const dynamic = "force-dynamic";

const REMINDER_WINDOW_MS = 60 * 60 * 1000; // remind roughly 1 hour before departure

export async function GET(req: NextRequest) {
  // Vercel Cron requests carry this header automatically. Also accept a
  // manually-configured CRON_SECRET bearer token as a fallback so this
  // can't be triggered by an outsider hitting the URL directly.
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  const authHeader = req.headers.get("authorization");
  const hasValidSecret = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  // reminderSentAt is what makes this idempotent — safe to run this job
  // more often than the window without double-notifying anyone.
  const rides = await prisma.ride.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      departureAt: { gte: now, lte: windowEnd },
    },
    include: {
      bookings: { where: { status: "ACCEPTED" }, select: { passengerId: true } },
    },
  });

  let ridesReminded = 0;
  for (const ride of rides) {
    await notify(ride.driverId, "RIDE_REMINDER", { rideId: ride.id, departureAt: ride.departureAt });
    for (const booking of ride.bookings) {
      await notify(booking.passengerId, "RIDE_REMINDER", { rideId: ride.id, departureAt: ride.departureAt });
    }
    await prisma.ride.update({ where: { id: ride.id }, data: { reminderSentAt: now } });
    ridesReminded++;
  }

  return NextResponse.json({ ridesReminded });
}
