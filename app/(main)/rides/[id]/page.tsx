import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import BookRideButton from "@/components/BookRideButton";
import ReportForm from "@/components/ReportForm";
import BlockButton from "@/components/BlockButton";
import RouteMap from "@/components/RouteMapLoader";
import VerificationBadge from "@/components/VerificationBadge";
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

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-lg font-semibold">
        {ride.originLabel} → {ride.destinationLabel}
      </h1>
      <p className="text-sm text-neutral-500">
        {new Date(ride.departureAt).toLocaleString()}
        {(formatDistance(ride.distanceMeters) || formatDuration(ride.durationSeconds)) && (
          <>
            {" · "}
            {[formatDistance(ride.distanceMeters), formatDuration(ride.durationSeconds)].filter(Boolean).join(" · ")}
          </>
        )}
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

      <section className="mt-4 rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <Link href={`/drivers/${ride.driverId}`} className="font-medium hover:underline">
            {ride.driver.firstName}
          </Link>
          <VerificationBadge verificationLevel={ride.driver.verificationLevel} />
        </div>
        <p className="text-sm text-neutral-600">
          ⭐ {ride.driver.driverProfile?.rating.toFixed(1) ?? "New driver"} ·{" "}
          {ride.driver.driverProfile?.completedRidesCount ?? 0} rides completed
        </p>
      </section>

      <section className="mt-4 rounded-xl border p-4">
        <p className="font-medium">Vehicle</p>
        <p className="text-sm text-neutral-600">
          {ride.vehicle.color} {ride.vehicle.make} {ride.vehicle.model} · {maskedPlate}
        </p>
      </section>

      <section className="mt-4 rounded-xl border p-4">
        <p className="font-medium">Price</p>
        <p className="text-sm text-neutral-600">{ride.pricePerSeat.toString()} TND / seat</p>
        <p className="text-sm text-neutral-600">{ride.seatsAvailable} seat(s) available</p>
      </section>

      {ride.description && (
        <section className="mt-4 rounded-xl border p-4">
          <p className="font-medium">Notes from driver</p>
          <p className="text-sm text-neutral-600">{ride.description}</p>
        </section>
      )}

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
