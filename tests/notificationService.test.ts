import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma } from "./mocks/prisma";

const mockPrisma = vi.hoisted(() => ({ current: null as any }));

vi.mock("@/server/db/prisma", () => ({
  get prisma() {
    return mockPrisma.current;
  },
}));

import { notify } from "@/server/notifications/notificationService";

describe("notify", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
  });

  it("writes an in_app row for a known notification type", async () => {
    prisma.notification.create.mockResolvedValue({ id: "n1" });

    await notify("user_1", "RIDE_REMINDER", { rideId: "ride_1" });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { userId: "user_1", type: "RIDE_REMINDER", channel: "in_app", payload: { rideId: "ride_1" } },
    });
  });

  it("never throws when the DB write fails — notifications are best-effort", async () => {
    prisma.notification.create.mockRejectedValue(new Error("db down"));

    await expect(notify("user_1", "BOOKING_REQUESTED", {})).resolves.toBeNull();
  });
});
