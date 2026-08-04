import { prisma } from "@/server/db/prisma";

export type NotificationType =
  | "BOOKING_REQUESTED"
  | "BOOKING_ACCEPTED"
  | "BOOKING_DECLINED"
  | "BOOKING_CANCELLED"
  | "RIDE_CANCELLED"
  | "RIDE_REMINDER"
  | "TRIP_COMPLETED"
  | "REVIEW_AVAILABLE"
  | "DRIVER_VERIFICATION_RESULT"
  | "NEW_MESSAGE";

export type NotificationChannel = "in_app" | "push";

// Which channels each notification type should be delivered on. Everything
// is in_app-only today (no push provider is configured), but callers never
// need to know that — notify() below always takes just (userId, type,
// payload). Adding push for a given type later is a one-line change here
// plus a real implementation of dispatchPush; no call site changes.
const NOTIFICATION_CHANNELS: Record<NotificationType, NotificationChannel[]> = {
  BOOKING_REQUESTED: ["in_app"],
  BOOKING_ACCEPTED: ["in_app"],
  BOOKING_DECLINED: ["in_app"],
  BOOKING_CANCELLED: ["in_app"],
  RIDE_CANCELLED: ["in_app"],
  RIDE_REMINDER: ["in_app"],
  TRIP_COMPLETED: ["in_app"],
  REVIEW_AVAILABLE: ["in_app"],
  DRIVER_VERIFICATION_RESULT: ["in_app"],
  NEW_MESSAGE: ["in_app"],
};

async function dispatchInApp(userId: string, type: NotificationType, payload: Record<string, unknown>) {
  return prisma.notification.create({
    data: { userId, type, channel: "in_app", payload: payload as any },
  });
}

// Not wired to a real provider — no push credentials exist yet (would need
// device token registration + APNs/FCM or a web-push service). Left as an
// explicit no-op rather than a fake success so it's obvious this channel
// isn't actually delivering anything if it's ever added to the map above.
async function dispatchPush(userId: string, type: NotificationType, payload: Record<string, unknown>) {
  console.warn("[notify] push channel requested but not implemented", { userId, type });
}

export async function notify(userId: string, type: NotificationType, payload: Record<string, unknown>) {
  const channels = NOTIFICATION_CHANNELS[type];
  let inAppRow = null;

  for (const channel of channels) {
    try {
      if (channel === "in_app") {
        inAppRow = await dispatchInApp(userId, type, payload);
      } else if (channel === "push") {
        await dispatchPush(userId, type, payload);
      }
    } catch (e) {
      // Notifications are best-effort — a failure here must never roll back
      // or error out an otherwise-successful booking/ride/admin action.
      console.error("[notify] failed to dispatch notification", { userId, type, channel, error: (e as Error).message });
    }
  }

  return inAppRow;
}
