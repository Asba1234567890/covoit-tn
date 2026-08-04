import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { maybeRunRideReminderSweep } from "@/server/notifications/reminderService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null });

  // Opportunistic, throttled, fire-and-forget: piggybacks the ride reminder
  // check on an endpoint every authenticated page load already hits, since
  // Vercel Hobby's once-daily cron can't cover departures at arbitrary times.
  maybeRunRideReminderSweep();

  const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      phone: user.phone,
      bio: user.bio,
      profilePhotoUrl: user.profilePhotoUrl,
      languages: user.languages,
      verificationLevel: user.verificationLevel,
      memberSince: user.memberSince,
      isDriver: !!driverProfile,
      driverRating: driverProfile?.rating ?? null,
      driverCompletedRides: driverProfile?.completedRidesCount ?? null,
    },
    unreadNotifications,
  });
}
