import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { updateVehicle, deleteVehicle, setDefaultVehicle, VehicleNotFoundError } from "@/server/vehicles/vehicleService";
import { isHttpUrl } from "@/lib/validateUrl";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { make, model, year, color, licensePlate, seatsTotal, photoUrls, setDefault } = body;

  if (photoUrls !== undefined && (!Array.isArray(photoUrls) || !photoUrls.every((u: unknown) => typeof u === "string" && isHttpUrl(u)))) {
    return NextResponse.json({ error: "photoUrls must be an array of http(s) URLs" }, { status: 400 });
  }

  try {
    if (setDefault) {
      await setDefaultVehicle(params.id, user.id);
    }

    const data: Record<string, unknown> = {};
    if (make !== undefined) data.make = make;
    if (model !== undefined) data.model = model;
    if (year !== undefined) data.year = year ? Number(year) : null;
    if (color !== undefined) data.color = color;
    if (licensePlate !== undefined) data.licensePlate = licensePlate;
    if (seatsTotal !== undefined) data.seatsTotal = Number(seatsTotal);
    if (photoUrls !== undefined) data.photoUrls = photoUrls;

    const vehicle = Object.keys(data).length > 0 ? await updateVehicle(params.id, user.id, data) : null;
    return NextResponse.json({ vehicle: vehicle ?? { id: params.id } });
  } catch (e) {
    if (e instanceof VehicleNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await deleteVehicle(params.id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof VehicleNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
