import { prisma } from "@/server/db/prisma";

// OTP generation/verification now lives in server/auth/otpService.ts, backed
// by the OtpRequest table (hashed, expiring, rate-limited) instead of an
// in-memory Map — the old in-memory store did not survive across serverless
// invocations in production and is a real correctness bug, not just a dev
// shortcut. This file keeps only the session/user helpers shared by both the
// WhatsApp OTP flow and the password flow.

export async function findOrCreateUserByPhone(phone: string, firstName?: string) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      phone,
      phoneVerified: true,
      firstName: firstName ?? "New user",
    },
  });
}

export async function createSession(userId: string, deviceInfo?: string) {
  return prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      deviceInfo,
    },
  });
}

export async function revokeAllSessions(userId: string) {
  return prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
