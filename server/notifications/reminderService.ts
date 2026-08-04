import { prisma } from "@/server/db/prisma";
import { notify } from "@/server/notifications/notificationService";

const REMINDER_WINDOW_MS = 60 * 60 * 1000; // remind roughly 1 hour before departure

// Shared by the daily cron backstop (app/api/cron/ride-reminders) and the
// app-triggered check (app/api/auth/me) — Vercel Hobby only allows once-daily
// cron schedules, which can't catch departures scattered across the day, so
// the app-triggered path is the primary mechanism and the cron is a backstop
// for rides no one opens the app for before departure.
export async function runRideReminderSweep(): Promise<number> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

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

  return ridesReminded;
}

// Serverless instances are ephemeral, so this only throttles within a single
// warm instance — correctness still comes from the reminderSentAt DB guard
// above, this just avoids re-running the query on every single request.
const THROTTLE_MS = 5 * 60 * 1000;
let lastSweepAt = 0;

export function maybeRunRideReminderSweep(): void {
  const now = Date.now();
  if (now - lastSweepAt < THROTTLE_MS) return;
  lastSweepAt = now;

  runRideReminderSweep().catch((e) => {
    console.error("[reminderService] app-triggered sweep failed", { error: (e as Error).message });
  });
}
