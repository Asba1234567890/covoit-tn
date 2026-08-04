import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;
  if (sessionId) {
    // Only revoke this one session (not all of the user's devices) — best
    // effort, a missing/already-revoked row is not an error for logout.
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
