import { prisma } from "@/server/db/prisma";
import { notify } from "@/server/notifications/notificationService";
import { DRIVER_REVIEW_CATEGORIES, PASSENGER_REVIEW_CATEGORIES } from "@/lib/reviewCategories";

const DRIVER_CATEGORY_KEYS = DRIVER_REVIEW_CATEGORIES.map((c) => c.key);
const PASSENGER_CATEGORY_KEYS = PASSENGER_REVIEW_CATEGORIES.map((c) => c.key);

export class BookingNotFoundError extends Error {}
export class BookingNotCompletedError extends Error {}
export class NotParticipantError extends Error {}
export class SelfReviewError extends Error {}
export class DuplicateReviewError extends Error {}
export class InvalidCategoriesError extends Error {}

function validateCategories(categories: unknown, allowedKeys: readonly string[]): Record<string, number> | undefined {
  if (categories === undefined || categories === null) return undefined;
  if (typeof categories !== "object" || Array.isArray(categories)) {
    throw new InvalidCategoriesError("categories must be an object");
  }
  const entries = Object.entries(categories as Record<string, unknown>);
  const cleaned: Record<string, number> = {};
  for (const [key, value] of entries) {
    if (!allowedKeys.includes(key)) {
      throw new InvalidCategoriesError(`Unknown category "${key}"`);
    }
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5) {
      throw new InvalidCategoriesError(`Category "${key}" must be an integer 1-5`);
    }
    cleaned[key] = value as number;
  }
  return entries.length > 0 ? cleaned : undefined;
}

// Driver's public rating is denormalized (DriverProfile.rating) because it's
// used for search sort/filter — a hot read path. Only APPROVED reviews count,
// matching what the public review list actually shows, so the number never
// implies more reviews than a visitor can see. Recomputed from scratch (not
// incrementally) so it stays correct however moderationStatus changes.
export async function recomputeDriverRating(subjectId: string) {
  const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: subjectId } });
  if (!driverProfile) return;

  const agg = await prisma.review.aggregate({
    where: { subjectId, moderationStatus: "APPROVED" },
    _avg: { stars: true },
  });
  await prisma.driverProfile.update({
    where: { userId: subjectId },
    data: { rating: agg._avg.stars ?? 0 },
  });
}

export async function createReview(params: {
  bookingId: string;
  authorId: string;
  authorName: string;
  stars: number;
  comment?: string;
  categories?: unknown;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { ride: true },
  });
  if (!booking) throw new BookingNotFoundError("Booking not found");

  // Only a completed booking is reviewable — this is what makes the review
  // system resistant to fake/unrelated reviews (spec's review-integrity rules).
  if (booking.status !== "COMPLETED") {
    throw new BookingNotCompletedError("You can only review a completed trip");
  }

  const isPassenger = booking.passengerId === params.authorId;
  const isDriver = booking.ride.driverId === params.authorId;
  if (!isPassenger && !isDriver) {
    throw new NotParticipantError("You were not a participant in this trip");
  }

  const subjectId = isPassenger ? booking.ride.driverId : booking.passengerId;
  if (subjectId === params.authorId) {
    // Structurally shouldn't happen (driver can't book their own ride), but
    // guard explicitly against self-review anyway.
    throw new SelfReviewError("You can't review yourself");
  }

  const categories = validateCategories(params.categories, isPassenger ? DRIVER_CATEGORY_KEYS : PASSENGER_CATEGORY_KEYS);

  try {
    const review = await prisma.review.create({
      data: {
        bookingId: params.bookingId,
        authorId: params.authorId,
        subjectId,
        stars: params.stars,
        comment: params.comment,
        categories,
      },
    });

    // New reviews start PENDING and the public rating only counts APPROVED
    // ones (see recomputeDriverRating), so nothing to recompute here — the
    // aggregate updates when admin moderation later approves/rejects it.
    await notify(subjectId, "REVIEW_RECEIVED", {
      reviewId: review.id,
      bookingId: params.bookingId,
      authorId: params.authorId,
      authorName: params.authorName,
      stars: params.stars,
    });

    return review;
  } catch (e: any) {
    if (e.code === "P2002") {
      throw new DuplicateReviewError("You already reviewed this trip");
    }
    throw e;
  }
}

export async function moderateReview(params: { reviewId: string; decision: "APPROVED" | "REJECTED" }) {
  const review = await prisma.review.update({
    where: { id: params.reviewId },
    data: { moderationStatus: params.decision },
  });
  await recomputeDriverRating(review.subjectId);
  return review;
}
