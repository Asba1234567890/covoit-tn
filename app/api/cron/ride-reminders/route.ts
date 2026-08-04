import { NextRequest, NextResponse } from "next/server";
import { runRideReminderSweep } from "@/server/notifications/reminderService";

export const dynamic = "force-dynamic";

// Daily backstop only (Vercel Hobby plan allows once-daily cron schedules).
// The primary reminder trigger is the app-triggered sweep in
// app/api/auth/me, which runs far more often; this just catches rides where
// nobody opened the app before departure.
export async function GET(req: NextRequest) {
  // Vercel Cron requests carry this header automatically. Also accept a
  // manually-configured CRON_SECRET bearer token as a fallback so this
  // can't be triggered by an outsider hitting the URL directly.
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  const authHeader = req.headers.get("authorization");
  const hasValidSecret = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const ridesReminded = await runRideReminderSweep();

  return NextResponse.json({ ridesReminded });
}
