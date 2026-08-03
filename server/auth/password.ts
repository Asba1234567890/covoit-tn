import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { createSession } from "@/server/auth/otp";

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

export class WeakPasswordError extends Error {}
export class PhoneAlreadyRegisteredError extends Error {}
export class InvalidCredentialsError extends Error {}
export class NoPasswordSetError extends Error {}

export async function signUpWithPassword(params: {
  phone: string;
  password: string;
  firstName: string;
}) {
  if (params.password.length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const existing = await prisma.user.findUnique({ where: { phone: params.phone } });
  if (existing) {
    throw new PhoneAlreadyRegisteredError("An account with this phone number already exists");
  }

  const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      phone: params.phone,
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

export async function logInWithPassword(params: { phone: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { phone: params.phone } });
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
