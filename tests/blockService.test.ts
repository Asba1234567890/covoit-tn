import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma } from "./mocks/prisma";

const mockPrisma = vi.hoisted(() => ({ current: null as any }));

vi.mock("@/server/db/prisma", () => ({
  get prisma() {
    return mockPrisma.current;
  },
}));

import { isBlocked, blockUser, unblockUser, getBlockedIds, CannotBlockSelfError } from "@/server/users/blockService";

describe("blockService", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
  });

  it("isBlocked checks both directions", async () => {
    prisma.blockedUser.findFirst.mockResolvedValue({ id: "b1" });

    const result = await isBlocked("user_a", "user_b");

    expect(result).toBe(true);
    expect(prisma.blockedUser.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { blockerId: "user_a", blockedId: "user_b" },
          { blockerId: "user_b", blockedId: "user_a" },
        ],
      },
    });
  });

  it("blockUser rejects blocking yourself", async () => {
    await expect(blockUser("user_a", "user_a")).rejects.toBeInstanceOf(CannotBlockSelfError);
    expect(prisma.blockedUser.upsert).not.toHaveBeenCalled();
  });

  it("blockUser upserts so it's idempotent", async () => {
    prisma.blockedUser.upsert.mockResolvedValue({ id: "b1" });

    await blockUser("user_a", "user_b");

    expect(prisma.blockedUser.upsert).toHaveBeenCalledWith({
      where: { blockerId_blockedId: { blockerId: "user_a", blockedId: "user_b" } },
      update: {},
      create: { blockerId: "user_a", blockedId: "user_b" },
    });
  });

  it("unblockUser removes only the blocker's own block row", async () => {
    await unblockUser("user_a", "user_b");

    expect(prisma.blockedUser.deleteMany).toHaveBeenCalledWith({
      where: { blockerId: "user_a", blockedId: "user_b" },
    });
  });

  it("getBlockedIds returns the flat list of blocked user ids", async () => {
    prisma.blockedUser.findMany.mockResolvedValue([{ blockedId: "user_b" }, { blockedId: "user_c" }]);

    const ids = await getBlockedIds("user_a");

    expect(ids).toEqual(["user_b", "user_c"]);
  });
});
