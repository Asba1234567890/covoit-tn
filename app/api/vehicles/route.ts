import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { createVehicle, listVehiclesForUser } from "@/server/vehicles/vehicleService";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const vehicles = await listVehiclesForUser(user.id);
  return NextResponse.json({ vehicles });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { make, model, color, licensePlate, seatsTotal } = body;

  if (!make || !model || !color || !licensePlate || !seatsTotal) {
    return NextResponse.json({ error: "Missing required vehicle fields" }, { status: 400 });
  }

  const vehicle = await createVehicle({
    userId: user.id,
    make,
    model,
    color,
    licensePlate,
    seatsTotal: Number(seatsTotal),
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}
