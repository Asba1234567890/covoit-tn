import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { blockUser, unblockUser, isBlocked, CannotBlockSelfError } from "@/server/users/blockService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const blocked = await isBlocked(user.id, params.id);
  return NextResponse.json({ blocked });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await blockUser(user.id, params.id);
    return NextResponse.json({ blocked: true });
  } catch (e) {
    if (e instanceof CannotBlockSelfError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await unblockUser(user.id, params.id);
  return NextResponse.json({ blocked: false });
}
