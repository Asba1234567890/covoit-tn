import { prisma } from "@/server/db/prisma";

export class CannotBlockSelfError extends Error {}

export async function isBlocked(userId: string, otherUserId: string): Promise<boolean> {
  const block = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
  });
  return !!block;
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new CannotBlockSelfError("You can't block yourself");
  return prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: {},
    create: { blockerId, blockedId },
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await prisma.blockedUser.deleteMany({ where: { blockerId, blockedId } });
}

export async function getBlockedIds(userId: string): Promise<string[]> {
  const rows = await prisma.blockedUser.findMany({ where: { blockerId: userId }, select: { blockedId: true } });
  return rows.map((r: { blockedId: string }) => r.blockedId);
}
