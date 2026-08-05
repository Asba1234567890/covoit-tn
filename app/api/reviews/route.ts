import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import {
  createReview,
  BookingNotFoundError,
  BookingNotCompletedError,
  NotParticipantError,
  SelfReviewError,
  DuplicateReviewError,
  InvalidCategoriesError,
} from "@/server/reviews/reviewService";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { bookingId, stars, comment, categories } = body;

  if (!bookingId || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "bookingId and stars (1-5) are required" }, { status: 400 });
  }

  try {
    const review = await createReview({
      bookingId,
      authorId: user.id,
      authorName: user.firstName,
      stars,
      comment,
      categories,
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (e) {
    if (e instanceof BookingNotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof BookingNotCompletedError) return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof NotParticipantError) return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof SelfReviewError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof InvalidCategoriesError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof DuplicateReviewError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId is required" }, { status: 400 });

  const reviews = await prisma.review.findMany({
    where: { subjectId, moderationStatus: "APPROVED" },
    include: { author: { select: { firstName: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ reviews });
}
