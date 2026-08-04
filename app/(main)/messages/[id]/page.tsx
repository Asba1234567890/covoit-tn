"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";

interface Message {
  id: string;
  body: string;
  senderId: string;
  sender: { firstName: string };
  createdAt: string;
}

interface ConversationInfo {
  ride: { originLabel: string; destinationLabel: string; departureAt: string };
  otherParticipants: { id: string; firstName: string }[];
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
    return <p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-6">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/messages" className="mt-2 inline-block text-sm underline">
          Back to messages
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-57px)] max-w-md flex-col px-4 py-4">
      <div className="mb-2 border-b pb-2">
        <Link href="/messages" className="text-xs text-neutral-500 underline">
          ← All conversations
        </Link>
        {info && (
          <>
            <p className="font-medium">{info.otherParticipants.map((p) => p.firstName).join(", ")}</p>
            <p className="text-xs text-neutral-500">
              {info.ride.originLabel} → {info.ride.destinationLabel} ·{" "}
              {new Date(info.ride.departureAt).toLocaleDateString()}
            </p>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 py-2">
          {messages.map((m) => {
            const mine = m.senderId === currentUser.id;
            return (
              <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${mine ? "self-end bg-black text-white" : "self-start bg-neutral-100"}`}>
                {!mine && <p className="text-[10px] font-medium opacity-70">{m.sender.firstName}</p>}
                <p>{m.body}</p>
              </div>
            );
          })}
          {messages.length === 0 && <p className="text-sm text-neutral-500">No messages yet — say hello.</p>}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-2 flex gap-2 border-t pt-2">
        <input
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          placeholder="Type a message…"
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50" disabled={sending || !text.trim()} onClick={send}>
          Send
        </button>
      </div>
    </main>
  );
}
