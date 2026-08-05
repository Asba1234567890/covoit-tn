import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReportForm from "@/components/ReportForm";
import BlockButton from "@/components/BlockButton";

async function getPassenger(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

// Passenger rating has no denormalized DriverProfile-style column — there's
// no "search for passengers" feature that needs it indexed/sortable, so it's
// computed on read here instead of adding a migration + a value to keep in
// sync (mirrors what recomputeDriverRating does, just not persisted).
async function getPassengerStats(id: string) {
  const [reviews, reviewCount, completedRides, ratingAgg] = await Promise.all([
    prisma.review.findMany({
      where: { subjectId: id, moderationStatus: "APPROVED" },
      include: { author: { select: { firstName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.review.count({ where: { subjectId: id, moderationStatus: "APPROVED" } }),
    prisma.booking.count({ where: { passengerId: id, status: "COMPLETED" } }),
    prisma.review.aggregate({ where: { subjectId: id, moderationStatus: "APPROVED" }, _avg: { stars: true } }),
  ]);
  return { reviews, reviewCount, completedRides, rating: ratingAgg._avg.stars ?? 0 };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const passenger = await getPassenger(params.id);
  if (!passenger) return { title: "Profile not found — Covoit TN" };
  return { title: `${passenger.firstName} — Covoit TN` };
}

export default async function PassengerProfilePage({ params }: { params: { id: string } }) {
  const passenger = await getPassenger(params.id);
  if (!passenger) notFound();

  const { reviews, reviewCount, completedRides, rating } = await getPassengerStats(passenger.id);
  const isTrusted = completedRides >= 10 && rating >= 4.5;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <section className="rounded-card bg-white p-5 text-center shadow-card">
        {passenger.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={passenger.profilePhotoUrl} alt="" width={56} height={56} loading="lazy" className="mx-auto h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold text-ink-secondary">
            {passenger.firstName[0]?.toUpperCase()}
          </div>
        )}
        <p className="mt-2 font-display font-bold text-ink">{passenger.firstName}</p>
        {isTrusted && <p className="mt-1 text-xs font-semibold text-accent-dark">Trusted passenger</p>}
        {passenger.bio && <p className="mt-3 text-sm text-ink-secondary">{passenger.bio}</p>}
      </section>

      <section className="mt-3 flex divide-x divide-neutral-200 rounded-card bg-white text-center shadow-card">
        <div className="flex-1 py-3">
          <p className="font-display font-bold text-ink">{rating > 0 ? rating.toFixed(1) : "New"} ★</p>
          <p className="text-xs text-ink-secondary">
            {reviewCount} review{reviewCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex-1 py-3">
          <p className="font-display font-bold text-ink">{completedRides}</p>
          <p className="text-xs text-ink-secondary">Rides</p>
        </div>
        <div className="flex-1 py-3">
          <p className="font-display font-bold text-ink">{new Date(passenger.memberSince).getFullYear()}</p>
          <p className="text-xs text-ink-secondary">Member since</p>
        </div>
      </section>

      <section className="mt-5">
        <p className="mb-2 text-sm font-semibold text-ink">Reviews from drivers {reviewCount > 0 && `(${reviewCount})`}</p>
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
        <ReportForm reportedUserId={passenger.id} />
        <BlockButton userId={passenger.id} />
      </div>
    </main>
  );
}
