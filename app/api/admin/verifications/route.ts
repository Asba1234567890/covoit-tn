import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest, canModerate } from "@/server/admin/adminAuth";
import { logAdminAction } from "@/server/admin/auditLog";
import { notify } from "@/server/notifications/notificationService";
import { prisma } from "@/server/db/prisma";
import { reviewVerificationDocument, VerificationNotFoundError } from "@/server/verification/verificationService";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  const verifications = await prisma.verification.findMany({
    where: { status },
    include: { user: { select: { firstName: true, phone: true, verificationLevel: true } } },
    orderBy: { submittedAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ verifications });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  if (!canModerate(admin.role)) return NextResponse.json({ error: "Insufficient role" }, { status: 403 });

  const body = await req.json();
  const { verificationId, decision, rejectionReason } = body;
  if (!verificationId || !["APPROVED", "REJECTED"].includes(decision)) {
    return NextResponse.json({ error: "verificationId and a valid decision are required" }, { status: 400 });
  }
  if (decision === "REJECTED" && !rejectionReason) {
    return NextResponse.json({ error: "rejectionReason is required when rejecting" }, { status: 400 });
  }

  let verification;
  try {
    verification = await reviewVerificationDocument({
      verificationId,
      decision,
      reviewerAdminId: admin.adminId,
      rejectionReason,
    });
  } catch (e) {
    if (e instanceof VerificationNotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }

  await logAdminAction({
    adminUserId: admin.adminId,
    action: "verification:review",
    userId: verification.userId,
    metadata: { verificationId, type: verification.type, decision, rejectionReason },
  });
  await notify(verification.userId, "DRIVER_VERIFICATION_RESULT", {
    type: verification.type,
    approved: decision === "APPROVED",
    rejectionReason: decision === "REJECTED" ? rejectionReason : undefined,
  });

  return NextResponse.json({ verification });
}
