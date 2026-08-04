import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isDocumentType, submitVerificationDocument, listVerificationsForUser } from "@/server/verification/verificationService";

const BUCKET = "verification-documents";
const MAX_BYTES = 5 * 1024 * 1024; // must match the bucket's file_size_limit
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const verifications = await listVerificationsForUser(user.id);
  return NextResponse.json({ verifications });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const type = form?.get("type");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!isDocumentType(type)) {
    return NextResponse.json(
      { error: "type must be one of ID_CARD, PASSPORT, DRIVING_LICENSE, VEHICLE_REGISTRATION" },
      { status: 400 }
    );
  }
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or PDF files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be 5MB or smaller" }, { status: 400 });
  }

  // Stored as the private object path, not a public URL — this bucket holds
  // ID documents, so viewing always goes through an admin-only signed URL
  // rather than a client-reachable link (unlike profile/vehicle photos).
  const objectPath = `${user.id}/${type}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 502 });
  }

  const verification = await submitVerificationDocument(user.id, type, objectPath);
  return NextResponse.json({ verification });
}
