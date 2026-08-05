import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import BookRideButton from "@/components/BookRideButton";
import ReportForm from "@/components/ReportForm";
import BlockButton from "@/components/BlockButton";
import RouteMap from "@/components/RouteMapLoader";
import TrustCluster from "@/components/TrustCluster";
import { formatDistance, formatDuration } from "@/lib/formatRoute";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const ride = await getRide(params.id);
  if (!ride) return { title: "Ride not found — Covoit TN" };
  return {
    title: `${ride.originLabel} → ${ride.destinationLabel} — Covoit TN`,
    description: `Carpool from ${ride.originLabel} to ${ride.destinationLabel}, departing ${new Date(ride.departureAt).toLocaleString()}. ${ride.pricePerSeat} TND/seat.`,
  };
}

async function getRide(id: string) {
  return prisma.ride.findUnique({
    where: { id },
    include: {
      driver: { include: { driverProfile: true } },
      vehicle: true,
      waypoints: true,
    },
  });
}

export default async function RideDetailsPage({ params }: { params: { id: string } }) {
  const ride = await getRide(params.id);
  if (!ride) notFound();

  const maskedPlate = ride.vehicle.licensePlate.replace(/.(?=.{3})/g, "•");
  const tripDetails = [formatDistance(ride.distanceMeters), formatDuration(ride.durationSeconds)].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      {/* Price, seats, and route stay pinned at the top — everything else
          (vehicle, distance, description) is one disclosure away rather than
          pre-expanded (design spec §5 "strict hierarchy"). */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-lg font-bold text-ink">
          {ride.originLabel} → {ride.destinationLabel}
        </h1>
        <p className="shrink-0 font-display text-xl font-extrabold text-primary">{ride.pricePerSeat.toString()} TND</p>
      </div>
      <p className="mt-1 text-sm text-ink-secondary">
        {new Date(ride.departureAt).toLocaleString()} · {ride.seatsAvailable} seat{ride.seatsAvailable === 1 ? "" : "s"} available
      </p>

      <div className="mt-4">
        <RouteMap
          originLat={ride.originLat}
          originLng={ride.originLng}
          destinationLat={ride.destinationLat}
          destinationLng={ride.destinationLng}
          geometry={ride.routeGeometry as any}
        />
      </div>

      <Link href={`/drivers/${ride.driverId}`} className="mt-4 flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
        {ride.driver.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ride.driver.profilePhotoUrl} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-base font-semibold text-ink-secondary">
            {ride.driver.firstName[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{ride.driver.firstName}</p>
          <TrustCluster
            verificationLevel={ride.driver.verificationLevel}
            rating={ride.driver.driverProfile?.rating ?? 0}
            completedRidesCount={ride.driver.driverProfile?.completedRidesCount ?? 0}
            size="sm"
          />
        </div>
      </Link>

      <details className="mt-3 rounded-card bg-white p-3.5 shadow-card">
        <summary className="cursor-pointer text-sm font-semibold text-primary">Trip &amp; vehicle details</summary>
        <div className="mt-3 flex flex-col gap-2 text-sm text-ink-secondary">
          <p>
            <span className="font-medium text-ink">Vehicle:</span> {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model} · {maskedPlate}
          </p>
          {tripDetails && (
            <p>
              <span className="font-medium text-ink">Trip:</span> {tripDetails}
            </p>
          )}
          {ride.description && (
            <p>
              <span className="font-medium text-ink">Notes from driver:</span> {ride.description}
            </p>
          )}
        </div>
      </details>

      <div className="mt-6">
        <BookRideButton rideId={ride.id} seatsAvailable={ride.seatsAvailable} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ReportForm reportedUserId={ride.driverId} rideId={ride.id} />
        <BlockButton userId={ride.driverId} />
      </div>
    </main>
  );
}
