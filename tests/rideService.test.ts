import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma } from "./mocks/prisma";

const mockPrisma = vi.hoisted(() => ({ current: null as any }));

vi.mock("@/server/db/prisma", () => ({
  get prisma() {
    return mockPrisma.current;
  },
}));

// Avoid any real network calls to the Google Maps API — route() just needs
// to return a fixed shape for these tests.
vi.mock("@/lib/map/GoogleMapProvider", () => ({
  GoogleMapProvider: class {
    route = vi.fn().mockResolvedValue({ distanceMeters: 1000, durationSeconds: 600, geometry: null });
  },
}));

import { generateInstances } from "@/server/rides/rideService";

function template(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "recurring_1",
    driverId: "driver_1",
    vehicleId: "vehicle_1",
    originCityId: "city_a",
    destinationCityId: "city_b",
    originLabel: "A",
    originLat: 36.8,
    originLng: 10.1,
    destinationLabel: "B",
    destinationLat: 35.8,
    destinationLng: 10.6,
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    departureTime: "07:30",
    seatsPerInstance: 3,
    pricePerSeat: "10",
    luggageAllowed: true,
    smokingAllowed: false,
    petsAllowed: false,
    description: null,
    bookingMode: "APPROVAL",
    ...overrides,
  };
}

describe("generateInstances", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
    prisma.ride.create.mockImplementation(async ({ data }: any) => ({ id: `ride_${Math.random()}`, ...data }));
  });

  it("only creates instances on the configured days of week", async () => {
    prisma.recurringRide.findUniqueOrThrow.mockResolvedValue(template({ daysOfWeek: [1, 3, 5] })); // Mon/Wed/Fri

    const created = await generateInstances("recurring_1", 2); // 2 weeks = 14 days

    for (const ride of created) {
      const day = new Date(ride.departureAt).getDay();
      expect([1, 3, 5]).toContain(day);
    }
  });

  it("never backfills instances in the past", async () => {
    prisma.recurringRide.findUniqueOrThrow.mockResolvedValue(template());

    const created = await generateInstances("recurring_1", 1);

    for (const ride of created) {
      expect(new Date(ride.departureAt).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("carries the template's ride details onto every generated instance", async () => {
    prisma.recurringRide.findUniqueOrThrow.mockResolvedValue(
      template({ pricePerSeat: "15", seatsPerInstance: 4, bookingMode: "INSTANT" })
    );

    const created = await generateInstances("recurring_1", 1);

    expect(created.length).toBeGreaterThan(0);
    for (const ride of created) {
      expect(ride.pricePerSeat).toBe("15");
      expect(ride.seatsTotal).toBe(4);
      expect(ride.seatsAvailable).toBe(4);
      expect(ride.bookingMode).toBe("INSTANT");
      expect(ride.status).toBe("SCHEDULED");
      expect(ride.recurringRideId).toBe("recurring_1");
    }
  });

  it("generates zero instances for an empty daysOfWeek", async () => {
    prisma.recurringRide.findUniqueOrThrow.mockResolvedValue(template({ daysOfWeek: [] }));

    const created = await generateInstances("recurring_1", 2);

    expect(created).toHaveLength(0);
  });
});
