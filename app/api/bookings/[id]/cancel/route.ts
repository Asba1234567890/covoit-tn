import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { cancelBooking, NotAuthorizedError } from "@/server/bookings/bookingService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  try {
    const booking = await cancelBooking(params.id, user.id, body.reason);
    return NextResponse.json({ booking });
  } catch (e) {
    if (e instanceof NotAuthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
