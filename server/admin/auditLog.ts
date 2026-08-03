import { prisma } from "@/server/db/prisma";

export async function logAdminAction(params: {
  adminUserId: string;
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      adminUserId: params.adminUserId,
      userId: params.userId,
      action: params.action,
      metadata: params.metadata as any,
    },
  });
}
