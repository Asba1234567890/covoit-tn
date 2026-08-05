import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { notify } from "@/server/notifications/notificationService";
import { isBlocked } from "@/server/users/blockService";

async function assertParticipant(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return !!participant;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Prevent IDOR by guessing/incrementing conversation ids — only a listed
  // participant may read the thread.
  const isParticipant = await assertParticipant(params.id, user.id);
  if (!isParticipant) return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });

  const [messages, conversation] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: params.id },
      include: { sender: { select: { firstName: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        ride: { select: { originLabel: true, destinationLabel: true, departureAt: true } },
        participants: { include: { user: { select: { id: true, firstName: true, verificationLevel: true } } } },
      },
    }),
  ]);

  return NextResponse.json({
    messages,
    conversation: conversation
      ? {
          ride: conversation.ride,
          otherParticipants: conversation.participants
            .map((p) => p.user)
            .filter((u) => u.id !== user.id),
        }
      : null,
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const isParticipant = await assertParticipant(params.id, user.id);
  if (!isParticipant) return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const text = (body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Message is too long" }, { status: 400 });

  const otherParticipantIds = await prisma.conversationParticipant.findMany({
    where: { conversationId: params.id, userId: { not: user.id } },
    select: { userId: true },
  });
  for (const p of otherParticipantIds) {
    if (await isBlocked(user.id, p.userId)) {
      return NextResponse.json({ error: "You can't message this user" }, { status: 403 });
    }
  }

  const message = await prisma.message.create({
    data: { conversationId: params.id, senderId: user.id, body: text },
  });

  for (const p of otherParticipantIds) {
    await notify(p.userId, "NEW_MESSAGE", { conversationId: params.id, messageId: message.id });
  }

  return NextResponse.json({ message }, { status: 201 });
}
