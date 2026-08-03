import { prisma } from "@/server/db/prisma";

export type NotificationType =
  | "BOOKING_REQUESTED"
  | "BOOKING_ACCEPTED"
  | "BOOKING_DECLINED"
  | "BOOKING_CANCELLED"
  | "RIDE_CANCELLED"
  | "TRIP_COMPLETED"
  | "REVIEW_AVAILABLE"
  | "DRIVER_VERIFICATION_RESULT"
  | "NEW_MESSAGE";

export async function notify(userId: string, type: NotificationType, payload: Record<string, unknown>) {
  try {
    return await prisma.notification.create({
      data: { userId, type, channel: "in_app", payload: payload as any },
    });
  } catch (e) {
    // Notifications are best-effort — a failure here must never roll back
    // or error out an otherwise-successful booking/ride/admin action.
    console.error("[notify] failed to create notification", { userId, type, error: (e as Error).message });
    return null;
  }
}
