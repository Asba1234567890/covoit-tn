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
      {/* Verification, stats, and vehicle grouped as one trustworthy block
          above reviews (design spec §7). */}
      <section className="rounded-card bg-white p-5 text-center shadow-card">
        {driver.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={driver.profilePhotoUrl} alt="" width={56} height={56} loading="lazy" className="mx-auto h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold text-ink-secondary">
            {driver.firstName[0]?.toUpperCase()}
          </div>
        )}
        <p className="mt-2 font-display font-bold text-ink">{driver.firstName}</p>
        <div className="mt-1 flex justify-center">
          <VerificationBadge verificationLevel={driver.verificationLevel} />
        </div>
        {driver.bio && <p className="mt-3 text-sm text-ink-secondary">{driver.bio}</p>}
        {driver.languages.length > 0 && <p className="mt-1 text-xs text-ink-secondary">Speaks: {driver.languages.join(", ")}</p>}
      </section>

      {driver.driverProfile && (
        <section className="mt-3 flex divide-x divide-neutral-200 rounded-card bg-white text-center shadow-card">
          <div className="flex-1 py-3">
            <p className="font-display font-bold text-ink">{driver.driverProfile.rating > 0 ? driver.driverProfile.rating.toFixed(1) : "New"} ★</p>
            <p className="text-xs text-ink-secondary">
              {count} review{count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex-1 py-3">
            <p className="font-display font-bold text-ink">{driver.driverProfile.completedRidesCount}</p>
            <p className="text-xs text-ink-secondary">Rides</p>
          </div>
          <div className="flex-1 py-3">
            <p className="font-display font-bold text-ink">{new Date(driver.memberSince).getFullYear()}</p>
            <p className="text-xs text-ink-secondary">Member since</p>
          </div>
        </section>
      )}

      {driver.vehicles.length > 0 && (
        <section className="mt-3 rounded-card bg-white p-3.5 text-sm text-ink shadow-card">
          🚗 {driver.vehicles.map((v) => `${v.color} ${v.make} ${v.model}${v.year ? ` (${v.year})` : ""}`).join(" · ")}
        </section>
      )}

      <section className="mt-5">
        <p className="mb-2 text-sm font-semibold text-ink">
          Reviews {count > 0 && `(${count})`}
        </p>
        <div className="flex flex-col gap-2">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-card bg-white p-3 shadow-card">
              <p className="text-sm font-semibold text-accent-dark">
                {"★".repeat(r.stars)} <span className="font-normal text-ink-secondary">— {r.author.firstName}</span>
              </p>
              {r.comment && <p className="mt-1 text-sm text-ink-secondary">{r.comment}</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-ink-secondary">No reviews yet.</p>}
        </div>
      </section>

      <div className="mt-4 flex items-center gap-3">
        <ReportForm reportedUserId={driver.id} />
        <BlockButton userId={driver.id} />
      </div>
    </main>
  );
}
