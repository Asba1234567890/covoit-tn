"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";
import VerificationBadge from "@/components/VerificationBadge";
import { buttonClasses } from "@/lib/ui";

interface Message {
  id: string;
  body: string;
  senderId: string;
  sender: { firstName: string };
  createdAt: string;
}

interface ConversationInfo {
  ride: { originLabel: string; destinationLabel: string; departureAt: string };
  otherParticipants: { id: string; firstName: string; verificationLevel: number }[];
}

const POLL_MS = 4000;

export default function ConversationThreadPage() {
  const currentUser = useRequireAuth();
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load this conversation");
      return;
    }
    setMessages(data.messages ?? []);
    setInfo(data.conversation ?? null);
  }

  useEffect(() => {
    if (!currentUser) return;
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send message");
      setText("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (!currentUser) {
    return <p className="px-4 py-6 text-sm text-ink-secondary">Loading…</p>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-6">
        <p className="text-sm text-error-dark">{error}</p>
        <Link href="/messages" className="mt-2 inline-block text-sm underline">
          Back to messages
        </Link>
      </main>
    );
  }

  const other = info?.otherParticipants[0];

  return (
    // 57px accounts for the top bar; the extra 64px on mobile matches the
    // parent layout's pb-16 reserved for the fixed bottom tab bar (Nav.tsx),
    // which sm:hidden removes above the sm breakpoint.
    <main className="mx-auto flex h-[calc(100vh-57px-64px)] max-w-md flex-col sm:h-[calc(100vh-57px)]">
      {/* Ride context stays pinned above the thread, never buried (spec §8). */}
      <div className="border-b border-neutral-200 px-4 py-2.5">
        <Link href="/messages" className="text-xs text-ink-secondary underline">
          ← All conversations
        </Link>
        {info && other && (
          <div className="mt-1 flex items-center gap-2">
            <p className="font-semibold text-ink">{other.firstName}</p>
            <VerificationBadge verificationLevel={other.verificationLevel} />
          </div>
        )}
        {info && (
          <p className="text-xs text-ink-secondary">
            {info.ride.originLabel} → {info.ride.destinationLabel} · {new Date(info.ride.departureAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="bg-accent/10 px-4 py-1.5 text-center text-xs font-medium text-accent-dark">
        Never pay or share personal contact outside Covoit
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="flex flex-col gap-2 py-3">
          {messages.map((m) => {
            const mine = m.senderId === currentUser.id;
            return (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine ? "self-end rounded-br-sm bg-primary text-white" : "self-start rounded-bl-sm bg-neutral-100 text-ink"
                }`}
              >
                {!mine && <p className="text-[10px] font-semibold opacity-70">{m.sender.firstName}</p>}
                <p>{m.body}</p>
              </div>
            );
          })}
          {messages.length === 0 && <p className="text-sm text-ink-secondary">No messages yet — say hello.</p>}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex gap-2 border-t border-neutral-200 px-4 py-2.5">
        <input
          className="flex-1 rounded-control border border-neutral-200 px-3 py-2 text-sm"
          placeholder="Message…"
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className={buttonClasses("primary", "px-4 py-2")} disabled={sending || !text.trim()} onClick={send}>
          Send
        </button>
      </div>
    </main>
  );
}
