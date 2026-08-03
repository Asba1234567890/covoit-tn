import { NextRequest, NextResponse } from "next/server";
import {
  verifyAndConsumeOtp,
  NoActiveOtpError,
  OtpExpiredError,
  OtpInvalidError,
  TooManyAttemptsError,
} from "@/server/auth/otpService";
import { findOrCreateUserByPhone, createSession } from "@/server/auth/otp";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, code, firstName } = body;
  if (!phone || !code) {
    return NextResponse.json({ error: "Phone number and code are required" }, { status: 400 });
  }

  try {
    await verifyAndConsumeOtp(phone, code);
  } catch (e) {
    if (e instanceof NoActiveOtpError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof OtpExpiredError) return NextResponse.json({ error: e.message }, { status: 410 });
    if (e instanceof TooManyAttemptsError) return NextResponse.json({ error: e.message }, { status: 429 });
    if (e instanceof OtpInvalidError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }

  const user = await findOrCreateUserByPhone(phone, firstName);
  const session = await createSession(user.id, req.headers.get("user-agent") ?? undefined);

  const res = NextResponse.json({ user: { id: user.id, firstName: user.firstName, phone: user.phone } });
  res.cookies.set("session_id", session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return res;
}
