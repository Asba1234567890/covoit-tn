import { prisma } from "@/server/db/prisma";

export const DOCUMENT_TYPES = ["ID_CARD", "PASSPORT", "DRIVING_LICENSE", "VEHICLE_REGISTRATION"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Which verification level a document type unlocks once approved — mirrors
// the existing "Verify identity" (level 2) / "Verify driver" (level 3)
// distinction already used by the blind admin actions on /admin/users.
const LEVEL_FOR_TYPE: Record<DocumentType, number> = {
  ID_CARD: 2,
  PASSPORT: 2,
  DRIVING_LICENSE: 3,
  VEHICLE_REGISTRATION: 3,
};

export class InvalidDocumentTypeError extends Error {}
export class VerificationNotFoundError extends Error {}

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value);
}

// One record per (user, type) — a resubmission overwrites the previous
// attempt and resets it back to PENDING rather than piling up history.
export async function submitVerificationDocument(userId: string, type: DocumentType, documentUrl: string) {
  return prisma.verification.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, documentUrl, status: "PENDING", submittedAt: new Date() },
    update: {
      documentUrl,
      status: "PENDING",
      submittedAt: new Date(),
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
    },
  });
}

export async function listVerificationsForUser(userId: string) {
  return prisma.verification.findMany({ where: { userId }, orderBy: { submittedAt: "desc" } });
}

export async function reviewVerificationDocument(params: {
  verificationId: string;
  decision: "APPROVED" | "REJECTED";
  reviewerAdminId: string;
  rejectionReason?: string;
}) {
  const { verificationId, decision, reviewerAdminId, rejectionReason } = params;

  const verification = await prisma.verification.findUnique({ where: { id: verificationId } });
  if (!verification) throw new VerificationNotFoundError("Verification record not found");
  if (!isDocumentType(verification.type)) throw new InvalidDocumentTypeError(`Unknown document type: ${verification.type}`);

  const updated = await prisma.verification.update({
    where: { id: verificationId },
    data: {
      status: decision,
      reviewedBy: reviewerAdminId,
      reviewedAt: new Date(),
      rejectionReason: decision === "REJECTED" ? (rejectionReason ?? null) : null,
    },
  });

  if (decision === "APPROVED") {
    const targetLevel = LEVEL_FOR_TYPE[verification.type];
    // Only ever raises the level — never downgrades someone who already
    // holds a higher level from an unrelated approval.
    await prisma.user.updateMany({
      where: { id: verification.userId, verificationLevel: { lt: targetLevel } },
      data: { verificationLevel: targetLevel },
    });
  }

  return updated;
}
