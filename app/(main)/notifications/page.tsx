"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";

interface Notification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

function describe(n: Notification): { text: string; href: string } {
  const p = n.payload;
  switch (n.type) {
    case "BOOKING_REQUESTED":
      return { text: "A passenger requested to book your ride.", href: "/my-rides" };
    case "BOOKING_ACCEPTED":
      return { text: "Your booking was accepted.", href: "/my-bookings" };
    case "BOOKING_DECLINED":
      return { text: "Your booking was declined.", href: "/my-bookings" };
    case "BOOKING_CANCELLED":
      return { text: "A booking was cancelled.", href: "/my-bookings" };
    case "RIDE_CANCELLED":
      return { text: "A ride you booked was cancelled by the driver.", href: "/my-bookings" };
    case "RIDE_REMINDER":
      return {
        text: "Your ride departs soon.",
        href: p.rideId ? `/rides/${p.rideId}` : "/my-bookings",
      };
    case "TRIP_COMPLETED":
      return { text: "A trip was marked completed.", href: "/my-bookings" };
    case "REVIEW_AVAILABLE":
      return { text: "You can now leave a review for a completed trip.", href: "/my-bookings" };
    case "DRIVER_VERIFICATION_RESULT":
      return { text: "Your verification status was updated.", href: "/profile" };
    case "NEW_MESSAGE":
      return {
        text: "You have a new message.",
        href: p.conversationId ? `/messages/${p.conversationId}` : "/messages",
      };
    default:
      return { text: n.type, href: "/" };
  }
}

export default function NotificationsPage() {
  const currentUser = useRequireAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []));
  }

  useEffect(() => {
    if (!currentUser) return;
    load();
  }, [currentUser]);

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "POST", body: JSON.stringify({ notificationId: id }) });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  }

  async function markAll() {
    setBusy(true);
    try {
      await fetch("/api/notifications", { method: "POST", body: JSON.stringify({ markAll: true }) });
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!currentUser) {
    return <p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>;
  }

  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {hasUnread && (
          <button className="text-sm underline disabled:opacity-50" onClick={markAll} disabled={busy}>
            Mark all read
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {notifications.map((n) => {
          const { text, href } = describe(n);
          return (
            <Link
              key={n.id}
              href={href}
              onClick={() => !n.readAt && markRead(n.id)}
              className={`rounded-xl border p-3 text-sm hover:bg-neutral-50 ${!n.readAt ? "border-black bg-neutral-50 font-medium" : "text-neutral-600"}`}
            >
              <p>{text}</p>
              <p className="mt-1 text-xs text-neutral-400">{new Date(n.createdAt).toLocaleString()}</p>
            </Link>
          );
        })}
        {notifications.length === 0 && <p className="text-sm text-neutral-500">No notifications yet.</p>}
      </div>
    </main>
  );
}
