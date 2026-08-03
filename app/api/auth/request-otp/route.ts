import { NextRequest, NextResponse } from "next/server";
import {
  requestOtp,
  InvalidPhoneFormatError,
  ResendCooldownError,
  RateLimitedError,
} from "@/server/auth/otpService";
import { WhatsAppConfigError, WhatsAppDeliveryError } from "@/server/whatsapp/whatsappClient";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone } = body;
  if (!phone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });

  const ip = getClientIp(req);

  try {
    await requestOtp(phone, ip);
    // Generic success response regardless of whether this phone already has
    // an account — prevents user enumeration via this endpoint.
    return NextResponse.json({ sent: true });
  } catch (e) {
    if (e instanceof InvalidPhoneFormatError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof ResendCooldownError) {
      return NextResponse.json({ error: e.message, secondsRemaining: e.secondsRemaining }, { status: 429 });
    }
    if (e instanceof RateLimitedError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    if (e instanceof WhatsAppConfigError) {
      // The OTP row was already stored — the operator just hasn't wired up
      // Meta credentials yet. Surface a clear, non-leaky message.
      return NextResponse.json(
        { error: "WhatsApp delivery is not configured on this server yet. Contact support." },
        { status: 503 }
      );
    }
    if (e instanceof WhatsAppDeliveryError) {
      return NextResponse.json(
        { error: "We couldn't send the WhatsApp message. Please try again shortly." },
        { status: 502 }
      );
    }
    throw e;
  }
}
