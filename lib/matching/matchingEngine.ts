import { MapProvider, LatLng } from "@/lib/map/MapProvider";

export interface MatchInput {
  driverRoute: {
    origin: LatLng;
    destination: LatLng;
    departureAt: Date;
  };
  passengerRequest: {
    origin: LatLng;
    destination: LatLng;
    desiredDeparture: Date;
    maxWalkMeters: number;
  };
}

export interface MatchResult {
  score: number; // 0-100
  pickupWalkMeters: number;
  dropoffWalkMeters: number;
  detourSeconds: number;
  timeDeltaMinutes: number;
  explanation: string[];
  isViable: boolean;
}

const WEIGHTS = {
  routeOverlap: 0.30,
  pickupProximity: 0.20,
  dropoffProximity: 0.20,
  timeCompatibility: 0.15,
  detourPenalty: 0.15,
};

// Scores how well a passenger's desired trip fits inside a driver's existing
// route, per spec §10 — the platform must not require exact origin/destination
// matches. This is a pragmatic MVP heuristic (straight-line + a real route
// query for detour), not ML-based; can be replaced later without changing callers.
export async function scoreMatch(
  map: MapProvider,
  input: MatchInput
): Promise<MatchResult> {
  const { driverRoute, passengerRequest } = input;

  const directDriverRoute = await map.route(driverRoute.origin, driverRoute.destination);

  const pickupWalkMeters = map.distanceMeters(driverRoute.origin, passengerRequest.origin);
  const dropoffWalkMeters = map.distanceMeters(driverRoute.destination, passengerRequest.destination);

  const detourRoute = await map.route(driverRoute.origin, driverRoute.destination, [
    passengerRequest.origin,
    passengerRequest.destination,
  ]);
  const detourSeconds = Math.max(0, detourRoute.durationSeconds - directDriverRoute.durationSeconds);

  const timeDeltaMinutes = Math.abs(
    (driverRoute.departureAt.getTime() - passengerRequest.desiredDeparture.getTime()) / 60000
  );

  const proximityScore = (meters: number, maxMeters: number) =>
    Math.max(0, 1 - meters / maxMeters);

  const pickupScore = proximityScore(pickupWalkMeters, passengerRequest.maxWalkMeters);
  const dropoffScore = proximityScore(dropoffWalkMeters, passengerRequest.maxWalkMeters);
  const timeScore = Math.max(0, 1 - timeDeltaMinutes / 60); // linear falloff over 1hr
  const detourScore = Math.max(0, 1 - detourSeconds / 900); // linear falloff over 15min
  // Route overlap approximated from how little detour is required relative to direct route.
  const overlapScore = directDriverRoute.distanceMeters > 0
    ? Math.max(0, 1 - detourRoute.distanceMeters / directDriverRoute.distanceMeters + 1)
    : 0;

  const rawScore =
    WEIGHTS.routeOverlap * Math.min(1, overlapScore) +
    WEIGHTS.pickupProximity * pickupScore +
    WEIGHTS.dropoffProximity * dropoffScore +
    WEIGHTS.timeCompatibility * timeScore +
    WEIGHTS.detourPenalty * detourScore;

  const score = Math.round(Math.max(0, Math.min(1, rawScore)) * 100);

  const explanation = [
    `Pickup is ${Math.round(pickupWalkMeters / 80)} minutes from driver's route.`,
    `Drop-off is ${Math.round(dropoffWalkMeters / 80)} minutes from driver's route.`,
    `Estimated detour: ${Math.round(detourSeconds / 60)} minutes.`,
  ];

  const isViable =
    pickupWalkMeters <= passengerRequest.maxWalkMeters &&
    dropoffWalkMeters <= passengerRequest.maxWalkMeters &&
    detourSeconds <= 900; // 15 min cap for MVP

  return { score, pickupWalkMeters, dropoffWalkMeters, detourSeconds, timeDeltaMinutes, explanation, isViable };
}
