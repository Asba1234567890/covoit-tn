import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma } from "./mocks/prisma";

const mockPrisma = vi.hoisted(() => ({ current: null as any }));

vi.mock("@/server/db/prisma", () => ({
  get prisma() {
    return mockPrisma.current;
  },
}));

import {
  createBooking,
  respondToBooking,
  cancelBooking,
  InsufficientSeatsError,
  RideNotBookableError,
  DuplicateBookingError,
  NotAuthorizedError,
} from "@/server/bookings/bookingService";

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);

function baseRideRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ride_1",
    seatsAvailable: 2,
    status: "SCHEDULED",
    pricePerSeat: "10",
    driverId: "driver_1",
    departureAt: FUTURE,
    ...overrides,
  };
}

describe("createBooking", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
  });

  it("rejects booking when the ride is not SCHEDULED", async () => {
    prisma.$queryRaw.mockResolvedValue([baseRideRow({ status: "CANCELLED" })]);

    await expect(
      createBooking({ rideId: "ride_1", passengerId: "pax_1", seatsRequested: 1 })
    ).rejects.toBeInstanceOf(RideNotBookableError);
  });

  it("rejects booking on a ride that has already departed", async () => {
    prisma.$queryRaw.mockResolvedValue([baseRideRow({ departureAt: PAST })]);

    await expect(
      createBooking({ rideId: "ride_1", passengerId: "pax_1", seatsRequested: 1 })
    ).rejects.toBeInstanceOf(RideNotBookableError);
  });

  it("rejects a driver booking their own ride", async () => {
    prisma.$queryRaw.mockResolvedValue([baseRideRow({ driverId: "same_user" })]);

    await expect(
      createBooking({ rideId: "ride_1", passengerId: "same_user", seatsRequested: 1 })
    ).rejects.toBeInstanceOf(RideNotBookableError);
  });

  it("rejects booking more seats than are available — the double-booking guard", async () => {
    prisma.$queryRaw.mockResolvedValue([baseRideRow({ seatsAvailable: 1 })]);

    await expect(
      createBooking({ rideId: "ride_1", passengerId: "pax_1", seatsRequested: 2 })
    ).rejects.toBeInstanceOf(InsufficientSeatsError);
  });

  it("rejects a second active booking from the same passenger on the same ride", async () => {
    prisma.$queryRaw.mockResolvedValue([baseRideRow()]);
    prisma.booking.findFirst.mockResolvedValue({ id: "existing_booking", status: "PENDING" });

    await expect(
      createBooking({ rideId: "ride_1", passengerId: "pax_1", seatsRequested: 1 })
    ).rejects.toBeInstanceOf(DuplicateBookingError);

    expect(prisma.ride.update).not.toHaveBeenCalled();
  });

  it("creates a PENDING booking for an APPROVAL-mode ride and decrements seats", async () => {
    prisma.$queryRaw.mockResolvedValue([baseRideRow({ seatsAvailable: 3 })]);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.ride.findUniqueOrThrow.mockResolvedValue(baseRideRow({ bookingMode: "APPROVAL" }));
    prisma.booking.create.mockResolvedValue({ id: "booking_1", status: "PENDING", passengerId: "pax_1", rideId: "ride_1" });

    const booking = await createBooking({ rideId: "ride_1", passengerId: "pax_1", seatsRequested: 2 });

    expect(prisma.ride.update).toHaveBeenCalledWith({
      where: { id: "ride_1" },
      data: { seatsAvailable: { decrement: 2 } },
    });
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", respondedAt: null }) })
    );
    expect(booking.status).toBe("PENDING");
  });

  it("creates an ACCEPTED booking immediately for an INSTANT-mode ride", async () => {
    prisma.$queryRaw.mockResolvedValue([baseRideRow()]);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.ride.findUniqueOrThrow.mockResolvedValue(baseRideRow({ bookingMode: "INSTANT" }));
    prisma.booking.create.mockResolvedValue({ id: "booking_1", status: "ACCEPTED", passengerId: "pax_1", rideId: "ride_1" });

    await createBooking({ rideId: "ride_1", passengerId: "pax_1", seatsRequested: 1 });

    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACCEPTED" }) })
    );
  });
});

