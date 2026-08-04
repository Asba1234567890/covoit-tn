import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { createVehicle, listVehiclesForUser } from "@/server/vehicles/vehicleService";
import { isHttpUrl } from "@/lib/validateUrl";

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
  const { make, model, year, color, licensePlate, seatsTotal, photoUrls } = body;

  if (!make || !model || !color || !licensePlate || !seatsTotal) {
    return NextResponse.json({ error: "Missing required vehicle fields" }, { status: 400 });
  }
  if (photoUrls !== undefined && (!Array.isArray(photoUrls) || !photoUrls.every((u: unknown) => typeof u === "string" && isHttpUrl(u)))) {
    return NextResponse.json({ error: "photoUrls must be an array of http(s) URLs" }, { status: 400 });
  }

  const vehicle = await createVehicle({
    userId: user.id,
    make,
    model,
    year: year ? Number(year) : undefined,
    color,
    licensePlate,
    seatsTotal: Number(seatsTotal),
    photoUrls,
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}
