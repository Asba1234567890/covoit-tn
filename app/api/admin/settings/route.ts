import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/server/admin/adminAuth";
import { logAdminAction } from "@/server/admin/auditLog";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const settings = await prisma.platformSetting.findMany({
    include: { country: { select: { name: true, code: true } } },
    orderBy: { key: "asc" },
  });

  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  // Only Super Admin can change platform-wide configuration (spec §58).
  if (admin.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super Admin access required" }, { status: 403 });

  const body = await req.json();
  const { settingId, value } = body;
  if (!settingId || value === undefined) return NextResponse.json({ error: "settingId and value are required" }, { status: 400 });

  const setting = await prisma.platformSetting.update({ where: { id: settingId }, data: { value } });
  await logAdminAction({ adminUserId: admin.adminId, action: "settings:update", metadata: { settingId, value } });

  return NextResponse.json({ setting });
}
