import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest, canModerate } from "@/server/admin/adminAuth";
import { logAdminAction } from "@/server/admin/auditLog";
import { notify } from "@/server/notifications/notificationService";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
      : undefined,
    select: {
      id: true,
      firstName: true,
      phone: true,
      verificationLevel: true,
      suspendedAt: true,
      bannedAt: true,
      createdAt: true,
      driverProfile: { select: { rating: true, completedRidesCount: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  if (!canModerate(admin.role)) return NextResponse.json({ error: "Insufficient role" }, { status: 403 });

  const body = await req.json();
  const { userId, action } = body;
  if (!userId || !action) return NextResponse.json({ error: "userId and action are required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (action === "suspend") data.suspendedAt = new Date();
  else if (action === "unsuspend") data.suspendedAt = null;
  else if (action === "ban") data.bannedAt = new Date();
  else if (action === "unban") data.bannedAt = null;
  else if (action === "verify_identity") data.verificationLevel = 2;
  else if (action === "verify_driver") data.verificationLevel = 3;
  else return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, firstName: true, phone: true, verificationLevel: true, suspendedAt: true, bannedAt: true },
  });
  await logAdminAction({ adminUserId: admin.adminId, action: `user:${action}`, userId });
  if (action === "verify_identity" || action === "verify_driver") {
    await notify(userId, "DRIVER_VERIFICATION_RESULT", { action, approved: true });
  }

  return NextResponse.json({ user });
}
