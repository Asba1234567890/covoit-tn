import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { createSession } from "@/server/auth/otp";
import { verifyAndConsumeOtp, isValidTunisianPhone, InvalidPhoneFormatError } from "@/server/auth/otpService";

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

export { InvalidPhoneFormatError };
export class WeakPasswordError extends Error {}
export class PhoneAlreadyRegisteredError extends Error {}
export class InvalidCredentialsError extends Error {}
export class NoPasswordSetError extends Error {}
export class NoAccountForPhoneError extends Error {}

// The OTP flow (server/auth/otpService.ts) validates phone format before
// ever touching the database. This password flow previously didn't, which
// let malformed phone numbers (e.g. missing a digit) get stored via signup
// — those accounts could then never use OTP login/reset (stricter format
// check there) and were a likely cause of confusing "wrong password"
// failures on login when the stored phone didn't match what a user retyped.
function normalizePhone(phone: string): string {
  return phone.trim();
}

export async function signUpWithPassword(params: {
  phone: string;
  password: string;
  firstName: string;
}) {
  const phone = normalizePhone(params.phone);
  if (!isValidTunisianPhone(phone)) {
    throw new InvalidPhoneFormatError("Enter a valid Tunisian phone number, e.g. +21620123456");
  }
  if (params.password.length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new PhoneAlreadyRegisteredError("An account with this phone number already exists");
  }

  const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      phone,
      firstName: params.firstName,
      passwordHash,
      // Password accounts skip phone verification at signup, unlike OTP accounts
      // which prove phone ownership by construction. This is a real trust
      // difference worth revisiting before public launch (spec §7).
      phoneVerified: false,
    },
  });

  const session = await createSession(user.id);
  return { user, session };
}

// Reuses the existing WhatsApp OTP infrastructure as the recovery path for a
// forgotten password, instead of standing up a separate email-based reset
// flow — this app has no email delivery configured, and phone is already
// the proven-ownership channel for every account.
export async function resetPasswordWithOtp(params: { phone: string; code: string; newPassword: string }) {
  if (params.newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  // Verify code ownership before revealing anything about the account —
  // OTP records aren't tied to whether a User exists, so checking the code
  // first means a wrong/missing code fails identically for registered and
  // unregistered numbers, and only a real code holder ever learns whether
  // an account exists.
  // Throws OtpExpiredError / OtpInvalidError / TooManyAttemptsError / NoActiveOtpError on failure.
  const phone = normalizePhone(params.phone);
  await verifyAndConsumeOtp(phone, params.code);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    throw new NoAccountForPhoneError("No account found for this phone number");
  }

  const passwordHash = await bcrypt.hash(params.newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, phoneVerified: true },
  });

  const session = await createSession(user.id);
  return { user, session };
}

export async function logInWithPassword(params: { phone: string; password: string }) {
  const phone = normalizePhone(params.phone);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    throw new InvalidCredentialsError("Incorrect phone number or password");
  }
  if (!user.passwordHash) {
    throw new NoPasswordSetError("This account was created with OTP sign-in — use OTP to log in, or set a password first");
  }

  const valid = await bcrypt.compare(params.password, user.passwordHash);
  if (!valid) {
    throw new InvalidCredentialsError("Incorrect phone number or password");
  }

  const session = await createSession(user.id);
  return { user, session };
}
