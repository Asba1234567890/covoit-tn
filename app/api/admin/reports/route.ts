import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest, canModerate } from "@/server/admin/adminAuth";
import { logAdminAction } from "@/server/admin/auditLog";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const reports = await prisma.report.findMany({
    where: status ? { status } : undefined,
    include: {
      reportingUser: { select: { firstName: true, phone: true } },
      reportedUser: { select: { firstName: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  if (!canModerate(admin.role)) return NextResponse.json({ error: "Insufficient role" }, { status: 403 });

  const body = await req.json();
  const { reportId, status, internalNotes } = body;
  if (!reportId || !status) return NextResponse.json({ error: "reportId and status are required" }, { status: 400 });
  if (!["OPEN", "INVESTIGATING", "RESOLVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status,
      internalNotes,
      resolvedAt: status === "RESOLVED" || status === "REJECTED" ? new Date() : null,
    },
  });

  await logAdminAction({ adminUserId: admin.adminId, action: "report:update_status", metadata: { reportId, status } });
  return NextResponse.json({ report });
}
