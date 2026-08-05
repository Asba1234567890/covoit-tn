import { prisma } from "@/server/db/prisma";
import { GoogleMapProvider } from "@/lib/map/GoogleMapProvider";

const map = new GoogleMapProvider();

export interface OneTimeRideInput {
  driverId: string;
  vehicleId: string;
  originCityId: string;
  destinationCityId: string;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  departureAt: Date;
  seatsTotal: number;
  pricePerSeat: number;
  luggageAllowed?: boolean;
  smokingAllowed?: boolean;
  petsAllowed?: boolean;
  description?: string;
  bookingMode?: "INSTANT" | "APPROVAL";
}

// Creates a single scheduled ride, computing route distance/ETA once at
// creation time (spec §52 — avoid recalculating routes on every request).
export async function createOneTimeRide(input: OneTimeRideInput) {
  const route = await map.route(
    { lat: input.originLat, lng: input.originLng },
    { lat: input.destinationLat, lng: input.destinationLng }
  );

  const estimatedArrivalAt = new Date(
    input.departureAt.getTime() + route.durationSeconds * 1000
  );

  return prisma.ride.create({
    data: {
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      originCityId: input.originCityId,
      destinationCityId: input.destinationCityId,
      originLabel: input.originLabel,
      originLat: input.originLat,
      originLng: input.originLng,
      destinationLabel: input.destinationLabel,
      destinationLat: input.destinationLat,
      destinationLng: input.destinationLng,
      routeGeometry: route.geometry as any,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      departureAt: input.departureAt,
      estimatedArrivalAt,
      seatsTotal: input.seatsTotal,
      seatsAvailable: input.seatsTotal,
      pricePerSeat: input.pricePerSeat,
      luggageAllowed: input.luggageAllowed ?? true,
      smokingAllowed: input.smokingAllowed ?? false,
      petsAllowed: input.petsAllowed ?? false,
      description: input.description,
      bookingMode: input.bookingMode ?? "APPROVAL",
      status: "SCHEDULED",
    },
  });
}

export interface RecurringRideInput extends Omit<OneTimeRideInput, "departureAt"> {
  daysOfWeek: number[]; // 0=Sun..6=Sat
  departureTime: string; // "HH:mm"
  weeksToGenerate?: number; // how many weeks of instances to pre-generate
}

// Creates a RecurringRide template and materializes individual Ride rows
// (RideInstance concept per spec §23) for the next N weeks — never a single
// giant ride record. A scheduled job should call generateNextWeek() weekly
// to keep the rolling window populated; not wired to a cron here yet.
export async function createRecurringRide(input: RecurringRideInput) {
  const template = await prisma.recurringRide.create({
    data: {
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      originCityId: input.originCityId,
      destinationCityId: input.destinationCityId,
      originLabel: input.originLabel,
      originLat: input.originLat,
      originLng: input.originLng,
      destinationLabel: input.destinationLabel,
      destinationLat: input.destinationLat,
      destinationLng: input.destinationLng,
      daysOfWeek: input.daysOfWeek,
      departureTime: input.departureTime,
      seatsPerInstance: input.seatsTotal,
      pricePerSeat: input.pricePerSeat,
      luggageAllowed: input.luggageAllowed ?? true,
      smokingAllowed: input.smokingAllowed ?? false,
      petsAllowed: input.petsAllowed ?? false,
      description: input.description,
      bookingMode: input.bookingMode ?? "APPROVAL",
    },
  });

  const instances = await generateInstances(template.id, input.weeksToGenerate ?? 4);
  return { template, instances };
}

export async function generateInstances(recurringRideId: string, weeks: number) {
  const template = await prisma.recurringRide.findUniqueOrThrow({ where: { id: recurringRideId } });
  const route = await map.route(
    { lat: template.originLat, lng: template.originLng },
    { lat: template.destinationLat, lng: template.destinationLng }
  );

  const [hh, mm] = template.departureTime.split(":").map(Number);
  const created = [];

  for (let dayOffset = 0; dayOffset < weeks * 7; dayOffset++) {
    const day = new Date();
    day.setDate(day.getDate() + dayOffset);
    day.setHours(hh, mm, 0, 0);

    if (!template.daysOfWeek.includes(day.getDay())) continue;
    if (day.getTime() < Date.now()) continue; // don't backfill past instances

    const estimatedArrivalAt = new Date(day.getTime() + route.durationSeconds * 1000);

    const ride = await prisma.ride.create({
      data: {
        recurringRideId: template.id,
        driverId: template.driverId,
        vehicleId: template.vehicleId,
        originCityId: template.originCityId,
        destinationCityId: template.destinationCityId,
        originLabel: template.originLabel,
        originLat: template.originLat,
        originLng: template.originLng,
        destinationLabel: template.destinationLabel,
        destinationLat: template.destinationLat,
        destinationLng: template.destinationLng,
        routeGeometry: route.geometry as any,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        departureAt: day,
        estimatedArrivalAt,
        seatsTotal: template.seatsPerInstance,
        seatsAvailable: template.seatsPerInstance,
        pricePerSeat: template.pricePerSeat,
        luggageAllowed: template.luggageAllowed,
        smokingAllowed: template.smokingAllowed,
        petsAllowed: template.petsAllowed,
        description: template.description,
        bookingMode: template.bookingMode,
        status: "SCHEDULED",
      },
    });
    created.push(ride);
  }

  return created;
}
