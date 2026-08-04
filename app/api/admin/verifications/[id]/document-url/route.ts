import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/server/admin/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { prisma } from "@/server/db/prisma";

const BUCKET = "verification-documents";
const SIGNED_URL_TTL_SECONDS = 5 * 60;

// The bucket is private (unlike profile/vehicle photos), so viewing a
// submitted document always goes through this admin-gated, short-lived
// signed URL rather than a public link.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const verification = await prisma.verification.findUnique({ where: { id: params.id } });
  if (!verification) return NextResponse.json({ error: "Verification record not found" }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(verification.documentUrl, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    return NextResponse.json({ error: `Could not generate document URL: ${error?.message}` }, { status: 502 });
  }

  return NextResponse.json({ url: data.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS });
}
