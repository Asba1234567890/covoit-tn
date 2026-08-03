import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";

export interface AdminContext {
  adminId: string;
  role: "SUPER_ADMIN" | "MODERATOR" | "OPERATIONS";
  name: string;
  userId: string;
}

async function resolveAdmin(sessionId: string | undefined): Promise<AdminContext | null> {
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  const admin = await prisma.adminUser.findUnique({ where: { phone: session.user.phone } });
  if (!admin) return null;

  return {
    adminId: admin.id,
    role: admin.role as AdminContext["role"],
    name: admin.name,
    userId: session.user.id,
  };
}

// For API routes (app/api/admin/**/route.ts)
export async function getAdminFromRequest(req: NextRequest): Promise<AdminContext | null> {
  return resolveAdmin(req.cookies.get("session_id")?.value);
}

// For server components (app/admin/**/page.tsx, layout.tsx)
export async function getAdminFromCookies(): Promise<AdminContext | null> {
  const sessionId = cookies().get("session_id")?.value;
  return resolveAdmin(sessionId);
}

// Role hierarchy per spec §58: Super Admin > Moderator/Operations (each scoped to their area).
// Checked at the route level, not enforced here, since the allowed action set differs per resource.
export function canModerate(role: AdminContext["role"]) {
  return role === "SUPER_ADMIN" || role === "MODERATOR";
}

export function canOperate(role: AdminContext["role"]) {
  return role === "SUPER_ADMIN" || role === "OPERATIONS";
}
