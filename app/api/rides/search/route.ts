import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { OsmMapProvider } from "@/lib/map/OsmMapProvider";
import { scoreMatch } from "@/lib/matching/matchingEngine";
import { getSessionUser } from "@/server/auth/session";
import { getBlockedIds } from "@/server/users/blockService";

const map = new OsmMapProvider();

const SORTS = ["match", "price_asc", "price_desc", "rating_desc", "departure_asc"] as const;
type SortBy = (typeof SORTS)[number];

// GET /api/rides/search?originCityId=...&destinationCityId=...&date=YYYY-MM-DD&time=HH:mm
//   &timeFrom=HH:mm&timeTo=HH:mm&minSeats=1&maxPrice=20&minRating=4&sortBy=match
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const originCityId = searchParams.get("originCityId");
  const destinationCityId = searchParams.get("destinationCityId");
  const date = searchParams.get("date");
  const time = searchParams.get("time") ?? "08:00";
  const maxWalkMeters = Number(searchParams.get("maxWalkMeters") ?? 800);

  const minSeats = Math.max(1, Number(searchParams.get("minSeats") ?? 1));
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null;
  const minRating = searchParams.get("minRating") ? Number(searchParams.get("minRating")) : null;
  const timeFrom = searchParams.get("timeFrom");
  const timeTo = searchParams.get("timeTo");
  const sortByParam = searchParams.get("sortBy") ?? "match";
  const sortBy: SortBy = SORTS.includes(sortByParam as SortBy) ? (sortByParam as SortBy) : "match";

  if (!originCityId || !destinationCityId || !date) {
    return NextResponse.json({ error: "originCityId, destinationCityId and date are required" }, { status: 400 });
  }

  const desiredDeparture = new Date(`${date}T${time}:00`);
  const dayStart = new Date(`${date}T${timeFrom || "00:00"}:00`);
  const dayEnd = new Date(`${date}T${timeTo || "23:59"}:59`);

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

  // Broad candidate set: same-day (or narrower, if timeFrom/timeTo given)
  // rides touching either city, ranked afterward by real route-overlap
  // score rather than filtered to exact city match only (spec §10).
  const candidates = await prisma.ride.findMany({
    where: {
      status: "SCHEDULED",
      departureAt: { gte: dayStart, lte: dayEnd },
      seatsAvailable: { gte: minSeats },
      pricePerSeat: maxPrice != null ? { lte: maxPrice } : undefined,
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

  const sorters: Record<SortBy, (a: (typeof scored)[number], b: (typeof scored)[number]) => number> = {
    match: (a, b) => b.match.score - a.match.score,
    price_asc: (a, b) => Number(a.ride.pricePerSeat) - Number(b.ride.pricePerSeat),
    price_desc: (a, b) => Number(b.ride.pricePerSeat) - Number(a.ride.pricePerSeat),
    rating_desc: (a, b) => (b.ride.driver.driverProfile?.rating ?? 0) - (a.ride.driver.driverProfile?.rating ?? 0),
    departure_asc: (a, b) => a.ride.departureAt.getTime() - b.ride.departureAt.getTime(),
  };

  const results = scored
    .filter((r) => r.match.isViable)
    .filter((r) => minRating == null || (r.ride.driver.driverProfile?.rating ?? 0) >= minRating)
    .sort(sorters[sortBy])
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