describe("respondToBooking", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
  });

  it("rejects a response from anyone other than the ride's driver", async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: "booking_1",
      status: "PENDING",
      ride: { driverId: "real_driver" },
    });

    await expect(respondToBooking("booking_1", "ACCEPTED", "someone_else")).rejects.toBeInstanceOf(
      NotAuthorizedError
    );
  });

  it("rejects responding to a booking that isn't PENDING", async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: "booking_1",
      status: "ACCEPTED",
      ride: { driverId: "driver_1" },
    });

    await expect(respondToBooking("booking_1", "ACCEPTED", "driver_1")).rejects.toThrow(
      "Booking already responded to"
    );
  });

  it("releases the held seats when a driver declines", async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: "booking_1",
      status: "PENDING",
      rideId: "ride_1",
      seatsBooked: 2,
      passengerId: "pax_1",
      ride: { driverId: "driver_1" },
    });
    prisma.booking.update.mockResolvedValue({ id: "booking_1", status: "DECLINED", passengerId: "pax_1", rideId: "ride_1" });

    await respondToBooking("booking_1", "DECLINED", "driver_1");

    expect(prisma.ride.update).toHaveBeenCalledWith({
      where: { id: "ride_1" },
      data: { seatsAvailable: { increment: 2 } },
    });
  });

  it("does not touch seat count when a driver accepts (seats were already held)", async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: "booking_1",
      status: "PENDING",
      rideId: "ride_1",
      seatsBooked: 1,
      passengerId: "pax_1",
      ride: { driverId: "driver_1" },
    });
    prisma.booking.update.mockResolvedValue({ id: "booking_1", status: "ACCEPTED", passengerId: "pax_1", rideId: "ride_1" });

    await respondToBooking("booking_1", "ACCEPTED", "driver_1");

    expect(prisma.ride.update).not.toHaveBeenCalled();
  });
});

describe("cancelBooking", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
  });

  it("rejects cancellation from someone who isn't the passenger or driver", async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: "booking_1",
      status: "ACCEPTED",
      passengerId: "pax_1",
      ride: { driverId: "driver_1" },
    });

    await expect(cancelBooking("booking_1", "stranger")).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("rejects cancelling a booking that's already completed", async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: "booking_1",
      status: "COMPLETED",
      passengerId: "pax_1",
      ride: { driverId: "driver_1" },
    });

    await expect(cancelBooking("booking_1", "pax_1")).rejects.toThrow("not in a cancellable state");
  });

  it("marks CANCELLED_BY_PASSENGER when the passenger cancels and releases seats", async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: "booking_1",
      status: "ACCEPTED",
      rideId: "ride_1",
      seatsBooked: 1,
      passengerId: "pax_1",
      ride: { driverId: "driver_1" },
    });
    prisma.booking.update.mockResolvedValue({ id: "booking_1", status: "CANCELLED_BY_PASSENGER", passengerId: "pax_1", rideId: "ride_1" });
    prisma.ride.findUniqueOrThrow.mockResolvedValue({ id: "ride_1", driverId: "driver_1" });

    await cancelBooking("booking_1", "pax_1", "change of plans");

    expect(prisma.ride.update).toHaveBeenCalledWith({
      where: { id: "ride_1" },
      data: { seatsAvailable: { increment: 1 } },
    });
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED_BY_PASSENGER" }) })
    );
  });

  it("marks CANCELLED_BY_DRIVER when the driver cancels", async () => {
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: "booking_1",
      status: "PENDING",
      rideId: "ride_1",
      seatsBooked: 1,
      passengerId: "pax_1",
      ride: { driverId: "driver_1" },
    });
    prisma.booking.update.mockResolvedValue({ id: "booking_1", status: "CANCELLED_BY_DRIVER", passengerId: "pax_1", rideId: "ride_1" });
    prisma.ride.findUniqueOrThrow.mockResolvedValue({ id: "ride_1", driverId: "driver_1" });

    await cancelBooking("booking_1", "driver_1");

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED_BY_DRIVER" }) })
    );
  });
});
