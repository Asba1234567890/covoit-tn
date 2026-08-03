import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { respondToBooking, NotAuthorizedError } from "@/server/bookings/bookingService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const decision = body.decision;
  if (!["ACCEPTED", "DECLINED"].includes(decision)) {
    return NextResponse.json({ error: "decision must be ACCEPTED or DECLINED" }, { status: 400 });
  }

  try {
    const booking = await respondToBooking(params.id, decision, user.id);
    return NextResponse.json({ booking });
  } catch (e) {
    if (e instanceof NotAuthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
