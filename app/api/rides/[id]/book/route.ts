import { NextRequest, NextResponse } from "next/server";
import { createBooking, InsufficientSeatsError, RideNotBookableError, DuplicateBookingError } from "@/server/bookings/bookingService";
import { getSessionUser } from "@/server/auth/session";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const seatsRequested = Number(body.seats ?? 1);

  try {
    const booking = await createBooking({
      rideId: params.id,
      passengerId: user.id,
      seatsRequested,
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (e) {
    if (e instanceof InsufficientSeatsError) {
      return NextResponse.json({ error: "Not enough seats left" }, { status: 409 });
    }
    if (e instanceof RideNotBookableError) {
      return NextResponse.json({ error: "Ride is no longer bookable" }, { status: 409 });
    }
    if (e instanceof DuplicateBookingError) {
      return NextResponse.json({ error: "You already have an active booking on this ride" }, { status: 409 });
    }
    throw e;
  }
}
