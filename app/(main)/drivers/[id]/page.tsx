import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VerificationBadge from "@/components/VerificationBadge";
import ReportForm from "@/components/ReportForm";
import BlockButton from "@/components/BlockButton";

async function getDriver(id: string) {
  return prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: {
      driverProfile: true,
      vehicles: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
    },
  });
}

async function getReviews(subjectId: string) {
  const [reviews, count] = await Promise.all([
    prisma.review.findMany({
      where: { subjectId, moderationStatus: "APPROVED" },
      include: { author: { select: { firstName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.review.count({ where: { subjectId, moderationStatus: "APPROVED" } }),
  ]);
  return { reviews, count };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const driver = await getDriver(params.id);
  if (!driver) return { title: "Profile not found — Covoit TN" };
  return { title: `${driver.firstName} — Covoit TN` };
}

export default async function DriverProfilePage({ params }: { params: { id: string } }) {
  const driver = await getDriver(params.id);
  if (!driver) notFound();

  const { reviews, count } = await getReviews(driver.id);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <section className="flex items-center gap-3 rounded-xl border p-4">
        {driver.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={driver.profilePhotoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-xl font-semibold">
            {driver.firstName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-medium">{driver.firstName}</p>
            <VerificationBadge verificationLevel={driver.verificationLevel} />
          </div>
          <p className="text-xs text-neutral-500">Member since {new Date(driver.memberSince).toLocaleDateString()}</p>
        </div>
      </section>

      {driver.bio && (
        <section className="mt-4 rounded-xl border p-4">
          <p className="text-sm text-neutral-700">{driver.bio}</p>
          {driver.languages.length > 0 && (
            <p className="mt-2 text-xs text-neutral-500">Speaks: {driver.languages.join(", ")}</p>
          )}
        </section>
      )}

      {driver.driverProfile && (
        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-neutral-500">Rating</p>
            <p className="text-sm font-medium">
              ⭐ {driver.driverProfile.rating > 0 ? driver.driverProfile.rating.toFixed(1) : "New"} ({count} review
              {count === 1 ? "" : "s"})
            </p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-neutral-500">Completed rides</p>
            <p className="text-sm font-medium">{driver.driverProfile.completedRidesCount}</p>
          </div>
        </section>
      )}

      {driver.vehicles.length > 0 && (
        <section className="mt-4 rounded-xl border p-4">
          <p className="font-medium">Vehicle{driver.vehicles.length > 1 ? "s" : ""}</p>
          <div className="mt-1 flex flex-col gap-1">
            {driver.vehicles.map((v) => (
              <p key={v.id} className="text-sm text-neutral-600">
                {v.color} {v.make} {v.model} {v.year ? `(${v.year})` : ""}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4">
        <p className="mb-2 font-medium">Reviews</p>
        <div className="flex flex-col gap-2">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border p-3">
              <p className="text-sm font-medium">
                {"⭐".repeat(r.stars)} <span className="font-normal text-neutral-500">— {r.author.firstName}</span>
              </p>
              {r.comment && <p className="mt-1 text-sm text-neutral-700">{r.comment}</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-neutral-500">No reviews yet.</p>}
        </div>
      </section>

      <div className="mt-4 flex items-center gap-3">
        <ReportForm reportedUserId={driver.id} />
        <BlockButton userId={driver.id} />
      </div>
    </main>
  );
}
