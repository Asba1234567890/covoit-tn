"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";

interface ConversationRow {
  id: string;
  ride: { originLabel: string; destinationLabel: string; departureAt: string };
  participants: { user: { id: string; firstName: string } }[];
  messages: { body: string; createdAt: string }[];
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>}>
      <MessagesPageInner />
    </Suspense>
  );
}

function MessagesPageInner() {
  const currentUser = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rideId = searchParams.get("rideId");
  const passengerId = searchParams.get("passengerId");
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    if (rideId) {
      // Entry point from "Message driver/passenger" — find or create the
      // conversation for this ride (+ passenger, when the driver initiates),
      // then jump straight into the thread.
      fetch("/api/conversations", { method: "POST", body: JSON.stringify({ rideId, passengerId }) })
        .then((r) => r.json())
        .then((d) => {
          if (d.conversation) {
            router.replace(`/messages/${d.conversation.id}`);
          } else {
            setError(d.error ?? "Could not open this conversation");
          }
        });
      return;
    }

    fetch("/api/conversations")
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []));
  }, [currentUser, rideId, passengerId, router]);

  if (!currentUser || (rideId && !error)) {
    return <p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Messages</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {(conversations ?? []).map((c) => {
          const other = c.participants.find((p) => p.user.id !== currentUser.id)?.user;
          const lastMessage = c.messages[0];
          return (
            <Link key={c.id} href={`/messages/${c.id}`} className="rounded-xl border p-4 hover:bg-neutral-50">
              <div className="flex items-center justify-between">
                <p className="font-medium">{other?.firstName ?? "Conversation"}</p>
                <span className="text-xs text-neutral-500">
                  {c.ride.originLabel} → {c.ride.destinationLabel}
                </span>
              </div>
              {lastMessage ? (
                <p className="mt-1 truncate text-sm text-neutral-600">{lastMessage.body}</p>
              ) : (
                <p className="mt-1 text-sm text-neutral-400">No messages yet</p>
              )}
            </Link>
          );
        })}
        {conversations && conversations.length === 0 && (
          <p className="text-sm text-neutral-500">No conversations yet. Book a ride or accept a booking to start chatting.</p>
        )}
      </div>
    </main>
  );
}
