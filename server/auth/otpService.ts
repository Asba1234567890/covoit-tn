import { prisma } from "@/server/db/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendWhatsAppOtp, WhatsAppConfigError, WhatsAppDeliveryError } from "@/server/whatsapp/whatsappClient";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const IP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const IP_RATE_LIMIT_MAX = 8; // requests per IP per window, across all phones
const PHONE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PHONE_RATE_LIMIT_MAX = 5; // requests per phone per window, on top of the cooldown

const TUNISIAN_PHONE_REGEX = /^\+216\d{8}$/;

export class InvalidPhoneFormatError extends Error {}
export class ResendCooldownError extends Error {
  secondsRemaining: number;
  constructor(secondsRemaining: number) {
    super(`Please wait ${secondsRemaining}s before requesting another code`);
    this.secondsRemaining = secondsRemaining;
  }
}
export class RateLimitedError extends Error {}
export class OtpExpiredError extends Error {}
export class OtpInvalidError extends Error {}
export class TooManyAttemptsError extends Error {}
export class NoActiveOtpError extends Error {}

export function isValidTunisianPhone(phone: string): boolean {
  return TUNISIAN_PHONE_REGEX.test(phone);
}

/**
 * Generates, hashes, and stores a new OTP, invalidating any prior unconsumed
 * OTP for this phone, then sends it via WhatsApp. Enforces per-phone cooldown
 * and both per-phone and per-IP rate limits before doing any of that work.
 */
export async function requestOtp(phone: string, requestIp: string | null) {
  if (!isValidTunisianPhone(phone)) {
    throw new InvalidPhoneFormatError("Enter a valid Tunisian phone number, e.g. +21620123456");
  }

  const now = new Date();

  // Per-phone resend cooldown — look at the most recent request regardless
  // of whether it was consumed.
  const lastForPhone = await prisma.otpRequest.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
  if (lastForPhone) {
    const elapsedMs = now.getTime() - lastForPhone.createdAt.getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      throw new ResendCooldownError(Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000));
    }
  }

  // Per-phone rate limit (independent of cooldown, catches slow-drip abuse).
  const phoneWindowStart = new Date(now.getTime() - PHONE_RATE_LIMIT_WINDOW_MS);
  const phoneCount = await prisma.otpRequest.count({
    where: { phone, createdAt: { gte: phoneWindowStart } },
  });
  if (phoneCount >= PHONE_RATE_LIMIT_MAX) {
    throw new RateLimitedError("Too many codes requested for this number. Try again later.");
  }

  // Per-IP rate limit — protects against one client hammering many numbers.
  if (requestIp) {
    const ipWindowStart = new Date(now.getTime() - IP_RATE_LIMIT_WINDOW_MS);
    const ipCount = await prisma.otpRequest.count({
      where: { requestIp, createdAt: { gte: ipWindowStart } },
    });
    if (ipCount >= IP_RATE_LIMIT_MAX) {
      throw new RateLimitedError("Too many requests from this network. Try again later.");
    }
  }

  // Invalidate any still-active OTP for this phone before issuing a new one.
  await prisma.otpRequest.updateMany({
    where: { phone, consumedAt: null },
    data: { consumedAt: now },
  });

  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = await bcrypt.hash(otp, 10);

  await prisma.otpRequest.create({
    data: {
      phone,
      otpHash,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      requestIp: requestIp ?? undefined,
    },
  });

  // Never log the OTP itself — only the outcome of the send attempt.
  try {
    await sendWhatsAppOtp(phone, otp);
  } catch (e) {
    if (e instanceof WhatsAppConfigError) {
      console.error("[otp] WhatsApp send skipped — missing config:", e.missing.join(", "));
    } else if (e instanceof WhatsAppDeliveryError) {
      console.error("[otp] WhatsApp delivery failed:", e.message);
    }
    throw e;
  }
}

/**
 * Verifies a submitted code against the most recent unconsumed OTP for the
 * phone. Increments the attempt counter on every failed check and locks the
 * OTP out after MAX_ATTEMPTS regardless of whether the final guess was
 * correct, preventing brute force. Consumes the OTP on success (no replay).
 */
export async function verifyAndConsumeOtp(phone: string, code: string): Promise<boolean> {
  const record = await prisma.otpRequest.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new NoActiveOtpError("No active code for this number — request a new one");
  }
  if (record.expiresAt < new Date()) {
    throw new OtpExpiredError("This code has expired — request a new one");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new TooManyAttemptsError("Too many incorrect attempts — request a new code");
  }

  const isMatch = await bcrypt.compare(code, record.otpHash);

  if (!isMatch) {
    await prisma.otpRequest.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new OtpInvalidError("Incorrect code");
  }

  // Consume immediately so the same code can never be replayed.
  await prisma.otpRequest.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return true;
}
