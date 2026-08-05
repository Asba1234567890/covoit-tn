import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest, canModerate } from "@/server/admin/adminAuth";
import { logAdminAction } from "@/server/admin/auditLog";
import { prisma } from "@/server/db/prisma";
import { moderateReview } from "@/server/reviews/reviewService";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  const reviews = await prisma.review.findMany({
    where: { moderationStatus: status },
    include: {
      author: { select: { id: true, firstName: true } },
      subject: { select: { id: true, firstName: true } },
      booking: { select: { ride: { select: { driverId: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ reviews });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  if (!canModerate(admin.role)) return NextResponse.json({ error: "Insufficient role" }, { status: 403 });

  const body = await req.json();
  const { reviewId, decision } = body;
  if (!reviewId || !["APPROVED", "REJECTED"].includes(decision)) {
    return NextResponse.json({ error: "reviewId and a valid decision are required" }, { status: 400 });
  }

  const review = await moderateReview({ reviewId, decision });
  await logAdminAction({ adminUserId: admin.adminId, action: "review:moderate", metadata: { reviewId, decision } });

  return NextResponse.json({ review });
}
