import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { createOneTimeRide, createRecurringRide } from "@/server/rides/rideService";
import { prisma } from "@/server/db/prisma";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const {
    vehicleId,
    originCityId,
    destinationCityId,
    originLabel,
    originLat,
    originLng,
    destinationLabel,
    destinationLat,
    destinationLng,
    seats,
    pricePerSeat,
    luggageAllowed,
    smokingAllowed,
    petsAllowed,
    description,
    bookingMode,
    isRecurring,
    // one-time only:
    departureAt,
    // recurring only:
    daysOfWeek,
    departureTime,
  } = body;

  // Confirm the vehicle belongs to this driver — never trust client-side checks (spec §51).
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId: user.id } });
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found for this account" }, { status: 403 });
  }

  // Enforce driver verification server-side, not just by hiding the UI button.
  // verificationLevel 3 = admin-approved driver (set via /admin/users "Verify driver").
  if (user.verificationLevel < 3) {
    return NextResponse.json(
      { error: "Your driver account must be verified by an admin before you can publish rides" },
      { status: 403 }
    );
  }

  // Coordinates are required and must fall roughly within Tunisia — never
  // silently accept the placeholder (0,0) or otherwise nonsensical values.
  const TUNISIA_BOUNDS = { minLat: 30.0, maxLat: 37.6, minLng: 7.0, maxLng: 12.0 };
  const coordChecks: Array<[string, number, number]> = [
    ["Departure", Number(originLat), Number(originLng)],
    ["Destination", Number(destinationLat), Number(destinationLng)],
  ];
  for (const [label, lat, lng] of coordChecks) {
    const invalid =
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      (lat === 0 && lng === 0) ||
      lat < TUNISIA_BOUNDS.minLat ||
      lat > TUNISIA_BOUNDS.maxLat ||
      lng < TUNISIA_BOUNDS.minLng ||
      lng > TUNISIA_BOUNDS.maxLng;
    if (invalid) {
      return NextResponse.json({ error: `${label} location must be selected from the location picker` }, { status: 400 });
    }
  }

  const shared = {
    driverId: user.id,
    vehicleId,
    originCityId,
    destinationCityId,
    originLabel,
    originLat: Number(originLat),
    originLng: Number(originLng),
    destinationLabel,
    destinationLat: Number(destinationLat),
    destinationLng: Number(destinationLng),
    seatsTotal: Number(seats),
    pricePerSeat: Number(pricePerSeat),
    luggageAllowed,
    smokingAllowed,
    petsAllowed,
    description,
    bookingMode: bookingMode ?? "APPROVAL",
  };

  if (isRecurring) {
    if (!daysOfWeek?.length || !departureTime) {
      return NextResponse.json({ error: "daysOfWeek and departureTime are required for recurring rides" }, { status: 400 });
    }
    const result = await createRecurringRide({ ...shared, daysOfWeek, departureTime });
    return NextResponse.json(result, { status: 201 });
  }

  if (!departureAt) {
    return NextResponse.json({ error: "departureAt is required for a one-time ride" }, { status: 400 });
  }
  const ride = await createOneTimeRide({ ...shared, departureAt: new Date(departureAt) });
  return NextResponse.json({ ride }, { status: 201 });
}
