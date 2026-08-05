import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma } from "./mocks/prisma";

const mockPrisma = vi.hoisted(() => ({ current: null as any }));

vi.mock("@/server/db/prisma", () => ({
  get prisma() {
    return mockPrisma.current;
  },
}));

import {
  createReview,
  moderateReview,
  BookingNotFoundError,
  BookingNotCompletedError,
  NotParticipantError,
  DuplicateReviewError,
  InvalidCategoriesError,
} from "@/server/reviews/reviewService";

function baseBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "booking_1",
    passengerId: "pax_1",
    status: "COMPLETED",
    ride: { driverId: "driver_1" },
    ...overrides,
  };
}

describe("createReview", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
    prisma.notification.create.mockResolvedValue({ id: "n1" });
  });

  it("rejects when the booking doesn't exist", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(
      createReview({ bookingId: "missing", authorId: "pax_1", authorName: "Amine", stars: 5 })
    ).rejects.toBeInstanceOf(BookingNotFoundError);
  });

  it("rejects reviewing a booking that isn't COMPLETED", async () => {
    prisma.booking.findUnique.mockResolvedValue(baseBooking({ status: "ACCEPTED" }));

    await expect(
      createReview({ bookingId: "booking_1", authorId: "pax_1", authorName: "Amine", stars: 5 })
    ).rejects.toBeInstanceOf(BookingNotCompletedError);
  });

  it("rejects a caller who wasn't a participant in the trip", async () => {
    prisma.booking.findUnique.mockResolvedValue(baseBooking());

    await expect(
      createReview({ bookingId: "booking_1", authorId: "stranger", authorName: "Amine", stars: 5 })
    ).rejects.toBeInstanceOf(NotParticipantError);
  });

  it("maps a Prisma unique-constraint violation to DuplicateReviewError", async () => {
    prisma.booking.findUnique.mockResolvedValue(baseBooking());
    prisma.review.create.mockRejectedValue({ code: "P2002" });

    await expect(
      createReview({ bookingId: "booking_1", authorId: "pax_1", authorName: "Amine", stars: 5 })
    ).rejects.toBeInstanceOf(DuplicateReviewError);
  });

  it("passenger reviewing driver: derives subjectId as the driver and notifies them", async () => {
    prisma.booking.findUnique.mockResolvedValue(baseBooking());
    prisma.review.create.mockResolvedValue({ id: "review_1", subjectId: "driver_1" });

    await createReview({ bookingId: "booking_1", authorId: "pax_1", authorName: "Amine", stars: 5, comment: "Great ride" });

    expect(prisma.review.create).toHaveBeenCalledWith({
      data: { bookingId: "booking_1", authorId: "pax_1", subjectId: "driver_1", stars: 5, comment: "Great ride", categories: undefined },
    });
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "driver_1", type: "REVIEW_RECEIVED" }) })
    );
  });

  it("driver reviewing passenger: derives subjectId as the passenger", async () => {
    prisma.booking.findUnique.mockResolvedValue(baseBooking());
    prisma.review.create.mockResolvedValue({ id: "review_1", subjectId: "pax_1" });

    await createReview({ bookingId: "booking_1", authorId: "driver_1", authorName: "Sami", stars: 4 });

    expect(prisma.review.create).toHaveBeenCalledWith({
      data: { bookingId: "booking_1", authorId: "driver_1", subjectId: "pax_1", stars: 4, comment: undefined, categories: undefined },
    });
  });

  it("accepts valid category ratings for the direction (passenger -> driver categories)", async () => {
    prisma.booking.findUnique.mockResolvedValue(baseBooking());
    prisma.review.create.mockResolvedValue({ id: "review_1", subjectId: "driver_1" });

    await createReview({
      bookingId: "booking_1",
      authorId: "pax_1",
      authorName: "Amine",
      stars: 5,
      categories: { drivingQuality: 5, punctuality: 4 },
    });

    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ categories: { drivingQuality: 5, punctuality: 4 } }) })
    );
  });

  it("rejects a category key that doesn't belong to the reviewer's direction", async () => {
    prisma.booking.findUnique.mockResolvedValue(baseBooking());

    await expect(
      createReview({ bookingId: "booking_1", authorId: "pax_1", authorName: "Amine", stars: 5, categories: { respect: 5 } })
    ).rejects.toBeInstanceOf(InvalidCategoriesError);
  });

  it("rejects an out-of-range category value", async () => {
    prisma.booking.findUnique.mockResolvedValue(baseBooking());

    await expect(
      createReview({ bookingId: "booking_1", authorId: "pax_1", authorName: "Amine", stars: 5, categories: { punctuality: 6 } })
    ).rejects.toBeInstanceOf(InvalidCategoriesError);
  });
});

describe("moderateReview", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
  });

  it("recomputes the driver's rating from APPROVED-only reviews when the subject is a driver", async () => {
    prisma.review.update.mockResolvedValue({ id: "review_1", subjectId: "driver_1" });
    prisma.driverProfile.findUnique.mockResolvedValue({ userId: "driver_1", rating: 0 });
    prisma.review.aggregate.mockResolvedValue({ _avg: { stars: 4.5 } });

    await moderateReview({ reviewId: "review_1", decision: "APPROVED" });

    expect(prisma.review.aggregate).toHaveBeenCalledWith({
      where: { subjectId: "driver_1", moderationStatus: "APPROVED" },
      _avg: { stars: true },
    });
    expect(prisma.driverProfile.update).toHaveBeenCalledWith({ where: { userId: "driver_1" }, data: { rating: 4.5 } });
  });

  it("does nothing to DriverProfile when the subject is a passenger (no driver profile)", async () => {
    prisma.review.update.mockResolvedValue({ id: "review_1", subjectId: "pax_1" });
    prisma.driverProfile.findUnique.mockResolvedValue(null);

    await moderateReview({ reviewId: "review_1", decision: "APPROVED" });

    expect(prisma.driverProfile.update).not.toHaveBeenCalled();
  });
});
