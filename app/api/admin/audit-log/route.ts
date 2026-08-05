import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/server/admin/adminAuth";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource") ?? undefined;

  const entries = await prisma.auditLog.findMany({
    where: resource ? { action: { startsWith: `${resource}:` } } : undefined,
    include: {
      adminUser: { select: { name: true } },
      user: { select: { firstName: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ entries });
}
