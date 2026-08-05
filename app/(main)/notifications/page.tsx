"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";
import EmptyState from "@/components/EmptyState";

interface Notification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

type Tone = "success" | "primary" | "warning" | "error" | "neutral";

const DOT_CLASSES: Record<Tone, string> = {
  success: "bg-success",
  primary: "bg-primary",
  warning: "bg-warning",
  error: "bg-error",
  neutral: "bg-neutral-300",
};

function describe(n: Notification): { title: string; subtitle: string; href: string; tone: Tone } {
  const p = n.payload;
  const when = new Date(n.createdAt).toLocaleString();
  switch (n.type) {
    case "BOOKING_REQUESTED":
      return { title: "Booking request", subtitle: `A passenger requested to book your ride — ${when}`, href: "/my-rides", tone: "primary" };
    case "BOOKING_ACCEPTED":
      return { title: "Booking confirmed", subtitle: `Your booking was accepted — ${when}`, href: "/my-bookings", tone: "success" };
    case "BOOKING_DECLINED":
      return { title: "Booking declined", subtitle: `Your booking was declined — ${when}`, href: "/my-bookings", tone: "error" };
    case "BOOKING_CANCELLED":
      return { title: "Booking cancelled", subtitle: `A booking was cancelled — ${when}`, href: "/my-bookings", tone: "error" };
    case "RIDE_CANCELLED":
      return { title: "Ride cancelled", subtitle: `A ride you booked was cancelled by the driver — ${when}`, href: "/my-bookings", tone: "error" };
    case "RIDE_REMINDER":
      return { title: "Ride reminder", subtitle: `Your ride departs soon — ${when}`, href: p.rideId ? `/rides/${p.rideId}` : "/my-bookings", tone: "warning" };
    case "TRIP_COMPLETED":
      return { title: "Trip completed", subtitle: `A trip was marked completed — ${when}`, href: "/my-bookings", tone: "success" };
    case "REVIEW_AVAILABLE":
      return { title: "Review available", subtitle: `You can now leave a review — ${when}`, href: "/my-bookings", tone: "success" };
    case "DRIVER_VERIFICATION_RESULT":
      return { title: "Verification update", subtitle: `Your verification status was updated — ${when}`, href: "/profile", tone: "primary" };
    case "NEW_MESSAGE":
      return { title: "New message", subtitle: `You have a new message — ${when}`, href: p.conversationId ? `/messages/${p.conversationId}` : "/messages", tone: "primary" };
    default:
      return { title: n.type, subtitle: when, href: "/", tone: "neutral" };
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
    return <p className="px-4 py-6 text-sm text-ink-secondary">Loading…</p>;
  }

  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-ink">Notifications</h1>
        {hasUnread && (
          <button className="text-sm font-semibold text-primary disabled:opacity-50" onClick={markAll} disabled={busy}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState message="No notifications yet." />
      ) : (
        <div className="divide-y divide-neutral-100 rounded-card bg-white shadow-card">
          {notifications.map((n) => {
            const { title, subtitle, href, tone } = describe(n);
            return (
              <Link
                key={n.id}
                href={href}
                onClick={() => !n.readAt && markRead(n.id)}
                className={`flex items-start gap-2.5 px-4 py-3 text-sm hover:bg-neutral-50 ${!n.readAt ? "bg-primary/5" : ""}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-neutral-200" : DOT_CLASSES[tone]}`} aria-hidden />
                <div>
                  <p className={`font-semibold text-ink ${n.readAt ? "font-medium" : ""}`}>{title}</p>
                  <p className="text-xs text-ink-secondary">{subtitle}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
