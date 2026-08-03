import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function getSessionUser(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  return session.user;
}
