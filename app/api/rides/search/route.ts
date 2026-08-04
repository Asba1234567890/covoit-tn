import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { OsmMapProvider } from "@/lib/map/OsmMapProvider";
import { scoreMatch } from "@/lib/matching/matchingEngine";
import { getSessionUser } from "@/server/auth/session";
import { getBlockedIds } from "@/server/users/blockService";

const map = new OsmMapProvider();

// GET /api/rides/search?originCityId=...&destinationCityId=...&date=YYYY-MM-DD&time=HH:mm
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const originCityId = searchParams.get("originCityId");
  const destinationCityId = searchParams.get("destinationCityId");
  const date = searchParams.get("date");
  const time = searchParams.get("time") ?? "08:00";
  const maxWalkMeters = Number(searchParams.get("maxWalkMeters") ?? 800);

  if (!originCityId || !destinationCityId || !date) {
    return NextResponse.json({ error: "originCityId, destinationCityId and date are required" }, { status: 400 });
  }

  const desiredDeparture = new Date(`${date}T${time}:00`);
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  // Search works signed-out too, so only look up blocks when there's a
  // session — blocking a driver's rides from your own results is a
  // logged-in-only feature by nature (mutual: hides rides from drivers you
  // blocked, and from drivers who blocked you).
  const user = await getSessionUser(req);
  const blockedIds = user ? await getBlockedIds(user.id) : [];
  const blockedByIds = user
    ? (await prisma.blockedUser.findMany({ where: { blockedId: user.id }, select: { blockerId: true } })).map(
        (r: { blockerId: string }) => r.blockerId
      )
    : [];
  const excludedDriverIds = new Set([...blockedIds, ...blockedByIds]);

  // Broad candidate set: same-day rides touching either city, ranked afterward
  // by real route-overlap score rather than filtered to exact city match only
  // (spec §10 — do not match only exact origin/destination).
  const candidates = await prisma.ride.findMany({
    where: {
      status: "SCHEDULED",
      departureAt: { gte: dayStart, lte: dayEnd },
      seatsAvailable: { gt: 0 },
      driverId: excludedDriverIds.size > 0 ? { notIn: [...excludedDriverIds] } : undefined,
    },
    include: { driver: { include: { driverProfile: true } }, vehicle: true },
    take: 50,
  });

  const originCity = await prisma.city.findUniqueOrThrow({ where: { id: originCityId } });
  const destinationCity = await prisma.city.findUniqueOrThrow({ where: { id: destinationCityId } });

  const scored = await Promise.all(
    candidates.map(async (ride: (typeof candidates)[number]) => {
      const match = await scoreMatch(map, {
        driverRoute: {
          origin: { lat: ride.originLat, lng: ride.originLng },
          destination: { lat: ride.destinationLat, lng: ride.destinationLng },
          departureAt: ride.departureAt,
        },
        passengerRequest: {
          origin: { lat: originCity.lat, lng: originCity.lng },
          destination: { lat: destinationCity.lat, lng: destinationCity.lng },
          desiredDeparture,
          maxWalkMeters,
        },
      });
      return { ride, match };
    })
  );

  const results = scored
    .filter((r) => r.match.isViable)
    .sort((a, b) => b.match.score - a.match.score)
    .map(({ ride, match }) => ({
      id: ride.id,
      driver: {
        id: ride.driverId,
        firstName: ride.driver.firstName,
        rating: ride.driver.driverProfile?.rating ?? 0,
        completedRidesCount: ride.driver.driverProfile?.completedRidesCount ?? 0,
        verificationLevel: ride.driver.verificationLevel,
      },
      vehicle: { make: ride.vehicle.make, model: ride.vehicle.model, color: ride.vehicle.color },
      departureAt: ride.departureAt,
      pricePerSeat: ride.pricePerSeat,
      seatsAvailable: ride.seatsAvailable,
      matchScore: match.score,
      matchExplanation: match.explanation,
    }));

  return NextResponse.json({ results });
}
