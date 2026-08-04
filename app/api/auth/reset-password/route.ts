import { NextRequest, NextResponse } from "next/server";
import {
  resetPasswordWithOtp,
  WeakPasswordError,
  NoAccountForPhoneError,
} from "@/server/auth/password";
import {
  NoActiveOtpError,
  OtpExpiredError,
  OtpInvalidError,
  TooManyAttemptsError,
} from "@/server/auth/otpService";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, code, newPassword } = body;
  if (!phone || !code || !newPassword) {
    return NextResponse.json({ error: "Phone, code and newPassword are required" }, { status: 400 });
  }

  try {
    const { user, session } = await resetPasswordWithOtp({ phone, code, newPassword });
    const res = NextResponse.json({ user: { id: user.id, firstName: user.firstName } });
    res.cookies.set("session_id", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return res;
  } catch (e) {
    if (e instanceof WeakPasswordError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof NoAccountForPhoneError) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof NoActiveOtpError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof OtpExpiredError) return NextResponse.json({ error: e.message }, { status: 410 });
    if (e instanceof TooManyAttemptsError) return NextResponse.json({ error: e.message }, { status: 429 });
    if (e instanceof OtpInvalidError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
