import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma } from "./mocks/prisma";

const mockPrisma = vi.hoisted(() => ({ current: null as any }));

vi.mock("@/server/db/prisma", () => ({
  get prisma() {
    return mockPrisma.current;
  },
}));

import {
  isDocumentType,
  submitVerificationDocument,
  reviewVerificationDocument,
  VerificationNotFoundError,
} from "@/server/verification/verificationService";

describe("verificationService", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
  });

  it("isDocumentType only accepts the known set", () => {
    expect(isDocumentType("ID_CARD")).toBe(true);
    expect(isDocumentType("DRIVING_LICENSE")).toBe(true);
    expect(isDocumentType("PASSPORT_PHOTO")).toBe(false);
    expect(isDocumentType(123)).toBe(false);
  });

  it("submitVerificationDocument upserts on (userId, type) and resets review fields", async () => {
    prisma.verification.upsert.mockResolvedValue({ id: "v1" });

    await submitVerificationDocument("user_a", "ID_CARD", "user_a/ID_CARD/file.jpg");

    expect(prisma.verification.upsert).toHaveBeenCalledWith({
      where: { userId_type: { userId: "user_a", type: "ID_CARD" } },
      create: expect.objectContaining({ userId: "user_a", type: "ID_CARD", status: "PENDING" }),
      update: expect.objectContaining({
        documentUrl: "user_a/ID_CARD/file.jpg",
        status: "PENDING",
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      }),
    });
  });

  it("reviewVerificationDocument throws if the record doesn't exist", async () => {
    prisma.verification.findUnique.mockResolvedValue(null);

    await expect(
      reviewVerificationDocument({ verificationId: "missing", decision: "APPROVED", reviewerAdminId: "admin1" })
    ).rejects.toBeInstanceOf(VerificationNotFoundError);
    expect(prisma.verification.update).not.toHaveBeenCalled();
  });

  it("approving a DRIVING_LICENSE only raises verificationLevel, never lowers it", async () => {
    prisma.verification.findUnique.mockResolvedValue({ id: "v1", userId: "user_a", type: "DRIVING_LICENSE" });
    prisma.verification.update.mockResolvedValue({ id: "v1", userId: "user_a", type: "DRIVING_LICENSE", status: "APPROVED" });

    await reviewVerificationDocument({ verificationId: "v1", decision: "APPROVED", reviewerAdminId: "admin1" });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user_a", verificationLevel: { lt: 3 } },
      data: { verificationLevel: 3 },
    });
  });

  it("approving an ID_CARD raises to level 2, not 3", async () => {
    prisma.verification.findUnique.mockResolvedValue({ id: "v2", userId: "user_b", type: "ID_CARD" });
    prisma.verification.update.mockResolvedValue({ id: "v2", userId: "user_b", type: "ID_CARD", status: "APPROVED" });

    await reviewVerificationDocument({ verificationId: "v2", decision: "APPROVED", reviewerAdminId: "admin1" });

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user_b", verificationLevel: { lt: 2 } },
      data: { verificationLevel: 2 },
    });
  });

  it("rejecting does not touch verificationLevel and stores the reason", async () => {
    prisma.verification.findUnique.mockResolvedValue({ id: "v3", userId: "user_c", type: "ID_CARD" });
    prisma.verification.update.mockResolvedValue({ id: "v3", userId: "user_c", type: "ID_CARD", status: "REJECTED" });

    await reviewVerificationDocument({
      verificationId: "v3",
      decision: "REJECTED",
      reviewerAdminId: "admin1",
      rejectionReason: "Blurry photo",
    });

    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(prisma.verification.update).toHaveBeenCalledWith({
      where: { id: "v3" },
      data: expect.objectContaining({ status: "REJECTED", rejectionReason: "Blurry photo" }),
    });
  });
});
