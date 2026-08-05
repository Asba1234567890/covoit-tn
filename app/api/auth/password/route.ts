import { NextRequest, NextResponse } from "next/server";
import {
  signUpWithPassword,
  logInWithPassword,
  WeakPasswordError,
  PhoneAlreadyRegisteredError,
  InvalidCredentialsError,
  NoPasswordSetError,
  InvalidPhoneFormatError,
} from "@/server/auth/password";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, phone, password, firstName } = body;

  if (!phone || !password) {
    return NextResponse.json({ error: "Phone and password are required" }, { status: 400 });
  }

  try {
    if (action === "signup") {
      if (!firstName) {
        return NextResponse.json({ error: "First name is required" }, { status: 400 });
      }
      const { user, session } = await signUpWithPassword({ phone, password, firstName });
      const res = NextResponse.json({ user }, { status: 201 });
      res.cookies.set("session_id", session.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
      return res;
    }

    if (action === "login") {
      const { user, session } = await logInWithPassword({ phone, password });
      const res = NextResponse.json({ user });
      res.cookies.set("session_id", session.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
      return res;
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof InvalidPhoneFormatError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof WeakPasswordError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof PhoneAlreadyRegisteredError) return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof InvalidCredentialsError) return NextResponse.json({ error: e.message }, { status: 401 });
    if (e instanceof NoPasswordSetError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
