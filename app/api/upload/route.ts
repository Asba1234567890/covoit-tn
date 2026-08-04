import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getSupabaseAdmin, StorageNotConfiguredError } from "@/lib/supabaseAdmin";
import { prisma } from "@/server/db/prisma";

const MAX_BYTES = 5 * 1024 * 1024; // must match the bucket's file_size_limit
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const BUCKETS: Record<string, string> = {
  profile: "profile-photos",
  vehicle: "vehicle-photos",
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  const vehicleId = form?.get("vehicleId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof kind !== "string" || !BUCKETS[kind]) {
    return NextResponse.json({ error: "kind must be 'profile' or 'vehicle'" }, { status: 400 });
  }
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
  }

  // A vehicle photo must belong to a vehicle the caller actually owns —
  // never trust a client-supplied vehicleId without checking (spec §51 pattern
  // already used for ride/vehicle ownership elsewhere in this app).
  let objectPath: string;
  if (kind === "vehicle") {
    if (typeof vehicleId !== "string" || !vehicleId) {
      return NextResponse.json({ error: "vehicleId is required for vehicle photos" }, { status: 400 });
    }
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId: user.id } });
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found for this account" }, { status: 404 });
    }
    objectPath = `${vehicleId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  } else {
    objectPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  }

  const bucket = BUCKETS[kind];
  const bytes = new Uint8Array(await file.arrayBuffer());

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        { error: "Photo upload is not configured on this server yet. Contact support." },
        { status: 503 }
      );
    }
    throw e;
  }

  const { error } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 502 });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return NextResponse.json({ url: data.publicUrl });
}
