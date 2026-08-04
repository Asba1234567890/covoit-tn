import { describe, it, expect } from "vitest";
import { scoreMatch } from "@/lib/matching/matchingEngine";
import type { MapProvider, LatLng, GeocodeResult, RouteResult } from "@/lib/map/MapProvider";

// Hand-rolled fake — MapProvider is passed as a parameter, not imported, so
// no module mocking is needed. Distances/durations are fixed and deterministic.
function fakeMap(overrides: Partial<MapProvider> = {}): MapProvider {
  return {
    geocode: async (): Promise<GeocodeResult[]> => [],
    reverseGeocode: async () => null,
    route: async (): Promise<RouteResult> => ({ distanceMeters: 10000, durationSeconds: 600, geometry: null }),
    distanceMeters: (a: LatLng, b: LatLng) => Math.abs(a.lat - b.lat) * 100000,
    nearbyPickupPoints: async () => [],
    ...overrides,
  };
}

const driverRoute = {
  origin: { lat: 36.8, lng: 10.1 },
  destination: { lat: 35.8, lng: 10.6 },
  departureAt: new Date("2026-01-01T08:00:00Z"),
};

describe("scoreMatch", () => {
  it("is viable when pickup/dropoff are close and detour is small", async () => {
    const map = fakeMap({
      distanceMeters: () => 100, // well within maxWalkMeters
      route: async (origin, destination, waypoints) =>
        waypoints && waypoints.length > 0
          ? { distanceMeters: 10100, durationSeconds: 610, geometry: null } // tiny detour
          : { distanceMeters: 10000, durationSeconds: 600, geometry: null },
    });

    const result = await scoreMatch(map, {
      driverRoute,
      passengerRequest: {
        origin: { lat: 36.8, lng: 10.1 },
        destination: { lat: 35.8, lng: 10.6 },
        desiredDeparture: new Date("2026-01-01T08:00:00Z"),
        maxWalkMeters: 800,
      },
    });

    expect(result.isViable).toBe(true);
    expect(result.score).toBeGreaterThan(50);
  });

  it("is not viable when the pickup is farther than maxWalkMeters", async () => {
    const map = fakeMap({ distanceMeters: () => 5000 });

    const result = await scoreMatch(map, {
      driverRoute,
      passengerRequest: {
        origin: { lat: 36.9, lng: 10.1 },
        destination: { lat: 35.8, lng: 10.6 },
        desiredDeparture: new Date("2026-01-01T08:00:00Z"),
        maxWalkMeters: 800,
      },
    });

    expect(result.isViable).toBe(false);
  });

  it("is not viable when the detour exceeds the 15-minute cap", async () => {
    const map = fakeMap({
      distanceMeters: () => 100,
      route: async (origin, destination, waypoints) =>
        waypoints && waypoints.length > 0
          ? { distanceMeters: 30000, durationSeconds: 2000, geometry: null } // huge detour
          : { distanceMeters: 10000, durationSeconds: 600, geometry: null },
    });

    const result = await scoreMatch(map, {
      driverRoute,
      passengerRequest: {
        origin: { lat: 36.8, lng: 10.1 },
        destination: { lat: 35.8, lng: 10.6 },
        desiredDeparture: new Date("2026-01-01T08:00:00Z"),
        maxWalkMeters: 800,
      },
    });

    expect(result.isViable).toBe(false);
    expect(result.detourSeconds).toBeGreaterThan(900);
  });

  it("keeps score within 0-100 bounds", async () => {
    const map = fakeMap();
    const result = await scoreMatch(map, {
      driverRoute,
      passengerRequest: {
        origin: { lat: 0, lng: 0 },
        destination: { lat: 0, lng: 0 },
        desiredDeparture: new Date("2020-01-01T00:00:00Z"), // wildly different time
        maxWalkMeters: 800,
      },
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
