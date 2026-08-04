import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null });

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
