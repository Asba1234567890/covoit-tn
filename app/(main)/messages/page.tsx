"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";
import EmptyState from "@/components/EmptyState";

interface ConversationRow {
  id: string;
  ride: { originLabel: string; destinationLabel: string; departureAt: string };
  participants: { user: { id: string; firstName: string } }[];
  messages: { body: string; createdAt: string }[];
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-ink-secondary">Loading…</p>}>
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
    return <p className="px-4 py-6 text-sm text-ink-secondary">Loading…</p>;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 font-display text-lg font-bold text-ink">Messages</h1>
      {error && <p className="mb-3 text-sm text-error-dark">{error}</p>}

      <div className="flex flex-col gap-2">
        {(conversations ?? []).map((c) => {
          const other = c.participants.find((p) => p.user.id !== currentUser.id)?.user;
          const lastMessage = c.messages[0];
          return (
            <Link key={c.id} href={`/messages/${c.id}`} className="rounded-card bg-white p-3.5 shadow-card transition-colors hover:bg-neutral-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-200" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-ink">{other?.firstName ?? "Conversation"}</p>
                    <span className="shrink-0 text-xs text-ink-secondary">
                      {c.ride.originLabel} → {c.ride.destinationLabel}
                    </span>
                  </div>
                  {lastMessage ? (
                    <p className="truncate text-sm text-ink-secondary">{lastMessage.body}</p>
                  ) : (
                    <p className="text-sm text-ink-secondary/70">No messages yet</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
        {conversations && conversations.length === 0 && (
          <EmptyState message="No conversations yet. Book a ride or accept a booking to start chatting." />
        )}
      </div>
    </main>
  );
}
