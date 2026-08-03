import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";

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
      </p>

      <section className="mt-4 rounded-xl border p-4">
        <p className="font-medium">{ride.driver.firstName}</p>
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

      <form action={`/api/rides/${ride.id}/book`} method="post" className="mt-6">
        <button
          type="submit"
          className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-50"
          disabled={ride.seatsAvailable === 0}
        >
          {ride.seatsAvailable === 0 ? "Fully booked" : "Book a seat"}
        </button>
      </form>
    </main>
  );
}
