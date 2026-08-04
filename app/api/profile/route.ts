import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { isHttpUrl } from "@/lib/validateUrl";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
  const completedBookings = await prisma.booking.count({
    where: { passengerId: user.id, status: "COMPLETED" },
  });

  return NextResponse.json({
    profile: {
      id: user.id,
      firstName: user.firstName,
      phone: user.phone,
      bio: user.bio,
      profilePhotoUrl: user.profilePhotoUrl,
      languages: user.languages,
      memberSince: user.memberSince,
      verificationLevel: user.verificationLevel,
      isDriver: !!driverProfile,
      driverRating: driverProfile?.rating ?? null,
      driverCompletedRides: driverProfile?.completedRidesCount ?? null,
      passengerCompletedRides: completedBookings,
    },
  });
}

const MAX_BIO_LENGTH = 500;

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { firstName, bio, profilePhotoUrl, languages } = body;

  const data: Record<string, unknown> = {};

  if (firstName !== undefined) {
    if (typeof firstName !== "string" || !firstName.trim()) {
      return NextResponse.json({ error: "First name can't be empty" }, { status: 400 });
    }
    data.firstName = firstName.trim().slice(0, 50);
  }

  if (bio !== undefined) {
    if (typeof bio !== "string" || bio.length > MAX_BIO_LENGTH) {
      return NextResponse.json({ error: `Bio must be at most ${MAX_BIO_LENGTH} characters` }, { status: 400 });
    }
    data.bio = bio;
  }

  if (profilePhotoUrl !== undefined) {
    if (profilePhotoUrl !== "" && typeof profilePhotoUrl === "string") {
      if (!isHttpUrl(profilePhotoUrl)) {
        return NextResponse.json({ error: "Profile photo must be a valid http(s) URL" }, { status: 400 });
      }
    }
    data.profilePhotoUrl = profilePhotoUrl || null;
  }

  if (languages !== undefined) {
    if (!Array.isArray(languages) || !languages.every((l) => typeof l === "string")) {
      return NextResponse.json({ error: "languages must be an array of strings" }, { status: 400 });
    }
    data.languages = languages.slice(0, 10);
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({
    profile: {
      id: updated.id,
      firstName: updated.firstName,
      bio: updated.bio,
      profilePhotoUrl: updated.profilePhotoUrl,
      languages: updated.languages,
    },
  });
}
