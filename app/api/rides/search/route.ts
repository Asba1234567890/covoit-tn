import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { OsmMapProvider } from "@/lib/map/OsmMapProvider";
import { scoreMatch } from "@/lib/matching/matchingEngine";

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

  // Broad candidate set: same-day rides touching either city, ranked afterward
  // by real route-overlap score rather than filtered to exact city match only
  // (spec §10 — do not match only exact origin/destination).
  const candidates = await prisma.ride.findMany({
    where: {
      status: "SCHEDULED",
      departureAt: { gte: dayStart, lte: dayEnd },
      seatsAvailable: { gt: 0 },
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
        firstName: ride.driver.firstName,
        rating: ride.driver.driverProfile?.rating ?? 0,
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
